export function extOf(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}
export function isAllowed(file: File, accept: string[], maxBytes: number) {
  return accept.includes(extOf(file.name)) && file.size <= maxBytes;
}
export function prettyBytes(n: number) {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
  return `${(n / 1024 / 1024).toFixed(1)} Mo`;
}
export const fmtDateFR = (d?: string | Date) =>
  d ? new Intl.DateTimeFormat("fr-FR").format(new Date(d)) : "—";

export function formatBytesIEC(n?: number) {
  if (n == null) return "—";
  if (n === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(n) / Math.log(k));
  const val = parseFloat((n / Math.pow(k, i)).toFixed(2));
  return `${val} ${sizes[i]}`;
}
