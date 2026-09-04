// utils/shareUtils.js
// Сжатие и распаковка отчетов для отправки начальнику по прямой ссылке

/**
 * Упаковывает данные Meta Ads и Bitrix24 в компактную base64url-строку.
 * Использует нативный браузерный CompressionStream (GZIP).
 */
export async function encodeReportPayload({ metaRows = [], bitrixRows = [], metaFile, bitrixFile, filters }) {
  const minified = {
    m: (metaRows || []).map(r => ({
      c: r.campaign_name || r['Кампания'] || r['Название кампании'],
      s: r.spend || r['Потраченная сумма (USD)'] || r['Потраченная сумма'],
      cl: r.clicks || r['Клики по ссылке'] || r['Клики (все)'],
      im: r.impressions || r['Показы'],
      l: r.leads || r['Результат'],
      d: r.date || r['Дата начала отчетности'] || r['День'] || r['Дата начала'] || r['Day'] || r['Дата'] || r['Начало'],
      de: r.date_end || r['Окончание отчетности'] || r['Дата окончания'] || r['Date stop'] || r['End date'] || r['Конец'],
      ad: r.adset_name || r['Название группы объявлений'],
      a: r.ad_name || r['Название объявления'],
    })),
    b: (bitrixRows || []).map(r => {
      const extraTexts = Object.entries(r)
        .filter(([k, v]) => typeof v === 'string' && v.trim().length > 0 && !['deal_id', 'created_date', 'deal_name', 'stage', 'amount', 'utm_campaign', 'utm_source', 'formname', 'currency', 'manager', 'Ответственный'].includes(k))
        .map(([k, v]) => `${k}: ${v}`)
        .slice(0, 5)
        .join(' | ');

      return {
        id: r.deal_id || r['ID'],
        dt: r.created_date || r['Дата создания'] || r['Дата добавления'],
        n: r.deal_name || r['Сделка'] || r['Название сделки'],
        st: r.stage || r['Стадия'],
        a: r.amount || r['Сумма'] || r['Сумма/Валюта'],
        uc: r.utm_campaign || r['UTM Campaign'],
        us: r.utm_source || r['UTM Source'],
        f: r.formname,
        cur: r.currency || r['Валюта'],
        man: r.manager || r['Ответственный'],
        txt: extraTexts || undefined,
      };
    }),
    mf: metaFile?.name || 'Meta Ads',
    bf: bitrixFile?.name || 'Bitrix24',
    t: Date.now(),
  };

  const jsonStr = JSON.stringify(minified);

  if (typeof CompressionStream !== 'undefined') {
    const stream = new Blob([jsonStr]).stream().pipeThrough(new CompressionStream('gzip'));
    const buffer = await new Response(stream).arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } else {
    return btoa(unescape(encodeURIComponent(jsonStr))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}

/**
 * Распаковывает данные отчета из base64url-строки.
 */
export async function decodeReportPayload(base64Str) {
  if (!base64Str) return null;
  try {
    let b64 = base64Str.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';

    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    let jsonStr = '';
    if (typeof DecompressionStream !== 'undefined') {
      try {
        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
        jsonStr = await new Response(stream).text();
      } catch (e) {
        jsonStr = decodeURIComponent(escape(binary));
      }
    } else {
      jsonStr = decodeURIComponent(escape(binary));
    }

    const minified = JSON.parse(jsonStr);

    const metaRows = (minified.m || []).map(r => ({
      campaign_name: r.c,
      spend: r.s,
      clicks: r.cl,
      impressions: r.im,
      leads: r.l,
      date: r.d,
      date_end: r.de,
      adset_name: r.ad,
      ad_name: r.a,
    }));

    const bitrixRows = (minified.b || []).map(r => ({
      deal_id: r.id,
      created_date: r.dt,
      deal_name: r.n,
      stage: r.st,
      amount: r.a,
      utm_campaign: r.uc,
      utm_source: r.us,
      formname: r.f,
      currency: r.cur,
      manager: r.man,
      'Ответственный': r.man,
      'Дополнительно': r.txt || '',
    }));

    return {
      metaRows,
      bitrixRows,
      metaFile: { name: minified.mf || 'Shared Meta Ads', rowCount: metaRows.length, colCount: 7 },
      bitrixFile: { name: minified.bf || 'Shared Bitrix24', rowCount: bitrixRows.length, colCount: 8 },
      isShared: true,
      timestamp: minified.t,
    };
  } catch (err) {
    console.error('Ошибка распаковки отчета из ссылки:', err);
    return null;
  }
}
