import * as XLSX from 'xlsx';

function safeLower(s) {
  return String(s ?? '').trim().toLowerCase();
}

export function normalizeHeader(s) {
  return safeLower(s)
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

export function parseCSV(text) {
  const out = [];
  let row = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ',') {
      row.push(cur);
      cur = '';
      continue;
    }
    if (ch === '\n') {
      row.push(cur);
      cur = '';
      const isEmpty = row.length === 1 && String(row[0] || '').trim() === '';
      if (!isEmpty) out.push(row);
      row = [];
      continue;
    }
    if (ch === '\r') continue;
    cur += ch;
  }

  row.push(cur);
  const isEmpty = row.length === 1 && String(row[0] || '').trim() === '';
  if (!isEmpty) out.push(row);
  return out;
}

export async function readSpreadsheetFile(file) {
  if (!file) return { rows: [], error: 'No file selected' };
  const name = String(file.name || '').toLowerCase();
  try {
    if (name.endsWith('.csv')) {
      const text = await file.text();
      return { rows: readCSVToObjects(text), error: null };
    }
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const firstSheetName = wb.SheetNames?.[0];
      if (!firstSheetName) return { rows: [], error: 'Excel file has no sheets' };
      const ws = wb.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
      // json is array of objects keyed by header text; normalize keys
      const rows = (json || []).map((r) => {
        const out = {};
        Object.keys(r || {}).forEach((k) => {
          out[normalizeHeader(k)] = r[k];
        });
        return out;
      });
      return { rows, error: null };
    }
    return { rows: [], error: 'Unsupported file type. Upload CSV or Excel (.xlsx/.xls).' };
  } catch (e) {
    return { rows: [], error: e?.message || 'Failed to read file' };
  }
}

function readCSVToObjects(text) {
  const grid = parseCSV(text);
  if (!grid.length) return [];
  const headers = (grid[0] || []).map(normalizeHeader);
  const rows = [];
  for (let i = 1; i < grid.length; i++) {
    const line = grid[i] || [];
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c];
      if (!key) continue;
      obj[key] = line[c] ?? '';
    }
    rows.push(obj);
  }
  return rows;
}

export function genReferenceCode(existingSet) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '0123456789';
  const chars = alphabet + digits;
  for (let attempt = 0; attempt < 50; attempt++) {
    let code = '';
    for (let i = 0; i < 10; i++) code += chars[Math.floor(Math.random() * chars.length)];
    if (!existingSet || !existingSet.has(code)) return code;
  }
  let fallback = 'MP' + Date.now().toString(36).toUpperCase().slice(-8);
  fallback = fallback.replace(/[^A-Z0-9]/g, 'X').slice(0, 10).padEnd(10, 'X');
  return fallback;
}

function parseAmount(v) {
  const s = String(v ?? '').trim();
  if (!s) return NaN;
  const cleaned = s.replace(/,/g, '').replace(/[^\d.\-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

function parseDate(v) {
  if (v == null || v === '') return null;
  // Excel may give a Date object
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  const s = String(v).trim();
  if (!s) return null;
  
  // Try standard Date parsing first
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  
  // Handle DD/MM/YYYY format (common in many regions) - try this first
  const ddmmyyyyMatch = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    // Validate day/month ranges to distinguish from MM/DD/YYYY
    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12) {
      const parsedDate = new Date(parseInt(year), monthNum - 1, dayNum);
      if (!isNaN(parsedDate.getTime())) return parsedDate;
    }
  }
  
  // Handle YYYY-MM-DD format (ISO)
  const ymdMatch = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    const parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(parsedDate.getTime())) return parsedDate;
  }
  
  return null;
}

export function deriveReportingPeriod(date, type) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = date.getMonth(); // 0-11
  if (type === 'monthly') {
    const mm = String(m + 1).padStart(2, '0');
    return `${y}-${mm}`;
  }
  if (type === 'quarterly') {
    const q = Math.floor(m / 3) + 1;
    return `Q${q} ${y}`;
  }
  if (type === 'yearly') return String(y);
  return '';
}

