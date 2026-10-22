/** RFC 4180 CSV: quote every field, double inner quotes. A leading = + - @ tab or CR gets a ' prefix to block spreadsheet formula injection. */
export function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map((v) => `"${(/^[=+\-@\t\r]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
}
