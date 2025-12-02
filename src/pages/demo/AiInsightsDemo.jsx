import AiInsightCard from '../../components/AiInsightCard';

export default function AiInsightsDemo() {
  const incomeMetrics = {
    amount: 12500,
    currency: 'USD',
    periodChangePercent: 8,
    topIncomeSource: 'Donations'
  };
  const expensesMetrics = {
    amount: 8300,
    currency: 'USD',
    periodChangePercent: 12,
    topExpenseCategory: 'Transport'
  };
  const balanceMetrics = {
    amount: 4200,
    currency: 'USD',
    periodChangePercent: -5,
    totalIncome: 12500,
    totalExpenses: 8300
  };

  return (
    <div className="min-h-screen p-6 bg-slate-50">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-xl font-bold text-slate-800">AI Insights Demo</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AiInsightCard title="Income" metrics={incomeMetrics} />
          <AiInsightCard title="Expenses" metrics={expensesMetrics} />
          <AiInsightCard title="Balance" metrics={balanceMetrics} />
        </div>
      </div>
    </div>
  );
}
