import { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useOrg } from '../context/OrgContext';
import { formatAmount } from '../utils/format';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';

function toCSV(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const body = rows.map((r) => headers.map((h) => escape(r[h])).join(','));
  return [headers.join(','), ...body].join('\n');
}

function downloadCSV(filename, rows) {
  const csv = toCSV(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function parseCSV(text) {
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

function normalizeHeader(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

function genMpesaCode(existing) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '0123456789';
  const chars = alphabet + digits;
  for (let attempt = 0; attempt < 50; attempt++) {
    let code = '';
    for (let i = 0; i < 10; i++) code += chars[Math.floor(Math.random() * chars.length)];
    if (!existing || !existing.has(code)) return code;
  }
  let fallback = 'MP' + Date.now().toString(36).toUpperCase().slice(-8);
  fallback = fallback.replace(/[^A-Z0-9]/g, 'X').slice(0, 10).padEnd(10, 'X');
  return fallback;
}

export default function ReportsImport() {
  const { funders: rawFunders, projects: rawProjects, expenses: rawExpenses, addExpense, updateExpense } = useFinance();
  const { role, currency: orgCurrency } = useOrg();
  const funders = Array.isArray(rawFunders) ? rawFunders : [];
  const projects = Array.isArray(rawProjects) ? rawProjects : [];
  const expenses = Array.isArray(rawExpenses) ? rawExpenses : [];

  const [importFunderId, setImportFunderId] = useState('');
  const [importRows, setImportRows] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importStats, setImportStats] = useState({ total: 0, accepted: 0, ignored: 0 });
  const [importSuccess, setImportSuccess] = useState(0);

  const [reportFunderId, setReportFunderId] = useState('');
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');

  const importPreview = useMemo(() => {
    return (importRows || []).slice(0, 20).map((r) => ({
      date: r.date || '',
      amount: r.amount ?? '',
      category: r.category || '',
      paidVia: r.paidVia || '',
      mpesaCode: r.mpesaCode || '',
      description: r.description || '',
    }));
  }, [importRows]);

  const filteredExpenses = useMemo(() => {
    const fid = String(reportFunderId || '').trim();
    if (!fid) return [];
    const fromT = reportFrom ? new Date(reportFrom).getTime() : null;
    const toT = reportTo ? new Date(reportTo).getTime() : null;
    return expenses
      .filter((e) => {
        if (!e) return false;
        if (String(e.walletId || '') !== fid) return false;
        const status = String(e.status || '');
        if (!['posted', 'pending'].includes(status)) return false;
        const t = e.date ? new Date(e.date).getTime() : null;
        if (fromT != null && (t == null || t < fromT)) return false;
        if (toT != null && (t == null || t > toT)) return false;
        return true;
      })
      .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  }, [expenses, reportFunderId, reportFrom, reportTo]);

  const reportRows = useMemo(() => {
    return filteredExpenses.map((e) => ({
      date: e.date ? new Date(e.date).toLocaleDateString() : '',
      category: e.category || '',
      description: e.description || '',
      amount: e.amount ?? 0,
      currency: e.currency || '',
      paid_via: e.paidVia || '',
      mpesa_code: e.mpesaCode || '',
      status: e.status || '',
    }));
  }, [filteredExpenses]);

  const onPickCSV = async (file) => {
    setImportErrors([]);
    setImportRows([]);
    setImportStats({ total: 0, accepted: 0, ignored: 0 });
    if (!file) return;
    try {
      const text = await file.text();
      const grid = parseCSV(text);
      if (!grid.length) {
        setImportErrors(['CSV is empty']);
        return;
      }
      const headers = (grid[0] || []).map(normalizeHeader);
      if (!headers.length || headers.every((h) => !h)) {
        setImportErrors(['CSV header row is missing or invalid']);
        return;
      }
      const headerIdx = (name) => headers.indexOf(normalizeHeader(name));

      const idxDate = headerIdx('date');
      const idxAmount = headerIdx('amount');
      const idxCategory = headerIdx('category');
      const idxDescription = headerIdx('description');
      const idxPaidVia = Math.max(headerIdx('paid_via'), headerIdx('paidvia'), headerIdx('payment_method'));
      const idxMpesaCode = Math.max(headerIdx('mpesa_code'), headerIdx('mpesacode'), headerIdx('mpesa'));
      const idxProject = Math.max(headerIdx('project'), headerIdx('project_name'));

      const errors = [];
      if (idxAmount < 0) errors.push('Missing required column: amount');
      if (idxDate < 0) errors.push('Missing required column: date');
      if (errors.length) {
        setImportErrors(errors);
        return;
      }

      const rows = [];
      let ignored = 0;
      for (let r = 1; r < grid.length; r++) {
        const line = grid[r];
        const dateRaw = idxDate >= 0 ? (line[idxDate] || '') : '';
        const amtRaw = idxAmount >= 0 ? (line[idxAmount] || '') : '';
        const amt = Number(String(amtRaw).replace(/,/g, ''));
        const date = dateRaw ? new Date(dateRaw) : null;
        if (!date || isNaN(date.getTime())) { ignored++; continue; }
        if (!Number.isFinite(amt) || amt <= 0) { ignored++; continue; }

        const paidVia = idxPaidVia >= 0 ? String(line[idxPaidVia] || '').trim() : '';
        const mpesaCode = idxMpesaCode >= 0 ? String(line[idxMpesaCode] || '').trim() : '';
        const category = idxCategory >= 0 ? String(line[idxCategory] || '').trim() : '';
        const description = idxDescription >= 0 ? String(line[idxDescription] || '').trim() : '';
        const projectName = idxProject >= 0 ? String(line[idxProject] || '').trim() : '';

        let projectId = null;
        if (projectName) {
          const hit = projects.find((p) => String(p?.name || '').toLowerCase() === projectName.toLowerCase());
          projectId = hit?.id || null;
        }

        rows.push({
          date: date.toISOString(),
          amount: amt,
          category: category || 'General',
          description,
          paidVia: paidVia || null,
          mpesaCode: mpesaCode || null,
          projectId,
        });
      }
      setImportRows(rows);
      setImportStats({ total: Math.max(grid.length - 1, 0), accepted: rows.length, ignored });
      if (!rows.length) setImportErrors(['No valid rows found (check date/amount formats)']);
    } catch (e) {
      setImportErrors([e?.message || 'Failed to parse CSV']);
    }
  };

  const [generating, setGenerating] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);
  const canGenerate = (role === 'admin' || role === 'financial_officer');
  const missingCount = useMemo(() => filteredExpenses.filter(e => {
    const paidVia = String(e?.paidVia || 'MPESA').toUpperCase();
    const code = String(e?.mpesaCode || '').trim();
    return paidVia === 'MPESA' && !code;
  }).length, [filteredExpenses]);

  const generateMissingCodes = async () => {
    if (!filteredExpenses.length) return;
    if (!canGenerate) return;
    setGenerating(true);
    setGeneratedCount(0);
    try {
      const used = new Set((expenses || []).map((e) => (e?.mpesaCode ? String(e.mpesaCode).toUpperCase() : null)).filter(Boolean));
      let count = 0;
      for (const e of filteredExpenses) {
        let paidVia = e.paidVia || '';
        if (!paidVia) paidVia = 'MPESA';
        if (String(paidVia).toUpperCase() !== 'MPESA') continue;
        if (e.mpesaCode && String(e.mpesaCode).trim()) continue;
        const code = genMpesaCode(used);
        used.add(code);
        const res = await updateExpense(e.id, { paidVia: 'MPESA', mpesaCode: code });
        if (res?.success) count++;
      }
      setGeneratedCount(count);
    } finally {
      setGenerating(false);
    }
  };

  const downloadImportTemplate = () => {
    downloadCSV('expenses_import_template.csv', [
      {
        date: '2026-01-25',
        amount: '1500',
        category: 'Transport',
        description: 'Field visit fuel',
        paid_via: 'MPESA',
        mpesa_referral: '',
        project: '',
      }
    ]);
  };

  const downloadImportExample = () => {
    downloadCSV('expenses_import_example.csv', [
      {
        date: '2026-01-10',
        amount: '5000',
        category: 'Supplies',
        description: 'Stationery and printing',
        paid_via: 'MPESA',
        mpesa_referral: '',
        project: '',
      },
      {
        date: '2026-01-12',
        amount: '12000',
        category: 'Training',
        description: 'Facilitator payment',
        paid_via: '',
        mpesa_referral: '',
        project: '',
      }
    ]);
  };

  const doImport = async () => {
    const fid = String(importFunderId || '').trim();
    if (!fid) {
      setImportErrors(['Select a funder for this import']);
      return;
    }
    if (!importRows.length) {
      setImportErrors(['No rows to import']);
      return;
    }
    setImporting(true);
    setImportErrors([]);
    const importBatchId = `csv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const used = new Set();

    try {
      for (const r of importRows) {
        const paidVia = (r.paidVia || 'MPESA').toString().trim() || 'MPESA';
        const isMpesa = paidVia.toUpperCase() === 'MPESA';
        const mpesaCode = isMpesa
          ? (r.mpesaCode || genMpesaCode(used))
          : null;
        if (isMpesa && mpesaCode) used.add(mpesaCode);

        addExpense({
          walletId: fid,
          projectId: r.projectId || null,
          category: r.category,
          amount: r.amount,
          date: r.date,
          description: r.description,
          paidVia: paidVia || null,
          mpesaCode,
          importBatchId,
          source: 'csv_import',
        });
      }
      // Auto-populate report filters to match the imported data
      try {
        const ds = (importRows || []).map((rr) => new Date(rr.date)).filter((d) => d && !isNaN(d.getTime()));
        if (ds.length) {
          const min = new Date(Math.min.apply(null, ds));
          const max = new Date(Math.max.apply(null, ds));
          setReportFunderId(fid);
          if (!isNaN(min.getTime())) setReportFrom(min.toISOString().slice(0, 10));
          if (!isNaN(max.getTime())) setReportTo(max.toISOString().slice(0, 10));
        } else {
          setReportFunderId(fid);
        }
      } catch {}
      setImportSuccess(rows.length || 0);
      setImportRows([]);
    } catch (e) {
      setImportErrors([e?.message || 'Import failed']);
    } finally {
      setImporting(false);
    }
  };

  const exportReportWord = () => {
    if (!reportRows.length) return;
    const funder = funders.find((f) => String(f.id) === String(reportFunderId));
    const funderName = funder?.name || reportFunderId || 'Funder';
    const title = `Funder Transaction Report - ${funderName}`;
    const range = `${reportFrom || 'All'} to ${reportTo || 'All'}`;
    const generatedDate = new Date().toLocaleDateString();

    const escapeXml = (v) => String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const totalAmount = reportRows.reduce((sum, r) => sum + (r.amount || 0), 0);

    const rowsXml = reportRows.map((r) => `
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="1440" w:type="dxa"/>
            <w:tcBorders>
              <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
              <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
              <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
              <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
            </w:tcBorders>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:jc w:val="left"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:sz w:val="20"/>
              </w:rPr>
              <w:t>${escapeXml(r.date)}</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="1800" w:type="dxa"/>
            <w:tcBorders>
              <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
              <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
              <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
              <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
            </w:tcBorders>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:jc w:val="left"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:sz w:val="20"/>
              </w:rPr>
              <w:t>${escapeXml(r.category)}</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="4200" w:type="dxa"/>
            <w:tcBorders>
              <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
              <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
              <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
              <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
            </w:tcBorders>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:jc w:val="left"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:sz w:val="20"/>
              </w:rPr>
              <w:t>${escapeXml(r.description)}</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="1800" w:type="dxa"/>
            <w:tcBorders>
              <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
              <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
              <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
              <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
            </w:tcBorders>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:jc w:val="right"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:sz w:val="20"/>
              </w:rPr>
              <w:t>${escapeXml(formatAmount(r.amount || 0))} ${escapeXml(orgCurrency || '')}</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="1560" w:type="dxa"/>
            <w:tcBorders>
              <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
              <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
              <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
              <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
            </w:tcBorders>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:jc w:val="left"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:sz w:val="20"/>
              </w:rPr>
              <w:t>${escapeXml(r.paid_via)}</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="1200" w:type="dxa"/>
            <w:tcBorders>
              <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
              <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
              <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
              <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
            </w:tcBorders>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:jc w:val="center"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:sz w:val="18"/>
                <w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New"/>
              </w:rPr>
              <w:t>${escapeXml(r.mpesa_code)}</w:t>
            </w:r>
          </w:p>
        </w:tc>
      </w:tr>
    `).join('');

    const wordXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<?mso-application progid="Word.Document"?>
<w:wordDocument xmlns:w="http://schemas.microsoft.com/office/word/2003/wordml">
  <w:body>
    <w:sect>
      <w:p>
        <w:r>
          <w:rPr>
            <w:b/>
            <w:sz w:val="28"/>
          </w:rPr>
          <w:t>${escapeXml(title)}</w:t>
        </w:r>
      </w:p>
      <w:p>
        <w:r>
          <w:rPr>
            <w:sz w:val="20"/>
          </w:rPr>
          <w:t>Report Period: ${escapeXml(range)} | Generated: ${escapeXml(generatedDate)} | Total Transactions: ${reportRows.length}</w:t>
        </w:r>
      </w:p>
      <w:p>
        <w:r>
          <w:rPr>
            <w:b/>
            <w:sz w:val="22"/>
          </w:rPr>
          <w:t>Summary</w:t>
        </w:r>
      </w:p>
      <w:p>
        <w:r>
          <w:rPr>
            <w:sz w:val="20"/>
          </w:rPr>
          <w:t>Total Amount: ${escapeXml(formatAmount(totalAmount))} ${escapeXml(orgCurrency || '')}</w:t>
        </w:r>
      </w:p>
      <w:p>
        <w:r>
          <w:rPr>
            <w:sz w:val="20"/>
          </w:rPr>
          <w:t>MPESA Transactions: ${reportRows.filter(r => r.paid_via === 'MPESA').length}</w:t>
        </w:r>
      </w:p>
      <w:p>
        <w:r>
          <w:rPr>
            <w:sz w:val="20"/>
          </w:rPr>
          <w:t>Other Payment Methods: ${reportRows.filter(r => r.paid_via !== 'MPESA').length}</w:t>
        </w:r>
      </w:p>
      <w:tbl>
        <w:tblPr>
          <w:tblW w:w="0" w:type="auto"/>
          <w:tblBorders>
            <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
            <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
            <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
            <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
            <w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>
            <w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>
          </w:tblBorders>
        </w:tblPr>
        <w:tblGrid>
          <w:gridCol w:w="1440"/>
          <w:gridCol w:w="1800"/>
          <w:gridCol w:w="4200"/>
          <w:gridCol w:w="1800"/>
          <w:gridCol w:w="1560"/>
          <w:gridCol w:w="1200"/>
        </w:tblGrid>
        <w:tr>
          <w:tc>
            <w:tcPr>
              <w:tcW w:w="1440" w:type="dxa"/>
              <w:shd w:val="clear" w:color="auto" w:fill="3498db"/>
              <w:tcBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
              </w:tcBorders>
            </w:tcPr>
            <w:p>
              <w:pPr>
                <w:jc w:val="center"/>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:b/>
                  <w:sz w:val="20"/>
                  <w:color w:val="FFFFFF"/>
                </w:rPr>
                <w:t>Date</w:t>
              </w:r>
            </w:p>
          </w:tc>
          <w:tc>
            <w:tcPr>
              <w:tcW w:w="1800" w:type="dxa"/>
              <w:shd w:val="clear" w:color="auto" w:fill="3498db"/>
              <w:tcBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
              </w:tcBorders>
            </w:tcPr>
            <w:p>
              <w:pPr>
                <w:jc w:val="center"/>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:b/>
                  <w:sz w:val="20"/>
                  <w:color w:val="FFFFFF"/>
                </w:rPr>
                <w:t>Category</w:t>
              </w:r>
            </w:p>
          </w:tc>
          <w:tc>
            <w:tcPr>
              <w:tcW w:w="4200" w:type="dxa"/>
              <w:shd w:val="clear" w:color="auto" w:fill="3498db"/>
              <w:tcBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
              </w:tcBorders>
            </w:tcPr>
            <w:p>
              <w:pPr>
                <w:jc w:val="center"/>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:b/>
                  <w:sz w:val="20"/>
                  <w:color w:val="FFFFFF"/>
                </w:rPr>
                <w:t>Description</w:t>
              </w:r>
            </w:p>
          </w:tc>
          <w:tc>
            <w:tcPr>
              <w:tcW w:w="1800" w:type="dxa"/>
              <w:shd w:val="clear" w:color="auto" w:fill="3498db"/>
              <w:tcBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
              </w:tcBorders>
            </w:tcPr>
            <w:p>
              <w:pPr>
                <w:jc w:val="center"/>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:b/>
                  <w:sz w:val="20"/>
                  <w:color w:val="FFFFFF"/>
                </w:rPr>
                <w:t>Amount</w:t>
              </w:r>
            </w:p>
          </w:tc>
          <w:tc>
            <w:tcPr>
              <w:tcW w:w="1560" w:type="dxa"/>
              <w:shd w:val="clear" w:color="auto" w:fill="3498db"/>
              <w:tcBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
              </w:tcBorders>
            </w:tcPr>
            <w:p>
              <w:pPr>
                <w:jc w:val="center"/>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:b/>
                  <w:sz w:val="20"/>
                  <w:color w:val="FFFFFF"/>
                </w:rPr>
                <w:t>Paid via</w:t>
              </w:r>
            </w:p>
          </w:tc>
          <w:tc>
            <w:tcPr>
              <w:tcW w:w="1200" w:type="dxa"/>
              <w:shd w:val="clear" w:color="auto" w:fill="3498db"/>
              <w:tcBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
              </w:tcBorders>
            </w:tcPr>
            <w:p>
              <w:pPr>
                <w:jc w:val="center"/>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:b/>
                  <w:sz w:val="20"/>
                  <w:color w:val="FFFFFF"/>
                </w:rPr>
                <w:t>M-Pesa Referral</w:t>
              </w:r>
            </w:p>
          </w:tc>
        </w:tr>
        ${rowsXml}
        <w:tr>
          <w:tc>
            <w:tcPr>
              <w:tcW w:w="1440" w:type="dxa"/>
              <w:shd w:val="clear" w:color="auto" w:fill="f8f9fa"/>
              <w:tcBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
              </w:tcBorders>
            </w:tcPr>
            <w:p>
              <w:pPr>
                <w:jc w:val="right"/>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:b/>
                  <w:sz w:val="20"/>
                </w:rPr>
                <w:t>TOTAL:</w:t>
              </w:r>
            </w:p>
          </w:tc>
          <w:tc>
            <w:tcPr>
              <w:tcW w:w="1800" w:type="dxa"/>
              <w:shd w:val="clear" w:color="auto" w:fill="f8f9fa"/>
              <w:tcBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
              </w:tcBorders>
            </w:tcPr>
            <w:p>
              <w:pPr>
                <w:jc w:val="left"/>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:sz w:val="20"/>
                </w:rPr>
                <w:t></w:t>
              </w:r>
            </w:p>
          </w:tc>
          <w:tc>
            <w:tcPr>
              <w:tcW w:w="4200" w:type="dxa"/>
              <w:shd w:val="clear" w:color="auto" w:fill="f8f9fa"/>
              <w:tcBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
              </w:tcBorders>
            </w:tcPr>
            <w:p>
              <w:pPr>
                <w:jc w:val="left"/>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:sz w:val="20"/>
                </w:rPr>
                <w:t></w:t>
              </w:r>
            </w:p>
          </w:tc>
          <w:tc>
            <w:tcPr>
              <w:tcW w:w="1800" w:type="dxa"/>
              <w:shd w:val="clear" w:color="auto" w:fill="f8f9fa"/>
              <w:tcBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
              </w:tcBorders>
            </w:tcPr>
            <w:p>
              <w:pPr>
                <w:jc w:val="right"/>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:b/>
                  <w:sz w:val="20"/>
                </w:rPr>
                <w:t>${escapeXml(formatAmount(totalAmount))} ${escapeXml(orgCurrency || '')}</w:t>
              </w:r>
            </w:p>
          </w:tc>
          <w:tc>
            <w:tcPr>
              <w:tcW w:w="1560" w:type="dxa"/>
              <w:shd w:val="clear" w:color="auto" w:fill="f8f9fa"/>
              <w:tcBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
              </w:tcBorders>
            </w:tcPr>
            <w:p>
              <w:pPr>
                <w:jc w:val="left"/>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:sz w:val="20"/>
                </w:rPr>
                <w:t></w:t>
              </w:r>
            </w:p>
          </w:tc>
          <w:tc>
            <w:tcPr>
              <w:tcW w:w="1200" w:type="dxa"/>
              <w:shd w:val="clear" w:color="auto" w:fill="f8f9fa"/>
              <w:tcBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
              </w:tcBorders>
            </w:tcPr>
            <w:p>
              <w:pPr>
                <w:jc w:val="left"/>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:sz w:val="20"/>
                </w:rPr>
                <w:t></w:t>
              </w:r>
            </w:p>
          </w:tc>
        </w:tr>
      </w:tbl>
    </w:sect>
  </w:body>
</w:wordDocument>`;

    const blob = new Blob([wordXml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `funder_report_${funderName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.doc`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportReportPDF = () => {
    if (!reportRows.length) return;
    const funder = funders.find((f) => String(f.id) === String(reportFunderId));
    const funderName = funder?.name || reportFunderId || 'Funder';
    const title = `Funder Transaction Report - ${funderName}`;
    const range = `${reportFrom || 'All'} to ${reportTo || 'All'}`;
    const generatedDate = new Date().toLocaleDateString();

    const escapeHtml = (v) => String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    const totalAmount = reportRows.reduce((sum, r) => sum + (r.amount || 0), 0);

    const rowsHtml = reportRows.map((r, idx) => `
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e0e0e0; font-size: 13px;">${escapeHtml(r.date)}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e0e0e0; font-size: 13px;">${escapeHtml(r.category)}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e0e0e0; font-size: 13px;">${escapeHtml(r.description)}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e0e0e0; font-size: 13px; text-align: right; font-weight: 500; white-space: nowrap;">${escapeHtml(formatAmount(r.amount || 0))} ${escapeHtml(orgCurrency || '')}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e0e0e0; font-size: 13px;">${escapeHtml(r.paid_via)}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e0e0e0; font-size: 13px; font-family: 'Courier New', monospace; text-align: center;">${escapeHtml(r.mpesa_code)}</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      @page {
        size: A4;
        margin: 20mm;
      }
      
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        color: #2c3e50;
        margin: 0;
        padding: 0;
        background: #ffffff;
        line-height: 1.5;
      }
      
      .container {
        max-width: 100%;
        margin: 0 auto;
        padding: 20px;
      }
      
      .header {
        text-align: center;
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 3px solid #3498db;
      }
      
      h1 {
        font-size: 24px;
        color: #2c3e50;
        margin: 0 0 10px 0;
        font-weight: 700;
      }
      
      .subtitle {
        font-size: 14px;
        color: #7f8c8d;
        margin: 0;
      }
      
      .info-section {
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 25px;
      }
      
      .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
      }
      
      .info-item {
        display: flex;
        flex-direction: column;
      }
      
      .info-label {
        font-size: 12px;
        color: #6c757d;
        font-weight: 600;
        margin-bottom: 4px;
      }
      
      .info-value {
        font-size: 14px;
        color: #2c3e50;
        font-weight: 500;
      }
      
      .summary-section {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 25px;
      }
      
      .summary-title {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 15px;
        text-align: center;
      }
      
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 20px;
      }
      
      .summary-item {
        text-align: center;
      }
      
      .summary-value {
        font-size: 20px;
        font-weight: 700;
        margin-bottom: 5px;
      }
      
      .summary-label {
        font-size: 12px;
        opacity: 0.9;
      }
      
      .table-container {
        overflow: hidden;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      }
      
      table {
        width: 100%;
        border-collapse: collapse;
        background: white;
      }
      
      thead {
        background: #34495e;
        color: white;
      }
      
      th {
        padding: 15px 12px;
        text-align: left;
        font-weight: 600;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      th:nth-child(4) {
        text-align: right;
      }
      
      th:nth-child(6) {
        text-align: center;
      }
      
      tbody tr:nth-child(even) {
        background-color: #f8f9fa;
      }
      
      tbody tr:hover {
        background-color: #e3f2fd;
      }
      
      .total-row {
        background: #2c3e50 !important;
        color: white;
        font-weight: 700;
      }
      
      .total-row td {
        padding: 15px 12px;
        font-size: 14px;
      }
      
      .total-row td:nth-child(4) {
        text-align: right;
        font-size: 16px;
      }
      
      @media print {
        body { margin: 0; }
        .container { padding: 10px; }
        .header { margin-bottom: 20px; }
        .info-section, .summary-section { margin-bottom: 15px; }
        th { font-size: 11px; padding: 10px 8px; }
        td { font-size: 11px; padding: 8px; }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>${escapeHtml(title)}</h1>
        <p class="subtitle">Financial Transaction Report</p>
      </div>
      
      <div class="info-section">
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Report Period</span>
            <span class="info-value">${escapeHtml(range)}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Generated Date</span>
            <span class="info-value">${escapeHtml(generatedDate)}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Total Transactions</span>
            <span class="info-value">${reportRows.length}</span>
          </div>
        </div>
      </div>

      <div class="summary-section">
        <div class="summary-title">Financial Summary</div>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-value">${escapeHtml(formatAmount(totalAmount))}</div>
            <div class="summary-label">Total Amount (${escapeHtml(orgCurrency || '')})</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${reportRows.filter(r => r.paid_via === 'MPESA').length}</div>
            <div class="summary-label">M-Pesa Transactions</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${reportRows.filter(r => r.paid_via !== 'MPESA').length}</div>
            <div class="summary-label">Other Payment Methods</div>
          </div>
        </div>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th style="width: 12%;">Date</th>
              <th style="width: 15%;">Category</th>
              <th style="width: 35%;">Description</th>
              <th style="width: 15%;">Amount</th>
              <th style="width: 13%;">Paid Via</th>
              <th style="width: 10%;">M-Pesa Referral</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="3">TOTAL</td>
              <td>${escapeHtml(formatAmount(totalAmount))} ${escapeHtml(orgCurrency || '')}</td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </body>
</html>`;

    // Create a blob and download directly
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `funder_report_${funderName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-slate-100 sm:truncate sm:text-3xl sm:tracking-tight">CSV Import & Funder Report</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Import expenses for a funder and generate a downloadable transaction report with M-Pesa referrals.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Import expenses CSV (for a funder)</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Funder</label>
              <select value={importFunderId} onChange={(e) => setImportFunderId(e.target.value)} className="w-full px-3 py-2 rounded-lg ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none">
                <option value="">Select funder</option>
                {funders.map((f) => (
                  <option key={f.id} value={f.id}>{f.name || f.id}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">CSV file</label>
              <input
                type="file"
                accept=".csv,text/csv"
                className="w-full text-sm text-slate-700 dark:text-slate-200 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200 dark:file:bg-slate-800 dark:file:text-slate-200 dark:hover:file:bg-slate-700"
                onChange={(e) => onPickCSV(e.target.files && e.target.files[0])}
              />
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Required columns: date, amount. Optional: category, description, paid_via, mpesa_referral, project</div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button onClick={downloadImportTemplate} className="text-xs font-medium text-slate-700 hover:underline dark:text-slate-200">Download template CSV</button>
                <button onClick={downloadImportExample} className="text-xs font-medium text-slate-700 hover:underline dark:text-slate-200">Download example CSV</button>
              </div>
            </div>
          </div>

          {importErrors.length > 0 && (
            <div className="mt-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 ring-1 ring-rose-200 dark:ring-rose-900/40 p-3">
              <div className="text-sm font-medium text-rose-700 dark:text-rose-200">Import issues</div>
              <ul className="mt-1 text-sm text-rose-700 dark:text-rose-200 list-disc pl-5">
                {importErrors.map((e, idx) => (<li key={idx}>{e}</li>))}
              </ul>
            </div>
          )}

          {importPreview.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Preview ({importStats.accepted} rows)
                  <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">({importStats.ignored} ignored)</span>
                </div>
                <button disabled={importing} onClick={doImport} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900">
                  {importing ? 'Importing...' : 'Import rows'}
                </button>
              </div>
              <div className="mt-3 overflow-x-auto ring-1 ring-slate-200 dark:ring-slate-700 rounded-lg">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-900 dark:text-slate-100">Date</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-slate-100">Amount</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-900 dark:text-slate-100">Category</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-900 dark:text-slate-100">Paid via</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-900 dark:text-slate-100">Mpesa referral</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-900 dark:text-slate-100">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {importPreview.map((r, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 whitespace-nowrap text-slate-900 dark:text-slate-100">{r.date ? new Date(r.date).toLocaleDateString() : ''}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap text-slate-900 dark:text-slate-100">{r.amount}</td>
                        <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{r.category}</td>
                        <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{r.paidVia}</td>
                        <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{r.mpesaCode}</td>
                        <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{r.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle>Funder transaction report (with M-Pesa referrals)</CardTitle>
            <div className="flex items-center gap-3">
              <button
                onClick={generateMissingCodes}
                disabled={generating || !filteredExpenses.length || !canGenerate}
                className="px-3 py-2 rounded-md bg-sky-600 text-white text-sm disabled:opacity-50 dark:bg-sky-500"
                title="Generate and save M-Pesa referrals for MPESA transactions that are missing a referral"
              >
                {generating ? 'Generating…' : (missingCount > 0 ? `Generate M-Pesa referrals (${missingCount} missing)` : 'Generate M-Pesa referrals')}
              </button>
              <button
                onClick={exportReportPDF}
                className="text-sm font-medium text-slate-700 hover:underline disabled:opacity-50 dark:text-slate-200"
                disabled={!reportRows.length}
              >
                Export PDF
              </button>
              <button
                onClick={exportReportWord}
                className="text-sm font-medium text-slate-700 hover:underline disabled:opacity-50 dark:text-slate-200"
                disabled={!reportRows.length}
              >
                Export Word
              </button>
              <button
                onClick={() => downloadCSV('funder_transactions.csv', reportRows)}
                className="text-sm font-medium text-slate-700 hover:underline disabled:opacity-50 dark:text-slate-200"
                disabled={!reportRows.length}
              >
                Export CSV
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {importSuccess > 0 && (
            <div className="mt-3 rounded-lg bg-sky-50 dark:bg-sky-950/30 ring-1 ring-sky-200 dark:ring-sky-900/40 px-3 py-2 text-sm text-sky-700 dark:text-sky-200">
              Imported {importSuccess} row{importSuccess === 1 ? '' : 's'}. Report filters have been set for this funder and date range.
            </div>
          )}
          {generatedCount > 0 && (
            <div className="mt-3 rounded-lg bg-green-50 dark:bg-green-950/30 ring-1 ring-green-200 dark:ring-green-900/40 px-3 py-2 text-sm text-green-700 dark:text-green-200">
              Generated {generatedCount} M-Pesa {generatedCount === 1 ? 'referral' : 'referrals'} for missing entries.
            </div>
          )}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Funder</label>
              <select value={reportFunderId} onChange={(e) => setReportFunderId(e.target.value)} className="w-full px-3 py-2 rounded-lg ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none">
                <option value="">Select funder</option>
                {funders.map((f) => (
                  <option key={f.id} value={f.id}>{f.name || f.id}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">From</label>
              <input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} className="w-full px-3 py-2 rounded-lg ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">To</label>
              <input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} className="w-full px-3 py-2 rounded-lg ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none" />
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Date</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Category</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Description</th>
                  <th className="px-3 py-2 text-right text-sm font-semibold text-gray-900 dark:text-slate-100">Amount</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Paid via</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">M-Pesa Referral</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                {reportRows.slice(0, 50).map((r, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 text-sm whitespace-nowrap text-slate-900 dark:text-slate-100">{r.date}</td>
                    <td className="px-3 py-2 text-sm text-slate-900 dark:text-slate-100">{r.category}</td>
                    <td className="px-3 py-2 text-sm text-slate-900 dark:text-slate-100">{r.description}</td>
                    <td className="px-3 py-2 text-sm text-right whitespace-nowrap text-slate-900 dark:text-slate-100">{formatAmount(r.amount || 0)} {orgCurrency || ''}</td>
                    <td className="px-3 py-2 text-sm text-slate-900 dark:text-slate-100">{r.paid_via}</td>
                    <td className="px-3 py-2 text-sm font-mono text-slate-900 dark:text-slate-100">{r.mpesa_code}</td>
                  </tr>
                ))}
                {reportRows.length === 0 && (
                  <tr><td className="px-3 py-4 text-sm text-gray-500 dark:text-slate-400" colSpan={6}>Select a funder (and optional date range) to generate a transaction report.</td></tr>
                )}
                {reportRows.length > 0 && missingCount === 0 && (
                  <tr><td className="px-3 py-4 text-sm text-gray-500 dark:text-slate-400" colSpan={6}>No MPESA rows without codes in this selection. You can export directly.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
