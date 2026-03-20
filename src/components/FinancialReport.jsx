import { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';

export default function FinancialReport() {
  const [financialFileRows, setFinancialFileRows] = useState([]);
  const [financialTx, setFinancialTx] = useState([]);
  const [financialErrors, setFinancialErrors] = useState([]);
  const [financialWarnings, setFinancialWarnings] = useState([]);
  const [financialPeriodLabel, setFinancialPeriodLabel] = useState('');
  const [financialLogo, setFinancialLogo] = useState(null);

  const handleFinancialLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setFinancialLogo(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const onPickCSV = async (file) => {
    // TODO: Implement CSV parsing logic
  };

  return (
    <div className="mt-8 pt-8 border-t border-gray-200 dark:border-slate-800">
      <Card>
        <CardHeader>
          <CardTitle>Generate Financial Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Organization Logo</label>
              <input type="file" accept="image/*" onChange={handleFinancialLogoUpload} className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Upload Spreadsheet</label>
              <input type="file" accept=".csv, .xlsx, .xls" onChange={(e) => onPickCSV(e.target.files[0])} className="w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
