/** CSV export, done in the browser — no backend involved.
 *
 *  Excel on Windows reads a CSV as the system codepage unless the file opens
 *  with a UTF-8 byte-order mark, which mangles Thai. The BOM below is what
 *  makes these files openable by double-click.
 */

/** Quotes a cell only when it needs it, and doubles any embedded quote. */
const cell = (v: unknown): string => {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export const toCsv = (headers: string[], rows: unknown[][]): string =>
  [headers, ...rows].map(r => r.map(cell).join(',')).join('\r\n')

/**
 * Hands the file to the browser. Returns false when the download could not be
 * started, so the caller can tell the user instead of failing silently.
 */
export function downloadCsv(filename: string, headers: string[], rows: unknown[][]): boolean {
  try {
    const blob = new Blob(['﻿' + toCsv(headers, rows)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    // Revoked on the next tick: Safari needs the object alive during the click.
    setTimeout(() => URL.revokeObjectURL(url), 0)
    return true
  } catch {
    return false
  }
}

/** `stock-2569-08-27.csv` — sortable, and safe on every filesystem. */
export const csvName = (base: string) => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${base}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}.csv`
}
