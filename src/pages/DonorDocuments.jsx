import React from 'react';

export default function DonorDocuments() {
  const reports = [
    { id: 'monthly', name: 'Monthly Report (PDF)' },
    { id: 'project', name: 'Project Report (Excel)' },
    { id: 'annual', name: 'Annual Impact Report (PDF)' }
  ];

  const generate = (id) => {
    // Placeholder for generation
    alert(`Generating ${id} report... (placeholder)`);
  };

  return (
    <div className="space-y-4 p-6">
      <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Documents & Reports</h2>
      <div className="bg-white dark:bg-slate-800 rounded-xl ring-1 ring-slate-200 dark:ring-slate-700 p-5">
        <ul className="space-y-3">
          {reports.map(r => (
            <li key={r.id} className="flex items-center justify-between">
              <div className="text-sm text-slate-800 dark:text-slate-200">{r.name}</div>
              <button onClick={()=>generate(r.id)} className="px-3 py-1.5 text-xs rounded bg-sky-600 text-white">Generate Report</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
