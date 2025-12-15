// utils/cleanup.ts
export function cleanPayload<T extends Record<string, any>>(
  obj: T,
  dropEmptyString = true
): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([, v]) => v !== null && v !== undefined && (!dropEmptyString || v !== "")
    )
  ) as Partial<T>;
}

export function omitNulAndEmpty<T extends Record<string, any>>(
  obj: T
): Partial<T> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    out[k] = v;
  }
  return out as Partial<T>;
}
