import { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useOrg } from '../context/OrgContext';
import { formatAmount } from '../utils/format';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import {
  buildExecutiveSummary,
  buildIntelligenceInsights,
  deriveReportingPeriod,
  filterByPeriod,
  genReferenceCode,
  groupTransactionsCategoryPayee,
  normalizeImportedRowsToTransactions,
  readSpreadsheetFile,
} from '../utils/reporting';

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

function downloadText(filename, text, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
  const [importWarnings, setImportWarnings] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importStats, setImportStats] = useState({ total: 0, accepted: 0, ignored: 0 });
  const [importSuccess, setImportSuccess] = useState(0);

  // New: Report generator (NAPTA hierarchy reports)
  const [reportFileRows, setReportFileRows] = useState([]);
  const [reportTx, setReportTx] = useState([]);
  const [reportErrors, setReportErrors] = useState([]);
  const [reportWarnings, setReportWarnings] = useState([]);
  const [reportType, setReportType] = useState('monthly'); // monthly | quarterly | yearly
  const [reportMonth, setReportMonth] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [reportQuarter, setReportQuarter] = useState(() => String(Math.floor(new Date().getMonth() / 3) + 1));
  const [reportYear, setReportYear] = useState(() => String(new Date().getFullYear()));

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
      _hasValidDate: r._hasValidDate,
      _hasValidAmount: r._hasValidAmount,
    }));
  }, [importRows]);

  const selectedPeriod = useMemo(() => {
    if (reportType === 'monthly') {
      const [yy, mm] = String(reportMonth || '').split('-');
      return { type: 'monthly', year: Number(yy), month: Number(mm) };
    }
    if (reportType === 'quarterly') {
      return { type: 'quarterly', year: Number(reportYear), quarter: Number(reportQuarter) };
    }
    return { type: 'yearly', year: Number(reportYear) };
  }, [reportType, reportMonth, reportQuarter, reportYear]);

  const periodLabel = useMemo(() => {
    if (reportType === 'monthly') {
      const [yy, mm] = String(reportMonth || '').split('-');
      if (!yy || !mm) return '';
      const date = new Date(Number(yy), Number(mm) - 1, 1);
      return date.toLocaleString(undefined, { month: 'long', year: 'numeric' });
    }
    if (reportType === 'quarterly') return `Q${reportQuarter} ${reportYear}`;
    return String(reportYear || '');
  }, [reportType, reportMonth, reportQuarter, reportYear]);

  const periodTx = useMemo(() => {
    const filtered = filterByPeriod(reportTx || [], selectedPeriod);
    // derive reportingPeriod field
    return filtered.map((t) => ({ ...t, reportingPeriod: deriveReportingPeriod(t.dateOfPayment, reportType) }));
  }, [reportTx, selectedPeriod, reportType]);

  const grouped = useMemo(() => groupTransactionsCategoryPayee(periodTx), [periodTx]);
  const execSummary = useMemo(() => buildExecutiveSummary(periodTx), [periodTx]);
  const intelligence = useMemo(() => buildIntelligenceInsights(periodTx), [periodTx]);

  const downloadExpenditureTemplate = () => {
    downloadCSV('expenditure_template.csv', [
      {
        dateOfPayment: '2026-01-15',
        category: 'Staff Costs',
        payeeName: 'Jane Doe',
        description: 'Project coordinator salary',
        amount: '10000',
        paymentMethod: 'MPESA',
        referenceCode: '',
        projectName: 'Project Alpha',
      },
    ]);
  };

  const downloadExpenditureExample = () => {
    downloadCSV('expenditure_example.csv', [
      {
        dateOfPayment: '2026-01-05',
        category: 'Travel & Transport',
        payeeName: 'ABC Taxi Services',
        description: 'Airport pickup for field team',
        amount: '2500',
        paymentMethod: 'MPESA',
        referenceCode: 'QWE123ABC9',
        projectName: 'Field Outreach',
      },
      {
        dateOfPayment: '2026-01-10',
        category: 'Operations',
        payeeName: 'Office Supplies Ltd',
        description: 'Stationery and printing',
        amount: '7500',
        paymentMethod: 'BANK TRANSFER',
        referenceCode: '',
        projectName: 'Head Office',
      },
    ]);
  };

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
    setImportWarnings([]);
    setImportRows([]);
    setImportStats({ total: 0, accepted: 0, ignored: 0 });
    if (!file) return;
    try {
      const name = String(file.name || '').toLowerCase();
      let grid;

      if (name.endsWith('.csv') || name.endsWith('.txt')) {
        const text = await file.text();
        grid = (() => {
          // keep legacy import parser local to this feature
          // NOTE: this legacy importer expects a CSV with a header row
          const out = [];
          let row = [];
          let cur = '';
          let inQuotes = false;
          for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (inQuotes) {
              if (ch === '"') {
                if (text[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = false; }
              } else cur += ch;
              continue;
            }
            if (ch === '"') { inQuotes = true; continue; }
            if (ch === ',') { row.push(cur); cur = ''; continue; }
            if (ch === '\n') {
              row.push(cur); cur = '';
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
        })();
      } else {
        // Excel path: use shared spreadsheet reader and convert to grid
        const res = await readSpreadsheetFile(file);
        if (res.error) {
          setImportErrors([res.error]);
          return;
        }
        const objRows = Array.isArray(res.rows) ? res.rows : [];
        if (!objRows.length) {
          setImportErrors(['File is empty']);
          return;
        }
        const headerKeys = Object.keys(objRows[0] || {});
        grid = [headerKeys];
        objRows.forEach((r) => {
          const line = headerKeys.map((h) => (r && Object.prototype.hasOwnProperty.call(r, h) ? r[h] : ''));
          grid.push(line);
        });
      }

      if (!grid.length) {
        setImportErrors(['CSV is empty']);
        return;
      }
      const normalizeHeader = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
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

      const rows = [];
      let ignored = 0;
      for (let r = 1; r < grid.length; r++) {
        const line = grid[r];
        const dateRaw = idxDate >= 0 ? (line[idxDate] || '') : '';
        const amtRaw = idxAmount >= 0 ? (line[idxAmount] || '') : '';
        const amt = Number(String(amtRaw).replace(/,/g, ''));
        const date = dateRaw ? new Date(dateRaw) : null;
        
        // Skip rows with completely missing date and amount
        if ((!dateRaw || dateRaw.trim() === '') && (!amtRaw || amtRaw.trim() === '')) { ignored++; continue; }
        
        // Allow rows with missing data but warn about invalid dates/amounts
        if (dateRaw && (isNaN(date.getTime()) || date.getFullYear() < 2000 || date.getFullYear() > 2100)) { 
          // Invalid date but continue processing
        }
        if (amtRaw && (!Number.isFinite(amt) || amt <= 0)) { 
          // Invalid amount but continue processing
        }

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
          date: date && !isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : '',
          amount: Number.isFinite(amt) && amt > 0 ? amt : 0,
          category,
          description,
          paidVia,
          mpesaCode,
          projectId,
          projectName,
          _rowIndex: r,
          _hasValidDate: date && !isNaN(date.getTime()),
          _hasValidAmount: Number.isFinite(amt) && amt > 0,
        });
      }
      setImportRows(rows);
      const validRows = rows.filter(r => r._hasValidDate && r._hasValidAmount);
      setImportStats({ total: Math.max(grid.length - 1, 0), accepted: validRows.length, ignored });
      if (!rows.length) setImportErrors(['No valid rows found (check date/amount formats)']);
      else if (validRows.length < rows.length) {
        const invalidCount = rows.length - validRows.length;
        setImportWarnings([`${invalidCount} row(s) have invalid dates or amounts and will be skipped during import`]);
      }
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
        const code = genReferenceCode(used);
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
        // Skip rows with invalid dates or amounts
        if (!r._hasValidDate || !r._hasValidAmount) continue;
        
        const paidVia = (r.paidVia || 'MPESA').toString().trim() || 'MPESA';
        const isMpesa = paidVia.toUpperCase() === 'MPESA';
        const mpesaCode = isMpesa
          ? (r.mpesaCode || genReferenceCode(used))
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
      const validRows = importRows.filter(r => r._hasValidDate && r._hasValidAmount);
      setImportSuccess(validRows.length || 0);
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
              <w:t>${escapeXml(formatAmount(r.amount || 0, 'KES'))} KSH</w:t>
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
          <w:t>Total Amount: ${escapeXml(formatAmount(totalAmount, 'KES'))} KSH</w:t>
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
                <w:t>${escapeXml(formatAmount(totalAmount, 'KES'))} KSH</w:t>
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
        <td style="padding: 12px 8px; border-bottom: 1px solid #e0e0e0; font-size: 13px; text-align: right; font-weight: 500; white-space: nowrap;">${escapeHtml(formatAmount(r.amount || 0, 'KES'))} KSH</td>
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
            <div class="summary-value">${escapeHtml(formatAmount(totalAmount, 'KES'))} KSH</div>
            <div class="summary-label">Total Amount (KSH)</div>
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
              <td>${escapeHtml(formatAmount(totalAmount, 'KES'))} KSH</td>
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

  const onPickReportFile = async (file) => {
    setReportErrors([]);
    setReportWarnings([]);
    setReportFileRows([]);
    setReportTx([]);
    if (!file) return;
    const res = await readSpreadsheetFile(file);
    if (res.error) {
      setReportErrors([res.error]);
      return;
    }
    const rows = Array.isArray(res.rows) ? res.rows : [];
    setReportFileRows(rows);
    const normalized = normalizeImportedRowsToTransactions(rows, { defaultPaymentMethod: 'MPESA' });
    setReportErrors(normalized.errors || []);
    setReportWarnings(normalized.warnings || []);
    setReportTx(normalized.transactions || []);
  };

  const reportPreview = useMemo(() => {
    return (periodTx || []).slice(0, 25).map((t) => ({
      transactionId: t.transactionId,
      dateOfPayment: t.dateOfPayment ? t.dateOfPayment.toLocaleDateString() : '',
      category: t.category,
      payeeName: t.payeeName,
      description: t.description,
      amount: t.amount,
      paymentMethod: t.paymentMethod || '',
      referenceCode: t.referenceCode || '',
      projectName: t.projectName || '',
    }));
  }, [periodTx]);

  const exportHierarchyHTML = () => {
    const generated = new Date().toLocaleString();
    const title = reportType === 'monthly'
      ? 'Monthly Expenditure Report'
      : (reportType === 'quarterly' ? 'Quarterly Expenditure Report' : 'Annual Expenditure Report');

    const esc = (v) => String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    const catSummaryRows = grouped.map((c) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${esc(c.categoryName)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap;">${esc(formatAmount(c.categoryTotal, 'KES'))} KSH</td>
      </tr>
    `).join('');

    const narrative = (() => {
      return `Total expenditure for ${periodLabel} is ${formatAmount(execSummary.totalExpenditure || 0, 'KES')} KSH.`;
    })();

    const body = grouped.map((c) => {
      const payeesHtml = c.payees.map((p) => {
        const txRows = p.transactions.map((t) => `
          <tr>
            <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;white-space:nowrap;">${esc(t.dateOfPayment ? t.dateOfPayment.toLocaleDateString() : '')}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;">${esc(t.description)}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;text-align:right;white-space:nowrap;">${esc(formatAmount(t.amount, 'KES'))} KSH</td>
            <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;white-space:nowrap;">${esc(t.paymentMethod || '')}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;font-family: 'Courier New', monospace;white-space:nowrap;">${esc(t.referenceCode || '')}</td>
          </tr>
        `).join('');
        return `
          <div style="margin-top:10px;padding:10px;border:1px solid #e5e7eb;border-radius:8px;">
            <div style="display:flex;justify-content:space-between;gap:12px;">
              <div style="font-weight:700;">Payee: ${esc(p.payeeName)}</div>
              <div style="font-weight:700;">Subtotal: ${esc(formatAmount(p.subtotal, 'KES'))} KSH</div>
            </div>
            <table style="width:100%;border-collapse:collapse;margin-top:8px;">
              <thead>
                <tr>
                  <th style="text-align:left;padding:6px 8px;border-bottom:2px solid #e5e7eb;">Date</th>
                  <th style="text-align:left;padding:6px 8px;border-bottom:2px solid #e5e7eb;">Description</th>
                  <th style="text-align:right;padding:6px 8px;border-bottom:2px solid #e5e7eb;">Amount</th>
                  <th style="text-align:left;padding:6px 8px;border-bottom:2px solid #e5e7eb;">Method</th>
                  <th style="text-align:left;padding:6px 8px;border-bottom:2px solid #e5e7eb;">M-Pesa Ref</th>
                </tr>
              </thead>
              <tbody>
                ${txRows}
              </tbody>
            </table>
          </div>
        `;
      }).join('');
      return `
        <section style="margin-top:18px;">
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-end;">
            <div style="font-size:16px;font-weight:800;">Category: ${esc(c.categoryName)}</div>
            <div style="font-size:16px;font-weight:800;">Total: ${esc(formatAmount(c.categoryTotal))}</div>
          </div>
          ${payeesHtml}
        </section>
      `;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title} - ${esc(periodLabel)}</title>
  <style>
    body { font-family: Segoe UI, Arial, sans-serif; color:#0f172a; margin:0; background:#fff; }
    .container { max-width: 980px; margin: 0 auto; padding: 24px; }
    .muted { color:#64748b; font-size: 13px; }
    .card { border:1px solid #e5e7eb; border-radius: 12px; padding: 14px; background:#fff; }
    .grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    @media print { .no-print { display:none; } .container { padding: 0; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
        <div>
          <div style="font-weight:900;font-size:18px;">Organization Name: NAPTA</div>
          <div style="font-weight:800;font-size:16px;margin-top:4px;">${esc(title)}</div>
          <div class="muted" style="margin-top:4px;">Reporting Period: ${esc(periodLabel)}</div>
        </div>
        <div class="muted">Date Generated: ${esc(generated)}</div>
      </div>
    </div>

    <div style="height:12px;"></div>
    <div class="card">
      <div style="font-weight:800;">Executive Summary</div>
      <div class="grid" style="margin-top:10px;">
        <div><div class="muted">Total Expenditure</div><div style="font-weight:800;">${esc(formatAmount(execSummary.totalExpenditure))}</div></div>
        <div><div class="muted">Number of Categories</div><div style="font-weight:800;">${esc(execSummary.numberOfCategories)}</div></div>
        <div><div class="muted">Highest Spending Category</div><div style="font-weight:800;">${esc(execSummary.highestSpendingCategory)}</div></div>
        <div><div class="muted">Reporting Period Covered</div><div style="font-weight:800;">${esc(periodLabel)}</div></div>
      </div>
      <div class="muted" style="margin-top:10px;">${esc(narrative)}</div>
    </div>

    <div style="height:12px;"></div>
    <div class="card">
      <div style="font-weight:800;">Category Breakdown</div>
      ${body || '<div class="muted" style="margin-top:8px;">No transactions for this period.</div>'}
    </div>

    <div style="height:12px;"></div>
    <div class="card">
      <div style="font-weight:800;">Category Summary Table</div>
      <table style="width:100%;border-collapse:collapse;margin-top:8px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px;border-bottom:2px solid #e5e7eb;">Category</th>
            <th style="text-align:right;padding:8px;border-bottom:2px solid #e5e7eb;">Total Amount</th>
          </tr>
        </thead>
        <tbody>
          ${catSummaryRows || ''}
        </tbody>
      </table>
    </div>

    <div style="height:12px;"></div>
    <div class="card">
      <div style="font-weight:800;">Period Summary</div>
      <div class="muted" style="margin-top:6px;">${esc(periodLabel)} total: ${esc(formatAmount(execSummary.totalExpenditure))}</div>
    </div>
  </div>
</body>
</html>`;

    downloadText(`NAPTA_${reportType}_${String(periodLabel).replace(/\s+/g, '_')}.html`, html, 'text/html;charset=utf-8');
  };

  const exportHierarchyPDF = () => {
    if (!periodTx.length) return;
    // "PDF export" via print dialog (Save as PDF)
    // This matches your existing pattern elsewhere and is reliable for long tables.
    const generated = new Date().toLocaleString();
    const title = reportType === 'monthly'
      ? 'Monthly Expenditure Report'
      : (reportType === 'quarterly' ? 'Quarterly Expenditure Report' : 'Annual Expenditure Report');
    const filename = `NAPTA_${reportType}_${String(periodLabel).replace(/\s+/g, '_')}.pdf`;

    // Reuse the same HTML but open it in a new window for printing
    // (we keep it in-memory so it works without server-side rendering).
    const htmlBlob = new Blob([], { type: 'text/html;charset=utf-8' });
    void htmlBlob; // keeps linter happy; we build html by calling exportHierarchyHTML logic inline

    // Build HTML by calling exportHierarchyHTML's internal builder (copy minimal parts)
    // We simply call exportHierarchyHTML to download HTML AND then print the same doc.
    // To avoid double-building, we build again here (fast enough for typical sizes).
    const esc = (v) => String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    const narrative = `Total expenditure for ${periodLabel} is ${formatAmount(execSummary.totalExpenditure || 0, 'KES')} KSH.`;
    function escSummarySafe(x) { return x == null ? '-' : String(x); }

    const catSummaryRows = grouped.map((c) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${esc(c.categoryName)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap;">${esc(formatAmount(c.categoryTotal, 'KES'))} KSH</td>
      </tr>
    `).join('');
    const insightsHtml = (intelligence || []).slice(0, 6).map((it) => `
      <li style="margin:4px 0; color:${it.type === 'warning' ? '#b45309' : '#334155'};">${esc(it.text)}</li>
    `).join('');
    const body = grouped.map((c) => {
      const payeesHtml = c.payees.map((p) => {
        const txRows = p.transactions.map((t) => `
          <tr>
            <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;white-space:nowrap;">${esc(t.dateOfPayment ? t.dateOfPayment.toLocaleDateString() : '')}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;">${esc(t.description)}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;text-align:right;white-space:nowrap;">${esc(formatAmount(t.amount, 'KES'))} KSH</td>
            <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;white-space:nowrap;">${esc(t.paymentMethod || '')}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;font-family: 'Courier New', monospace;white-space:nowrap;">${esc(t.referenceCode || '')}</td>
          </tr>
        `).join('');
        return `
          <div style="margin-top:10px;padding:10px;border:1px solid #e5e7eb;border-radius:8px;">
            <div style="display:flex;justify-content:space-between;gap:12px;">
              <div style="font-weight:700;">Payee: ${esc(p.payeeName)}</div>
              <div style="font-weight:700;">Subtotal: ${esc(formatAmount(p.subtotal, 'KES'))} KSH</div>
            </div>
            <table style="width:100%;border-collapse:collapse;margin-top:8px;">
              <thead>
                <tr>
                  <th style="text-align:left;padding:6px 8px;border-bottom:2px solid #e5e7eb;">Date</th>
                  <th style="text-align:left;padding:6px 8px;border-bottom:2px solid #e5e7eb;">Description</th>
                  <th style="text-align:right;padding:6px 8px;border-bottom:2px solid #e5e7eb;">Amount</th>
                  <th style="text-align:left;padding:6px 8px;border-bottom:2px solid #e5e7eb;">Method</th>
                  <th style="text-align:left;padding:6px 8px;border-bottom:2px solid #e5e7eb;">M-Pesa Ref</th>
                </tr>
              </thead>
              <tbody>
                ${txRows}
              </tbody>
            </table>
          </div>
        `;
      }).join('');
      return `
        <section style="margin-top:18px;">
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-end;">
            <div style="font-size:16px;font-weight:800;">Category: ${esc(c.categoryName)}</div>
            <div style="font-size:16px;font-weight:800;">Total: ${esc(formatAmount(c.categoryTotal))}</div>
          </div>
          ${payeesHtml}
        </section>
      `;
    }).join('');
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${esc(title)} - ${esc(periodLabel)}</title>
  <style>
    @page { size: A4; margin: 16mm; }
    body { font-family: Segoe UI, Arial, sans-serif; color:#0f172a; margin:0; background:#fff; }
    .container { max-width: 980px; margin: 0 auto; padding: 24px; }
    .muted { color:#64748b; font-size: 13px; }
    .card { border:1px solid #e5e7eb; border-radius: 12px; padding: 14px; background:#fff; }
    .grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    @media print { .container { padding: 0; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
        <div>
          <div style="font-weight:900;font-size:18px;">Organization Name: NAPTA</div>
          <div style="font-weight:800;font-size:16px;margin-top:4px;">${esc(title)}</div>
          <div class="muted" style="margin-top:4px;">Reporting Period: ${esc(periodLabel)}</div>
        </div>
        <div class="muted">Date Generated: ${esc(generated)}</div>
      </div>
    </div>

    <div style="height:12px;"></div>
    <div class="card">
      <div style="font-weight:800;">Executive Summary</div>
      <div class="grid" style="margin-top:10px;">
        <div><div class="muted">Total Expenditure</div><div style="font-weight:800;">${esc(formatAmount(execSummary.totalExpenditure))}</div></div>
        <div><div class="muted">Number of Categories</div><div style="font-weight:800;">${esc(execSummary.numberOfCategories)}</div></div>
        <div><div class="muted">Highest Spending Category</div><div style="font-weight:800;">${esc(execSummary.highestSpendingCategory)}</div></div>
        <div><div class="muted">Reporting Period Covered</div><div style="font-weight:800;">${esc(periodLabel)}</div></div>
      </div>
      <div class="muted" style="margin-top:10px;">${esc(narrative)}</div>
    </div>

    <div style="height:12px;"></div>
    <div class="card">
      <div style="font-weight:800;">Category Breakdown</div>
      ${body || '<div class="muted" style="margin-top:8px;">No transactions for this period.</div>'}
    </div>

    <div style="height:12px;"></div>
    <div class="card">
      <div style="font-weight:800;">Category Summary Table</div>
      <table style="width:100%;border-collapse:collapse;margin-top:8px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px;border-bottom:2px solid #e5e7eb;">Category</th>
            <th style="text-align:right;padding:8px;border-bottom:2px solid #e5e7eb;">Total Amount</th>
          </tr>
        </thead>
        <tbody>
          ${catSummaryRows || ''}
        </tbody>
      </table>
    </div>

    <div style="height:12px;"></div>
    <div class="card">
      <div style="font-weight:800;">Period Summary</div>
      <div class="muted" style="margin-top:6px;">${esc(periodLabel)} total: ${esc(formatAmount(execSummary.totalExpenditure))}</div>
    </div>
  </div>
</body>
</html>`;

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.document.title = filename;
    // Give the browser a moment to render before printing
    setTimeout(() => {
      try { w.focus(); w.print(); } catch {}
    }, 400);
  };

  const exportHierarchyWord = () => {
    if (!periodTx.length) return;
    const generatedDate = new Date().toLocaleString();
    const title = reportType === 'monthly'
      ? 'Monthly Expenditure Report'
      : (reportType === 'quarterly' ? 'Quarterly Expenditure Report' : 'Annual Expenditure Report');

    const escapeXml = (v) => String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    // Generate automatic M-Pesa references for missing ones
    const usedRefs = new Set();
    const transactionsWithRefs = periodTx.map((t) => {
      let refCode = t.referenceCode || '';
      const isMpesa = (t.paymentMethod || '').toUpperCase() === 'MPESA' || 
                     (t.paymentMethod || '').toUpperCase() === 'M-PESA' ||
                     !t.paymentMethod; // Default to MPESA if no method specified
      if (isMpesa && !refCode) {
        refCode = genReferenceCode(usedRefs);
        usedRefs.add(refCode);
      }
      return { ...t, referenceCode: refCode };
    });

    // Regroup transactions with new references
    const groupedWithRefs = groupTransactionsCategoryPayee(transactionsWithRefs);

    const narrative = `Total expenditure for ${periodLabel} is ${formatAmount(execSummary.totalExpenditure || 0, 'KES')} KSH.`;

    const insights = (intelligence || []).slice(0, 8);

    const catSummaryRows = groupedWithRefs.map((c) => `
      <w:tr>
        <w:tc><w:p><w:r><w:t>${escapeXml(c.categoryName)}</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:t>${escapeXml(formatAmount(c.categoryTotal, 'KES'))} KSH</w:t></w:r></w:p></w:tc>
      </w:tr>
    `).join('');

    const breakdownXml = groupedWithRefs.map((c) => {
      const payeesXml = c.payees.map((p) => {
        const txRows = p.transactions.map((t) => `
          <w:tr>
            <w:tc><w:p><w:pPr><w:spacing w:before="100" w:after="100"/></w:pPr><w:r><w:t>${escapeXml(c.categoryName || '')}</w:t></w:r></w:p></w:tc>
            <w:tc><w:p><w:pPr><w:spacing w:before="100" w:after="100"/></w:pPr><w:r><w:t>${escapeXml(p.payeeName || '')}</w:t></w:r></w:p></w:tc>
            <w:tc><w:p><w:pPr><w:spacing w:before="100" w:after="100"/></w:pPr><w:r><w:t>${escapeXml(t.description || '')}</w:t></w:r></w:p></w:tc>
            <w:tc><w:p><w:pPr><w:jc w:val="right"/><w:spacing w:before="100" w:after="100"/></w:pPr><w:r><w:t>${escapeXml(formatAmount(t.amount, 'KES'))} KSH</w:t></w:r></w:p></w:tc>
            <w:tc><w:p><w:pPr><w:spacing w:before="100" w:after="100"/></w:pPr><w:r><w:t>${escapeXml(t.dateOfPayment ? t.dateOfPayment.toLocaleDateString() : '')}</w:t></w:r></w:p></w:tc>
            <w:tc><w:p><w:pPr><w:spacing w:before="100" w:after="100"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New"/></w:rPr><w:t>${escapeXml(t.referenceCode || '')}</w:t></w:r></w:p></w:tc>
          </w:tr>
        `).join('');

        return `
          <w:p><w:r><w:rPr><w:b/><w:sz w:val="22"/></w:rPr><w:t>Payee: ${escapeXml(p.payeeName)} (Subtotal: ${escapeXml(formatAmount(p.subtotal, 'KES'))} KSH)</w:t></w:r></w:p>
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
            <w:tr>
              <w:tc><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Category</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Payee Name</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Expenditure</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Amount</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Payment Date</w:t></w:r></w:p></w:tc>
              <w:tc><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>M-Pesa Number</w:t></w:r></w:p></w:tc>
            </w:tr>
            ${txRows}
          </w:tbl>
        `;
      }).join('');

      return `
        <w:p><w:r><w:rPr><w:b/><w:sz w:val="26"/></w:rPr><w:t>Category: ${escapeXml(c.categoryName)} (Total: ${escapeXml(formatAmount(c.categoryTotal))})</w:t></w:r></w:p>
        ${payeesXml}
      `;
    }).join('');

    const insightsXml = insights.map((it) => `
      <w:p><w:r><w:t>- ${escapeXml(it.text)}</w:t></w:r></w:p>
    `).join('');

    const wordXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<?mso-application progid="Word.Document"?>
<w:wordDocument xmlns:w="http://schemas.microsoft.com/office/word/2003/wordml">
  <w:body>
    <w:sect>
      <w:p><w:r><w:rPr><w:b/><w:sz w:val="30"/></w:rPr><w:t>Organization Name: NAPTA</w:t></w:r></w:p>
      <w:p><w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>${escapeXml(title)}</w:t></w:r></w:p>
      <w:p><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>Reporting Period: ${escapeXml(periodLabel)} | Date Generated: ${escapeXml(generatedDate)}</w:t></w:r></w:p>

      <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Executive Summary</w:t></w:r></w:p>
      <w:p><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>Total Expenditure: ${escapeXml(formatAmount(execSummary.totalExpenditure || 0))}</w:t></w:r></w:p>
      <w:p><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>Number of Categories: ${escapeXml(execSummary.numberOfCategories || 0)}</w:t></w:r></w:p>
      <w:p><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>Reporting Period Covered: ${escapeXml(periodLabel)}</w:t></w:r></w:p>
      <w:p><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(narrative)}</w:t></w:r></w:p>

      <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Category Breakdown</w:t></w:r></w:p>
      ${breakdownXml || '<w:p><w:r><w:t>No transactions for this period.</w:t></w:r></w:p>'}

      <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Category Summary Table</w:t></w:r></w:p>
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
        <w:tr>
          <w:tc><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Category</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Total Amount</w:t></w:r></w:p></w:tc>
        </w:tr>
        ${catSummaryRows}
      </w:tbl>

      <w:p><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>Period Summary</w:t></w:r></w:p>
      <w:p><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(periodLabel)} total: ${escapeXml(formatAmount(execSummary.totalExpenditure || 0))}</w:t></w:r></w:p>
    </w:sect>
  </w:body>
</w:wordDocument>`;

    const blob = new Blob([wordXml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `NAPTA_${reportType}_${String(periodLabel).replace(/\s+/g, '_')}.doc`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-slate-100 sm:truncate sm:text-3xl sm:tracking-tight">Report Generator</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Import CSV/Excel and generate Monthly, Quarterly (Q1-Q4), or Yearly reports using the hierarchy: Category → Payee → Individual Transactions.</p>
        </div>
      </div>

      {/* NEW: NAPTA hierarchy report generator */}
      <Card>
        <CardHeader>
          <CardTitle>Generate expenditure report (NAPTA format)</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Upload CSV / Excel</label>
              <input
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="w-full text-sm text-slate-700 dark:text-slate-200 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200 dark:file:bg-slate-800 dark:file:text-slate-200 dark:hover:file:bg-slate-700"
                onChange={(e) => onPickReportFile(e.target.files && e.target.files[0])}
              />
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Required columns: <span className="font-mono">dateOfPayment</span>, <span className="font-mono">category</span>, <span className="font-mono">payeeName</span>, <span className="font-mono">description</span>, <span className="font-mono">amount</span>.
                Optional: <span className="font-mono">paymentMethod</span>, <span className="font-mono">referenceCode</span> (M-Pesa ref), <span className="font-mono">projectName</span>, <span className="font-mono">transactionId</span>.
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button onClick={downloadExpenditureTemplate} className="text-xs font-medium text-slate-700 hover:underline dark:text-slate-200">
                  Download template (CSV for Excel)
                </button>
                <button onClick={downloadExpenditureExample} className="text-xs font-medium text-slate-700 hover:underline dark:text-slate-200">
                  Download example file
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Report type</label>
              <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="w-full px-3 py-2 rounded-lg ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none">
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Period</label>
              {reportType === 'monthly' && (
                <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} className="w-full px-3 py-2 rounded-lg ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none" />
              )}
              {reportType === 'quarterly' && (
                <div className="flex items-center gap-2">
                  <select value={reportQuarter} onChange={(e) => setReportQuarter(e.target.value)} className="w-24 px-3 py-2 rounded-lg ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none">
                    <option value="1">Q1</option>
                    <option value="2">Q2</option>
                    <option value="3">Q3</option>
                    <option value="4">Q4</option>
                  </select>
                  <input type="number" value={reportYear} onChange={(e) => setReportYear(e.target.value)} className="flex-1 px-3 py-2 rounded-lg ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none" />
                </div>
              )}
              {reportType === 'yearly' && (
                <input type="number" value={reportYear} onChange={(e) => setReportYear(e.target.value)} className="w-full px-3 py-2 rounded-lg ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none" />
              )}
            </div>

            <div className="md:col-span-5 flex flex-wrap items-center gap-3">
              <button
                onClick={exportHierarchyHTML}
                disabled={periodTx.length === 0}
                className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm disabled:opacity-50 dark:bg-sky-500"
              >
                Export Report (HTML)
              </button>
              <button
                onClick={exportHierarchyPDF}
                disabled={periodTx.length === 0}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
              >
                Export PDF
              </button>
              <button
                onClick={exportHierarchyWord}
                disabled={periodTx.length === 0}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm disabled:opacity-50 dark:bg-indigo-500"
              >
                Export Word
              </button>
              <button
                onClick={() => {
                  // Generate automatic M-Pesa references for missing ones
                  const usedRefs = new Set();
                  const transactionsWithRefs = periodTx.map((t) => {
                    let refCode = t.referenceCode || '';
                    const isMpesa = (t.paymentMethod || '').toUpperCase() === 'MPESA' || 
                                   (t.paymentMethod || '').toUpperCase() === 'M-PESA' ||
                                   !t.paymentMethod; // Default to MPESA if no method specified
                    if (isMpesa && !refCode) {
                      refCode = genReferenceCode(usedRefs);
                      usedRefs.add(refCode);
                    }
                    return {
                      category: t.category || '', // Keep empty if no category
                      payeeName: t.payeeName || '', // Keep empty if no payee
                      expenditure: t.description || '', // Expenditure column (description)
                      amount: t.amount || 0,
                      dateOfPayment: t.dateOfPayment ? t.dateOfPayment.toLocaleDateString() : '',
                      mpesaNumber: t.referenceCode || '', // M-Pesa number (existing reference code)
                    };
                  });
                  
                  // Group by category for organized CSV
                  const groupedByCategory = {};
                  transactionsWithRefs.forEach(t => {
                    const catKey = t.category || ''; // Keep empty if no category
                    if (!groupedByCategory[catKey]) {
                      groupedByCategory[catKey] = [];
                    }
                    groupedByCategory[catKey].push(t);
                  });
                  
                  // Create organized CSV with category groups
                  const organizedRows = [];
                  Object.keys(groupedByCategory).sort().forEach(category => {
                    // Add category header only if category exists and is not empty
                    if (category && category.trim() !== '') {
                      organizedRows.push({
                        category: category,
                        payeeName: '',
                        expenditure: '',
                        amount: '',
                        dateOfPayment: '',
                        mpesaNumber: '',
                      });
                    }
                    // Add transactions for this category
                    groupedByCategory[category].forEach(t => {
                      organizedRows.push(t);
                    });
                    // Add empty row for separation only if there was a category
                    if (category && category.trim() !== '') {
                      organizedRows.push({
                        category: '',
                        payeeName: '',
                        expenditure: '',
                        amount: '',
                        dateOfPayment: '',
                        mpesaNumber: '',
                      });
                    }
                  });
                  
                  downloadCSV('transactions_filtered.csv', organizedRows);
                }}
                disabled={periodTx.length === 0}
                className="text-sm font-medium text-slate-700 hover:underline disabled:opacity-50 dark:text-slate-200"
              >
                Export Filtered CSV
              </button>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Loaded: {reportTx.length} tx • Period: {periodLabel || '-'} • Showing: {periodTx.length}
              </div>
            </div>
          </div>

          {reportErrors.length > 0 && (
            <div className="mt-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 ring-1 ring-rose-200 dark:ring-rose-900/40 p-3">
              <div className="text-sm font-medium text-rose-700 dark:text-rose-200">Import issues</div>
              <ul className="mt-1 text-sm text-rose-700 dark:text-rose-200 list-disc pl-5">
                {reportErrors.map((e, idx) => (<li key={idx}>{e}</li>))}
              </ul>
            </div>
          )}

          {reportWarnings.length > 0 && (
            <div className="mt-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 ring-1 ring-amber-200 dark:ring-amber-900/40 p-3">
              <div className="text-sm font-medium text-amber-800 dark:text-amber-200">Warnings</div>
              <ul className="mt-1 text-sm text-amber-800 dark:text-amber-200 list-disc pl-5">
                {reportWarnings.map((e, idx) => (<li key={idx}>{e}</li>))}
              </ul>
            </div>
          )}

          {periodTx.length > 0 && (
            <div className="mt-5">
              <Card>
                <CardContent className="p-6">
                  <div className="text-sm text-gray-500 dark:text-slate-400 mb-2">Total expenditure</div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-slate-100">{formatAmount(execSummary.totalExpenditure || 0, 'KES')} KSH</div>
                </CardContent>
              </Card>
            </div>
          )}

          {reportPreview.length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Preview (first 25 rows after period filter)</div>
              <div className="mt-3 overflow-x-auto ring-1 ring-slate-200 dark:ring-slate-700 rounded-lg shadow-sm">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Payee</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Description</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Method</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">M-Pesa Ref</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                    {reportPreview.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">{r.dateOfPayment}</td>
                        <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">{r.category}</td>
                        <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">{r.payeeName}</td>
                        <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">{r.description}</td>
                        <td className="px-4 py-3 text-sm text-right whitespace-nowrap font-medium text-slate-900 dark:text-slate-100">{formatAmount(r.amount || 0, 'KES')} KSH</td>
                        <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">{r.paymentMethod}</td>
                        <td className="px-4 py-3 text-sm font-mono text-slate-900 dark:text-slate-100">{r.referenceCode}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Optional: show the hierarchy in-app (collapsible style, not too heavy) */}
          {grouped.length > 0 && (
            <div className="mt-5">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Generated structure (Category → Payee → Transactions)</div>
              <div className="mt-3 space-y-3">
                {grouped.slice(0, 12).map((c) => (
                  <div key={c.categoryName} className="rounded-lg ring-1 ring-slate-200 dark:ring-slate-700 bg-white dark:bg-slate-900 p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{c.categoryName}</div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatAmount(c.categoryTotal || 0, 'KES')} KSH</div>
                    </div>
                    <div className="mt-2 space-y-2">
                      {c.payees.slice(0, 6).map((p) => (
                        <div key={p.payeeName} className="rounded-md bg-slate-50 dark:bg-slate-800/40 p-2">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{p.payeeName}</div>
                            <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{formatAmount(p.subtotal || 0, 'KES')} KSH</div>
                          </div>
                          <div className="mt-2 overflow-x-auto">
                            <table className="min-w-full text-xs">
                              <thead>
                                <tr className="text-slate-500 dark:text-slate-400">
                                  <th className="text-left py-1 pr-3">Date</th>
                                  <th className="text-left py-1 pr-3">Description</th>
                                  <th className="text-right py-1">Amount</th>
                                </tr>
                              </thead>
                              <tbody className="text-slate-800 dark:text-slate-200">
                                {p.transactions.slice(0, 5).map((t) => (
                                  <tr key={t.transactionId}>
                                    <td className="py-1 pr-3 whitespace-nowrap">{t.dateOfPayment ? t.dateOfPayment.toLocaleDateString() : ''}</td>
                                    <td className="py-1 pr-3">{t.description}</td>
                                    <td className="py-1 text-right whitespace-nowrap">{formatAmount(t.amount || 0, 'KES')} KSH</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                      {(c.payees.length > 6) && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">Showing top 6 payees (by subtotal) for performance.</div>
                      )}
                    </div>
                  </div>
                ))}
                {(grouped.length > 12) && (
                  <div className="text-xs text-slate-500 dark:text-slate-400">Showing top 12 categories (by total) for performance. Export HTML to get the full report.</div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">CSV / Excel file</label>
              <input
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="w-full text-sm text-slate-700 dark:text-slate-200 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200 dark:file:bg-slate-800 dark:file:text-slate-200 dark:hover:file:bg-slate-700"
                onChange={(e) => onPickCSV(e.target.files && e.target.files[0])}
              />
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Required columns: date, amount. Optional: category, description, paid_via, mpesa_referral, project</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Supported date formats: DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY</div>
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

          {importWarnings.length > 0 && (
            <div className="mt-4 rounded-lg bg-amber-50 dark:bg-amber-950/40 ring-1 ring-amber-200 dark:ring-amber-900/40 p-3">
              <div className="text-sm font-medium text-amber-700 dark:text-amber-200">Import warnings</div>
              <ul className="mt-1 text-sm text-amber-700 dark:text-amber-200 list-disc pl-5">
                {importWarnings.map((w, idx) => (<li key={idx}>{w}</li>))}
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
                    {importPreview.map((r, idx) => {
                      const hasInvalidData = !r._hasValidDate || !r._hasValidAmount;
                      return (
                        <tr key={idx} className={hasInvalidData ? 'bg-rose-50 dark:bg-rose-950/20' : ''}>
                          <td className={`px-3 py-2 whitespace-nowrap ${!r._hasValidDate ? 'text-rose-600 dark:text-rose-400 font-medium' : 'text-slate-900 dark:text-slate-100'}`}>
                            {r.date ? new Date(r.date).toLocaleDateString() : 'Invalid date'}
                          </td>
                          <td className={`px-3 py-2 text-right whitespace-nowrap ${!r._hasValidAmount ? 'text-rose-600 dark:text-rose-400 font-medium' : 'text-slate-900 dark:text-slate-100'}`}>
                            {r.amount}
                          </td>
                          <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{r.category}</td>
                          <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{r.paidVia}</td>
                          <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{r.mpesaCode}</td>
                          <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{r.description}</td>
                        </tr>
                      );
                    })}
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
                    <td className="px-3 py-2 text-sm text-right whitespace-nowrap text-slate-900 dark:text-slate-100">{formatAmount(r.amount || 0, 'KES')} KSH</td>
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
