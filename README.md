# 📊 Marketing Analytics — Сквозная аналитика

> **React 18 + Vite 5 + Tailwind CSS 3** — модульный SPA без бэкенда

## 🚀 Быстрый старт

```bash
# 1. Установить Node.js (если не установлен):
# https://nodejs.org — LTS версия

# 2. Перейти в папку проекта
cd C:\Users\user\.gemini\antigravity\scratch\marketing-analytics

# 3. Установить зависимости
npm install

# 4. Запустить dev-сервер
npm run dev
# → Открыть http://localhost:5173
```

## 📁 Структура проекта

```
src/
├── App.jsx                  ← Корневой компонент (state machine)
├── main.jsx                 ← React entry point
├── index.css                ← Tailwind + кастомные классы
│
├── components/
│   ├── Header.jsx           ← Шапка + Dark/Light toggle
│   ├── FileUploader.jsx     ← Drag-and-Drop зоны загрузки
│   ├── MappingModal.jsx     ← Сопоставление колонок
│   ├── Dashboard.jsx        ← Оркестратор дашборда
│   ├── KPICards.jsx         ← 5 карточек ключевых метрик
│   ├── FiltersBar.jsx       ← Фильтры: дата, статус, поиск
│   ├── DashboardCharts.jsx  ← Recharts: BarChart + воронка
│   ├── AnalyticsTable.jsx   ← Accordion-таблица метрик
│   └── ExportButton.jsx     ← Экспорт XLSX / CSV
│
├── hooks/
│   ├── useFileParser.js     ← PapaParse + SheetJS парсинг
│   └── useLocalStorage.js   ← Сохранение сессии
│
└── utils/
    ├── demoData.js          ← Демо-данные для тестирования
    ├── matchData.js         ← Матчинг Meta + Bitrix + метрики
    ├── exportData.js        ← Генерация XLSX / CSV
```

## 📄 Формат входных данных

### Meta Ads (CSV или XLSX)
| Колонка | Описание |
|---|---|
| `campaign name` | Название кампании |
| `adset name` | Группа объявлений |
| `ad name` | Название объявления |
| `spend` | Затраты |
| `impressions` | Показы |
| `clicks` | Клики |
| `leads` | Лиды из Meta |

### Bitrix24 (CSV или XLSX)
| Колонка | Описание |
|---|---|
| `utm_campaign` | Название кампании (ключ матчинга) |
| `stage` | Стадия: Новая / В работе / Успешно / Проиграна |
| `amount` | Сумма сделки |
| `created_date` | Дата создания |
| `utm_source` | Источник трафика |

> Колонки **автодетектируются** по ключевым словам. Если не совпало — откроется модал маппинга.

## Вычисляемые метрики
- **CTR** = Clicks / Impressions × 100%
- **CPC** = Spend / Clicks
- **CPL** = Spend / Лиды BX
- **Win Rate** = Продажи / Лиды BX × 100%
- **CPO** = Spend / Продажи
- **ROAS** = (Выручка - Spend) / Spend × 100%

## Особенности UI
- Dark / Light Mode с сохранением в localStorage
- Зелёная строка: ROAS >= 100%
- Красная строка: Spend > 0 и Продаж = 0
- BarChart: Расходы vs Выручка (по кампаниям / по дням)
- Воронка: Показы -> Клики -> Лиды -> Продажи
- Сессия автоматически сохраняется при перезагрузке

## Сборка для продакшна
```bash
npm run build
# Готовые файлы -> dist/
```
