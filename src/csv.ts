// Экспорт таблиц в CSV (открывается в Excel). BOM + разделитель «;» — чтобы
// кириллица и колонки корректно читались в русском Excel.
export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v ?? '')
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  const body = [headers, ...rows].map((r) => r.map(esc).join(';')).join('\r\n')
  const blob = new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
