// hooks/useFileParser.js
// Парсит CSV и XLSX файлы, возвращает массив строк

import Papa from 'papaparse'
import * as XLSX from 'xlsx'

/**
 * Парсит File объект (CSV или XLSX) в массив объектов.
 * @param {File} file
 * @returns {Promise<{rows: object[], columns: string[]}>}
 */
export function parseFile(file) {
  return new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop().toLowerCase()

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
        complete: (result) => {
          resolve({
            rows: result.data,
            columns: result.meta.fields || [],
          })
        },
        error: reject,
      })
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const wb   = XLSX.read(e.target.result, { type: 'array', cellDates: true })
          const ws   = wb.Sheets[wb.SheetNames[0]]
          const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
          const columns = rows.length > 0 ? Object.keys(rows[0]) : []
          resolve({ rows, columns })
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = reject
      reader.readAsArrayBuffer(file)
    } else {
      reject(new Error(`Неподдерживаемый формат файла: .${ext}`))
    }
  })
}

/**
 * Применяет маппинг колонок к массиву строк.
 * mapping = { canonical_field: 'actual_column_name', ... }
 */
export function applyMapping(rows, mapping) {
  return rows.map((row) => {
    const mapped = {}
    for (const [canonical, actual] of Object.entries(mapping)) {
      mapped[canonical] = row[actual] ?? ''
    }
    return mapped
  })
}

/**
 * Автодетект маппинга по списку алиасов.
 * @param {string[]} columns - реальные колонки файла
 * @param {object} aliases   - { canonical: [alias1, alias2, ...] }
 * @returns {object} mapping - { canonical: bestMatchColumn }
 */
export function autoDetectMapping(columns, aliases) {
  const mapping = {}
  for (const [canonical, aliasList] of Object.entries(aliases)) {
    const colNorm = columns.map((c) => ({ original: c, norm: c.toLowerCase().trim() }))
    const match = colNorm.find(({ norm }) =>
      aliasList.some((a) => norm === a.toLowerCase().trim() || norm.includes(a.toLowerCase().trim()))
    )
    mapping[canonical] = match?.original ?? ''
  }
  return mapping
}
