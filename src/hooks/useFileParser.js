// hooks/useFileParser.js
// Парсит CSV и XLSX файлы, возвращает массив строк

import Papa from 'papaparse'
import * as XLSX from 'xlsx'

/**
 * Нормализует значение ячейки:
 * - Date → 'YYYY-MM-DD'
 * - числа с пробелами/запятыми → число
 * - всё остальное → строка без лишних пробелов
 */
function normalizeCell(value) {
  if (value instanceof Date) {
    // Дата из XLSX с cellDates:true — конвертируем в строку
    const yyyy = value.getFullYear()
    const mm   = String(value.getMonth() + 1).padStart(2, '0')
    const dd   = String(value.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }
  if (typeof value === 'string') return value.trim()
  return value ?? ''
}

/**
 * Нормализует строку: все значения через normalizeCell
 */
function normalizeRow(row) {
  const out = {}
  for (const [k, v] of Object.entries(row)) {
    out[k.trim()] = normalizeCell(v)
  }
  return out
}

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
          const rows = (result.data || []).map(normalizeRow)
          resolve({
            rows,
            columns: result.meta.fields?.map((f) => f.trim()) || [],
          })
        },
        error: reject,
      })
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          // cellDates:true — Excel-даты превращаются в Date-объекты (мы их нормализуем)
          const wb   = XLSX.read(e.target.result, { type: 'array', cellDates: true })
          const ws   = wb.Sheets[wb.SheetNames[0]]
          const raw  = XLSX.utils.sheet_to_json(ws, { defval: '' })
          const rows = raw.map(normalizeRow)
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
export function applyMapping(rows = [], mapping = {}) {
  return (rows || []).map((row) => {
    // Сохраняем оригинальные поля строки как fallback для умного сопоставления
    const mapped = { ...row }
    for (const [canonical, actual] of Object.entries(mapping)) {
      if (actual) {
        mapped[canonical] = row?.[actual] ?? ''
      }
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
export function autoDetectMapping(columns = [], aliases = {}) {
  const mapping = {}
  for (const [canonical, aliasList] of Object.entries(aliases)) {
    const colNorm = (columns || []).map((c) => ({
      original: String(c ?? ''),
      norm: String(c ?? '').toLowerCase().trim(),
    }))
    const match = colNorm.find(({ norm }) =>
      aliasList.some((a) => {
        const target = String(a).toLowerCase().trim()
        return norm === target || norm.includes(target)
      })
    )
    mapping[canonical] = match?.original ?? ''
  }
  return mapping
}