export function filterByPeriod(transactions, period) {
  const { type } = period || {};
  if (!Array.isArray(transactions)) return [];
  if (!type) return transactions;

  if (type === 'monthly') {
    const y = Number(period.year);
    const m = Number(period.month); // 1-12
    return transactions.filter((t) => {
      const d = t.dateOfPayment;
      if (!(d instanceof Date) || isNaN(d.getTime())) return false;
      return d.getFullYear() === y && (d.getMonth() + 1) === m;
    });
  }

  if (type === 'quarterly') {
    const y = Number(period.year);
    const q = Number(period.quarter); // 1-4
    const startM = (q - 1) * 3;
    const endM = startM + 2;
    return transactions.filter((t) => {
      const d = t.dateOfPayment;
      if (!(d instanceof Date) || isNaN(d.getTime())) return false;
      const mm = d.getMonth();
      return d.getFullYear() === y && mm >= startM && mm <= endM;
    });
  }

  if (type === 'yearly') {
    const y = Number(period.year);
    return transactions.filter((t) => {
      const d = t.dateOfPayment;
      if (!(d instanceof Date) || isNaN(d.getTime())) return false;
      return d.getFullYear() === y;
    });
  }

  return transactions;
}

export function normalizeImportedRowsToTransactions(rawRows, { defaultPaymentMethod = 'MPESA' } = {}) {
  const errors = [];
  const warnings = [];
  const rows = Array.isArray(rawRows) ? rawRows : [];

  // Map flexible headers to canonical fields
  const pick = (r, candidates) => {
    for (const c of candidates) {
      const key = normalizeHeader(c);
      if (r && Object.prototype.hasOwnProperty.call(r, key)) return r[key];
    }
    // sometimes xlsx already normalized keys; accept raw candidates too
    for (const c of candidates) {
      if (r && Object.prototype.hasOwnProperty.call(r, c)) return r[c];
    }
    // Fallback: fuzzy match by normalized header containing the candidate token
    if (r) {
      const entries = Object.entries(r);
      for (const [rawKey, value] of entries) {
        const normKey = normalizeHeader(rawKey);
        for (const c of candidates) {
          const token = normalizeHeader(c);
          if (!token) continue;
          if (normKey === token || normKey.includes(token)) {
            return value;
          }
        }
      }
    }
    return undefined;
  };

  const usedRefs = new Set();
  const out = [];
  let ignored = 0;
  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx] || {};

    const date = parseDate(pick(r, ['dateOfPayment', 'date_of_payment', 'date']));
    const amount = parseAmount(pick(r, ['amount', 'amt']));
    let category = String(pick(r, ['category']) ?? '').trim();
    let payeeName = String(pick(r, ['payeeName', 'payee_name', 'payee', 'recipient', 'supplier']) ?? '').trim();
    const description = String(pick(r, ['expenditure', 'description', 'purpose', 'narration']) ?? '').trim();
    const paymentMethod = String(pick(r, ['paymentMethod', 'payment_method', 'paid_via', 'paidvia', 'method']) ?? defaultPaymentMethod).trim() || defaultPaymentMethod;
    const referenceCodeRaw = String(pick(r, ['referenceCode', 'reference_code', 'mpesa_reference', 'mpesa_code', 'mpesa_referral', 'mpesa', 'reference']) ?? '').trim();
    const projectName = String(pick(r, ['projectName', 'project_name', 'project']) ?? '').trim();
    const transactionIdRaw = String(pick(r, ['transactionId', 'transaction_id', 'id']) ?? '').trim();
    const phoneNumberRaw = String(pick(r, ['phoneNumber', 'phone_number', 'msisdn', 'phone']) ?? '').trim();

    if (!date || isNaN(date.getTime())) { ignored++; continue; }
    if (!Number.isFinite(amount) || amount <= 0) { ignored++; continue; }
    // Keep category empty if not provided
    if (!payeeName) payeeName = 'Unknown';

    const isMpesa = paymentMethod.toUpperCase() === 'MPESA' || paymentMethod.toUpperCase() === 'M-PESA';
    let referenceCode = referenceCodeRaw;
    if (isMpesa) {
      if (!referenceCode) referenceCode = genReferenceCode(usedRefs);
      referenceCode = referenceCode.toUpperCase();
      usedRefs.add(referenceCode);
    } else if (referenceCode) {
      referenceCode = referenceCode.toUpperCase();
      usedRefs.add(referenceCode);
    }

    const transactionId = transactionIdRaw || (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `tx_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 8)}`);

    out.push({
      transactionId,
      dateOfPayment: date,
      category,
      payeeName,
      description,
      phoneNumber: phoneNumberRaw || null,
      amount,
      paymentMethod: paymentMethod || null,
      referenceCode: referenceCode || null,
      projectName: projectName || null,
      reportingPeriod: '', // derived later based on selected report type
    });
  }

  if (ignored > 0) warnings.push(`${ignored} row(s) ignored due to missing/invalid required values (date/amount).`);
  if (!out.length) errors.push('No valid transactions found.');
  return { transactions: out, errors, warnings };
}

