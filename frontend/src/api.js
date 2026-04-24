const BASE = import.meta.env.VITE_API_URL ?? "";

async function request(path, options = {}) {
  const { headers: extraHeaders, ...restOptions } = options;
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...extraHeaders },
    ...restOptions,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Request failed: ${res.status}`);
  }
  return res.json();
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
