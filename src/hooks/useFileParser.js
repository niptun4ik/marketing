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
    const yyyy = value.getFullYear()
    const mm   = String(value.getMonth() + 1).padStart(2, '0')
    const dd   = String(value.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }
  if (typeof value === 'number') {
    // Если число похоже на серийную дату Excel (например 46090 = 2026 год)
    if (value > 35000 && value < 60000 && Number.isInteger(Math.floor(value))) {
      try {
        const dObj = XLSX.SSF.parse_date_code(value)
        if (dObj?.y && dObj?.m && dObj?.d) {
          return `${dObj.y}-${String(dObj.m).padStart(2, '0')}-${String(dObj.d).padStart(2, '0')}`
        }
      } catch (e) {}
    }
    return value
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
          // raw: true — сохраняем оригинальные строки из ячеек (напр. "01.09.2026") без ложной US-конверсии
          const wb = XLSX.read(e.target.result, { type: 'array', raw: true })
          const ws = wb.Sheets[wb.SheetNames[0]]
          
          // Проверяем первые строки на наличие заголовков (актуально для выгрузок Meta Ads с заголовком отчета вверху)
          const rawMatrix = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
          const HEADER_KEYWORDS = [
            'кампани', 'campaign', 'spend', 'потрачен', 'затрат', 'расход',
            'клик', 'click', 'показ', 'impr', 'лид', 'lead', 'результат',
            'date', 'дата', 'сделк', 'deal', 'стади', 'stage', 'сумм', 'amount'
          ]
          
          let headerIdx = 0
          for (let i = 0; i < Math.min(10, rawMatrix.length); i++) {
            const row = rawMatrix[i]
            if (!Array.isArray(row)) continue
            const matchCount = row.filter(cell => {
              const s = String(cell || '').toLowerCase()
              return HEADER_KEYWORDS.some(kw => s.includes(kw))
            }).length
            if (matchCount >= 2) {
              headerIdx = i
              break
            }
          }

          const headerRow = rawMatrix[headerIdx] || []
          const columns = headerRow.map((c, idx) => String(c || '').trim() || `_col_${idx}`)
          const rows = []
          for (let i = headerIdx + 1; i < rawMatrix.length; i++) {
            const rowArr = rawMatrix[i]
            if (!rowArr || rowArr.every(c => c === '' || c == null)) continue
            const rowObj = {}
            columns.forEach((col, colIdx) => {
              if (!col.startsWith('_col_')) {
                rowObj[col] = normalizeCell(rowArr[colIdx])
              }
            })
            rows.push(rowObj)
          }

          const cleanCols = columns.filter(c => !c.startsWith('_col_'))
          resolve({ rows, columns: cleanCols })
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

    // 1. Приоритет: точное совпадение
    let match = colNorm.find(({ norm }) =>
      aliasList.some((a) => norm === String(a).toLowerCase().trim())
    )

    // 2. Вхождение подстроки с защитой от ложных срабатываний
    if (!match) {
      match = colNorm.find(({ norm }) =>
        aliasList.some((a) => {
          const target = String(a).toLowerCase().trim()
          if (!norm.includes(target)) return false
          // Защита: колонка "Цена за результаты" не должна определяться как лиды
          if (canonical === 'leads' && (norm.includes('цена') || norm.includes('cpl') || norm.includes('cpc') || norm.includes('roas') || norm.includes('индикатор') || norm.includes('начальн'))) return false
          // Защита: колонка "Бюджет группы" не должна определяться как имя группы
          if (canonical === 'adset_name' && (norm.includes('бюджет') || norm.includes('тип'))) return false
          // Защита: колонка "Бюджет" не должна определяться как потраченная сумма
          if (canonical === 'spend' && norm.includes('бюджет')) return false
          if (canonical === 'campaign_name' && norm.includes('id')) return false
          return true
        })
      )
    }

    mapping[canonical] = match?.original ?? ''
  }
  return mapping
}