export function groupTransactionsCategoryPayee(transactions) {
  const safeTx = Array.isArray(transactions) ? transactions : [];
  const byCategory = new Map();

  for (const t of safeTx) {
    const cat = String(t.category || '').trim(); // Keep empty if no category
    const payee = String(t.payeeName || 'Unknown').trim() || 'Unknown';

    if (!byCategory.has(cat)) byCategory.set(cat, new Map());
    const byPayee = byCategory.get(cat);
    if (!byPayee.has(payee)) byPayee.set(payee, []);
    byPayee.get(payee).push(t);
  }

  const categories = Array.from(byCategory.entries()).map(([categoryName, payeesMap]) => {
    const payees = Array.from(payeesMap.entries()).map(([payeeName, txs]) => {
      const sorted = (txs || []).slice().sort((a, b) => (a.dateOfPayment?.getTime?.() || 0) - (b.dateOfPayment?.getTime?.() || 0));
      const subtotal = sorted.reduce((s, x) => s + (Number(x.amount) || 0), 0);
      return { payeeName, subtotal, transactions: sorted };
    }).sort((a, b) => b.subtotal - a.subtotal);

    const categoryTotal = payees.reduce((s, p) => s + (p.subtotal || 0), 0);
    return { categoryName, categoryTotal, payees };
  }).sort((a, b) => b.categoryTotal - a.categoryTotal);

  return categories;
}

export function buildExecutiveSummary(transactions) {
  const txs = Array.isArray(transactions) ? transactions : [];
  const total = txs.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const catTotals = new Map();
  for (const t of txs) {
    const cat = String(t.category || '').trim(); // Keep empty if no category
    catTotals.set(cat, (catTotals.get(cat) || 0) + (Number(t.amount) || 0));
  }
  let topCategory = null;
  let topCategoryTotal = 0;
  for (const [cat, v] of catTotals.entries()) {
    if (v > topCategoryTotal) { topCategoryTotal = v; topCategory = cat; }
  }
  return {
    totalExpenditure: total,
    numberOfCategories: catTotals.size,
    highestSpendingCategory: topCategory || '-',
    highestSpendingCategoryTotal: topCategoryTotal,
  };
}

export function buildIntelligenceInsights(transactions) {
  const txs = Array.isArray(transactions) ? transactions : [];
  const insights = [];
  if (!txs.length) return insights;

  const missingRef = txs.filter((t) => String(t.paymentMethod || '').toUpperCase() === 'MPESA' && !String(t.referenceCode || '').trim()).length;
  if (missingRef > 0) insights.push({ type: 'warning', text: `${missingRef} M-Pesa transaction(s) are missing a reference code.` });

  const refCounts = new Map();
  txs.forEach((t) => {
    const ref = String(t.referenceCode || '').trim().toUpperCase();
    if (!ref) return;
    refCounts.set(ref, (refCounts.get(ref) || 0) + 1);
  });
  const dupRefs = Array.from(refCounts.entries()).filter(([, c]) => c > 1).slice(0, 5);
  if (dupRefs.length) insights.push({ type: 'warning', text: `Duplicate reference codes detected (top): ${dupRefs.map(([r, c]) => `${r}×${c}`).join(', ')}.` });

  const amounts = txs.map((t) => Number(t.amount) || 0).filter((n) => n > 0).sort((a, b) => a - b);
  const p95 = amounts.length ? amounts[Math.floor(0.95 * (amounts.length - 1))] : 0;
  const big = txs.filter((t) => (Number(t.amount) || 0) >= p95 && p95 > 0).sort((a, b) => (b.amount || 0) - (a.amount || 0))[0];
  if (big) insights.push({ type: 'info', text: `Largest / unusually high transaction is ${big.payeeName} (${big.category}) for ${Number(big.amount) || 0}.` });

  const payeeTotals = new Map();
  txs.forEach((t) => {
    const k = String(t.payeeName || 'Unknown').trim() || 'Unknown';
    payeeTotals.set(k, (payeeTotals.get(k) || 0) + (Number(t.amount) || 0));
  });
  let topPayee = null;
  let topPayeeTotal = 0;
  for (const [p, v] of payeeTotals.entries()) {
    if (v > topPayeeTotal) { topPayeeTotal = v; topPayee = p; }
  }
  if (topPayee) insights.push({ type: 'info', text: `Top payee by spend: ${topPayee} (${topPayeeTotal}).` });

  return insights;
}
