/**
 * Lightweight RFC 4180 compliant CSV generator with CSV formula injection mitigation.
 */
export function generateCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const escapeCell = (val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    let str = String(val);

    // Prevent CSV Formula Injection (CWE-1236)
    // If the field starts with =, +, -, @, \t, or \r, prepend a single quote
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }

    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  const headerLine = headers.map(escapeCell).join(',');
  const rowLines = rows.map((row) => row.map(escapeCell).join(','));

  return [headerLine, ...rowLines].join('\r\n');
}
