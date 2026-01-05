// Demo data generator for new organizations
// Creates realistic NGO financial data for demonstration purposes

export function generateDemoData(currency = 'KES') {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  
  // Demo Funders (realistic NGO donors)
  const demoFunders = [
    {
      id: 'demo-usaid',
      name: 'USAID - Education Initiative',
      email: 'contact@usaid.gov',
      type: 'Grant',
      status: 'active',
      createdAt: sixMonthsAgo.toISOString(),
    },
    {
      id: 'demo-gates',
      name: 'Gates Foundation - Health Program',
      email: 'grants@gatesfoundation.org',
      type: 'Grant',
      status: 'active',
      createdAt: sixMonthsAgo.toISOString(),
    },
    {
      id: 'demo-local',
      name: 'Local Community Donations',
      email: 'donations@community.org',
      type: 'Donation',
      status: 'active',
      createdAt: sixMonthsAgo.toISOString(),
    },
  ];

  // Demo Projects
  const demoProjects = [
    {
      id: 'demo-water',
      name: 'Clean Water Initiative',
      funderId: 'demo-usaid',
      budget: 500000,
      startDate: new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split('T')[0],
      endDate: new Date(now.getFullYear() + 1, now.getMonth() - 5, 1).toISOString().split('T')[0],
      createdAt: sixMonthsAgo.toISOString(),
    },
    {
      id: 'demo-school',
      name: 'School Fees Support Program',
      funderId: 'demo-gates',
      budget: 750000,
      startDate: new Date(now.getFullYear(), now.getMonth() - 4, 1).toISOString().split('T')[0],
      endDate: new Date(now.getFullYear() + 1, now.getMonth() - 4, 1).toISOString().split('T')[0],
      createdAt: sixMonthsAgo.toISOString(),
    },
    {
      id: 'demo-youth',
      name: 'Youth Empowerment Program',
      funderId: 'demo-local',
      budget: 300000,
      startDate: new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split('T')[0],
      endDate: new Date(now.getFullYear(), now.getMonth() + 9, 1).toISOString().split('T')[0],
      createdAt: sixMonthsAgo.toISOString(),
    },
  ];

  // Demo Incomes (grant disbursements and donations)
  const demoIncomes = [
    {
      id: 'demo-inc-1',
      projectId: 'demo-water',
      walletId: 'demo-usaid',
      amount: 200000,
      date: new Date(now.getFullYear(), now.getMonth() - 5, 15).toISOString(),
      description: 'Q1 Grant Disbursement - Clean Water Initiative',
      status: 'posted',
      currency: currency,
      fxRate: 1,
      source: 'grant',
      attachments: [],
    },
    {
      id: 'demo-inc-2',
      projectId: 'demo-school',
      walletId: 'demo-gates',
      amount: 300000,
      date: new Date(now.getFullYear(), now.getMonth() - 4, 10).toISOString(),
      description: 'Initial Grant Payment - School Fees Program',
      status: 'posted',
      currency: currency,
      fxRate: 1,
      source: 'grant',
      attachments: [],
    },
    {
      id: 'demo-inc-3',
      walletId: 'demo-local',
      amount: 50000,
      date: new Date(now.getFullYear(), now.getMonth() - 3, 5).toISOString(),
      description: 'Monthly Community Donations',
      status: 'posted',
      currency: currency,
      fxRate: 1,
      source: 'donation',
      attachments: [],
    },
    {
      id: 'demo-inc-4',
      projectId: 'demo-water',
      walletId: 'demo-usaid',
      amount: 150000,
      date: new Date(now.getFullYear(), now.getMonth() - 2, 20).toISOString(),
      description: 'Q2 Grant Disbursement - Clean Water Initiative',
      status: 'posted',
      currency: currency,
      fxRate: 1,
      source: 'grant',
      attachments: [],
    },
    {
      id: 'demo-inc-5',
      projectId: 'demo-youth',
      walletId: 'demo-local',
      amount: 75000,
      date: new Date(now.getFullYear(), now.getMonth() - 1, 12).toISOString(),
      description: 'Community Fundraising Event Proceeds',
      status: 'posted',
      currency: currency,
      fxRate: 1,
      source: 'donation',
      attachments: [],
    },
  ];

  // Demo Expenses (realistic NGO expenses)
  const demoExpenses = [
    {
      id: 'demo-exp-1',
      projectId: 'demo-water',
      walletId: 'demo-usaid',
      amount: 45000,
      date: new Date(now.getFullYear(), now.getMonth() - 5, 25).toISOString(),
      description: 'Water Pump Installation - Materials',
      category: 'Program Costs',
      status: 'posted',
      currency: currency,
      fxRate: 1,
      attachments: [],
    },
    {
      id: 'demo-exp-2',
      projectId: 'demo-school',
      walletId: 'demo-gates',
      amount: 120000,
      date: new Date(now.getFullYear(), now.getMonth() - 4, 15).toISOString(),
      description: 'School Fees Payment - Q1 Beneficiaries',
      category: 'Program Costs',
      status: 'posted',
      currency: currency,
      fxRate: 1,
      attachments: [],
    },
    {
      id: 'demo-exp-3',
      walletId: 'ORG',
      amount: 25000,
      date: new Date(now.getFullYear(), now.getMonth() - 4, 1).toISOString(),
      description: 'Office Rent - March',
      category: 'Administrative',
      status: 'posted',
      currency: currency,
      fxRate: 1,
      attachments: [],
    },
    {
      id: 'demo-exp-4',
      projectId: 'demo-water',
      walletId: 'demo-usaid',
      amount: 35000,
      date: new Date(now.getFullYear(), now.getMonth() - 3, 10).toISOString(),
      description: 'Community Training Workshop',
      category: 'Program Costs',
      status: 'posted',
      currency: currency,
      fxRate: 1,
      attachments: [],
    },
    {
      id: 'demo-exp-5',
      walletId: 'ORG',
      amount: 18000,
      date: new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString(),
      description: 'Staff Salaries - March',
      category: 'Salaries',
      status: 'posted',
      currency: currency,
      fxRate: 1,
      attachments: [],
    },
    {
      id: 'demo-exp-6',
      projectId: 'demo-youth',
      walletId: 'demo-local',
      amount: 28000,
      date: new Date(now.getFullYear(), now.getMonth() - 2, 8).toISOString(),
      description: 'Youth Training Materials',
      category: 'Program Costs',
      status: 'posted',
      currency: currency,
      fxRate: 1,
      attachments: [],
    },
    {
      id: 'demo-exp-7',
      projectId: 'demo-school',
      walletId: 'demo-gates',
      amount: 95000,
      date: new Date(now.getFullYear(), now.getMonth() - 1, 20).toISOString(),
      description: 'School Fees Payment - Q2 Beneficiaries',
      category: 'Program Costs',
      status: 'posted',
      currency: currency,
      fxRate: 1,
      attachments: [],
    },
    {
      id: 'demo-exp-8',
      walletId: 'ORG',
      amount: 22000,
      date: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
      description: 'Office Rent & Utilities - April',
      category: 'Administrative',
      status: 'posted',
      currency: currency,
      fxRate: 1,
      attachments: [],
    },
  ];

  return {
    funders: demoFunders,
    projects: demoProjects,
    incomes: demoIncomes,
    expenses: demoExpenses,
  };
}

// Check if organization is in demo mode (has demo data)
export function isDemoMode(funders = [], projects = [], incomes = [], expenses = []) {
  if (funders.length === 0 && projects.length === 0 && incomes.length === 0 && expenses.length === 0) {
    return false; // Empty, not demo
  }
  
  // Check if all items are demo items (have 'demo-' prefix in IDs)
  const allFundersAreDemo = funders.length > 0 && funders.every(f => f.id?.startsWith('demo-'));
  const allProjectsAreDemo = projects.length > 0 && projects.every(p => p.id?.startsWith('demo-'));
  const allIncomesAreDemo = incomes.length > 0 && incomes.every(i => i.id?.startsWith('demo-'));
  const allExpensesAreDemo = expenses.length > 0 && expenses.every(e => e.id?.startsWith('demo-'));
  
  return allFundersAreDemo && allProjectsAreDemo && allIncomesAreDemo && allExpensesAreDemo;
}

// Check if organization is empty (needs demo data)
export function isEmptyOrganization(funders = [], projects = [], incomes = [], expenses = []) {
  return funders.length === 0 && projects.length === 0 && incomes.length === 0 && expenses.length === 0;
}

