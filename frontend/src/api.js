const BASE = import.meta.env.VITE_API_URL ?? "";
const TIMEOUT_MS = 10_000;

function parseDetail(detail) {
  if (!detail) return null;
  if (typeof detail === "string") return detail;
  // Pydantic returns detail as an array of error objects on 422
  if (Array.isArray(detail)) {
    return detail
      .map((e) => (e.msg ?? JSON.stringify(e)).replace(/^value error,\s*/i, ""))
      .join("; ");
  }
  return String(detail);
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const { headers: extraHeaders, ...restOptions } = options;
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...extraHeaders },
      signal: controller.signal,
      ...restOptions,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(parseDetail(body.detail) ?? `Request failed: ${res.status}`);
    }
    return res.json();
  } catch (err) {
    if (err.name === "AbortError") throw new Error("Request timed out. Please try again.");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export function getExpenses({ category, sort } = {}) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (sort) params.set("sort", sort);
  const qs = params.toString();
  return request(`/expenses${qs ? `?${qs}` : ""}`);
}

export function getCategories() {
  return request("/expenses/categories");
}

export function createExpense(data, idempotencyKey) {
  return request("/expenses", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(data),
  });
}
