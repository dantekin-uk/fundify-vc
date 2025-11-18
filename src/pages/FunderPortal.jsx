import { useState, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { useOrg } from '../context/OrgContext';
import { useAuth } from '../context/AuthContext';
import { formatAmount } from '../utils/format';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { 
  UserPlus, 
  Users, 
  CheckCircle, 
  Link2, 
  Clock, 
  Search, 
  Filter, 
  ChevronDown, 
  MoreHorizontal, 
  Download, 
  Mail, 
  Send,
  ArrowUpDown 
} from 'lucide-react';
import { Input } from '../components/ui/Input';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function FunderPortal() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { byFunder, funders, projects, inviteFunder, incomes, expenses } = useFinance();
  const { currency } = useOrg();
  const { user } = useAuth();

  // State for funder details view
  const [activeTab, setActiveTab] = useState('overview');
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageForm, setMessageForm] = useState({ subject: '', message: '' });

  // Parse possible invite params to preserve token/org info when redirecting unauthenticated users
  const query = new URLSearchParams(location.search);
  const inviteOrgId = query.get('orgId');
  const inviteToken = query.get('token');
  const inviteEmail = query.get('email');
  const inviteName = query.get('name');
  let redirectPath = '/app/funders/portal/me';
  const redirectParams = new URLSearchParams();
  if (inviteOrgId) redirectParams.set('orgId', inviteOrgId);
  if (inviteToken) redirectParams.set('token', inviteToken);
  if ([...redirectParams].length) redirectPath += `?${redirectParams.toString()}`;

  // Build auth links preserving invite info and redirect
  const registerUrl = `/register?redirect=${encodeURIComponent(redirectPath)}${inviteOrgId ? `&orgId=${encodeURIComponent(inviteOrgId)}` : ''}${inviteToken ? `&token=${encodeURIComponent(inviteToken)}` : ''}${inviteEmail ? `&email=${encodeURIComponent(inviteEmail)}` : ''}${inviteName ? `&name=${encodeURIComponent(inviteName)}` : ''}`;
  const loginUrl = `/login?redirect=${encodeURIComponent(redirectPath)}`;

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [toast, setToast] = useState(null);
  
  // Stats data
  const stats = [
    { label: 'Total Funders', value: funders.length, icon: <Users className="h-5 w-5 text-blue-500" /> },
    { label: 'Active Funders', value: funders.filter(f => f.status === 'active').length, icon: <CheckCircle className="h-5 w-5 text-green-500" /> },
    { label: 'Linked Projects', value: new Set(projects.map(p => p.funderId)).size, icon: <Link2 className="h-5 w-5 text-purple-500" /> },
    { label: 'Pending Invites', value: 0, icon: <Clock className="h-5 w-5 text-amber-500" /> },
  ];
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    projectId: '',
    role: 'viewer',
    message: ''
  });
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmitInvite = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      setToast({ type: 'error', text: 'Name and email are required' });
      setTimeout(() => setToast(null), 2500);
      return;
    }
    if (funders.some(f => (f.email || '').toLowerCase() === formData.email.trim().toLowerCase())) {
      setToast({ type: 'warning', text: 'Email already invited' });
      setTimeout(() => setToast(null), 2500);
      return;
    }
    try {
      const invite = await inviteFunder({
        name: formData.name.trim(),
        email: formData.email.trim(),
        projectId: formData.projectId || null,
        role: formData.role || 'funder',
        message: formData.message || ''
      });
      setToast({ type: 'success', text: `Invite sent to ${formData.email}` });
      setTimeout(() => setToast(null), 2500);
      setShowInviteForm(false);
      setFormData({ name: '', email: '', projectId: '', role: 'viewer', message: '' });
    } catch (err) {
      console.error('Invite failed', err);
      setToast({ type: 'error', text: err?.message || 'Failed to send invitation' });
      setTimeout(() => setToast(null), 2500);
    }
  };

  const handleExportData = (funder) => {
    try {
      const funderData = byFunder.find(f => f.funder.id === funder.id);
      const funderIncomes = incomes.filter(i => {
        const proj = projects.find(p => p.id === i.projectId);
        const walletId = i.walletId || (proj ? proj.funderId : null);
        return walletId === funder.id;
      });
      const funderExpenses = expenses.filter(e => {
        const proj = projects.find(p => p.id === e.projectId);
        const walletId = e.walletId || (proj ? proj.funderId : null);
        return walletId === funder.id;
      });

      const exportData = {
        funderInfo: {
          name: funder.name,
          email: funder.email,
          status: funder.status,
          createdAt: funder.createdAt,
          totalContributed: funderData?.income || 0,
          totalExpenses: funderData?.expenses || 0,
          available: funderData?.available || 0
        },
        incomes: funderIncomes.map(i => ({
          date: i.date,
          amount: i.amount,
          projectId: i.projectId,
          description: i.description,
          status: i.status
        })),
        expenses: funderExpenses.map(e => ({
          date: e.date,
          amount: e.amount,
          projectId: e.projectId,
          description: e.description,
          status: e.status
        }))
      };

      const csv = [
        ['Funder Data Export'],
        ['Generated:', new Date().toISOString()],
        [],
        ['Funder Information'],
        ['Name', funder.name],
        ['Email', funder.email],
        ['Status', funder.status],
        ['Joined Date', funder.createdAt],
        ['Total Contributed', funderData?.income || 0],
        ['Total Expenses', funderData?.expenses || 0],
        ['Available', funderData?.available || 0],
        [],
        ['Incomes'],
        ['Date', 'Amount', 'Project', 'Description', 'Status'],
        ...funderIncomes.map(i => [i.date, i.amount, i.projectId, i.description, i.status]),
        [],
        ['Expenses'],
        ['Date', 'Amount', 'Project', 'Description', 'Status'],
        ...funderExpenses.map(e => [e.date, e.amount, e.projectId, e.description, e.status])
      ]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${funder.name}-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setToast({ type: 'success', text: 'Data exported successfully' });
      setTimeout(() => setToast(null), 2500);
    } catch (err) {
      console.error('Export failed', err);
      setToast({ type: 'error', text: 'Failed to export data' });
      setTimeout(() => setToast(null), 2500);
    }
  };

  const handleSendMessage = async (e, funder) => {
    e.preventDefault();
    if (!messageForm.subject.trim() || !messageForm.message.trim()) {
      setToast({ type: 'error', text: 'Subject and message are required' });
      setTimeout(() => setToast(null), 2500);
      return;
    }

    try {
      setToast({ type: 'success', text: `Message sent to ${funder.name}` });
      setTimeout(() => setToast(null), 2500);
      setShowMessageModal(false);
      setMessageForm({ subject: '', message: '' });
    } catch (err) {
      console.error('Message failed', err);
      setToast({ type: 'error', text: 'Failed to send message' });
      setTimeout(() => setToast(null), 2500);
    }
  };
  
  // Filter funders based on search query and status
  const filteredFunders = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return funders.filter(funder => {
      const matchesQuery = (funder.name || '').toLowerCase().includes(q) || (funder.email || '').toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' ? true : ((funder.status || 'pending') === statusFilter);
      return matchesQuery && matchesStatus;
    });
  }, [funders, searchQuery, statusFilter]);

  const totalResults = filteredFunders.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const pagedFunders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredFunders.slice(start, start + pageSize);
  }, [filteredFunders, page]);
  
  // If viewing a specific funder's details
  if (id) {
    let funder;
    if (id === 'me') {
      funder = funders.find(f => f.id === user?.id) || funders.find(f => (f.email || '').toLowerCase() === (user?.email || '').toLowerCase());
      if (!user) {
        return (
          <div className="p-6">
            <h3 className="text-lg font-medium">Please sign in to view your funder portal</h3>
            <p className="mt-2 text-sm text-gray-600">Sign in or create an account to access your portal and join your organization's funder portal.</p>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => navigate(loginUrl)}>Sign in</Button>
              <Button variant="outline" onClick={() => navigate(registerUrl)}>Create account</Button>
            </div>
          </div>
        );
      }
    } else {
      funder = funders.find(f => f.id === id);
    }

    if (!funder) return <div>Funder not found</div>;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Funder Details</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">View and manage {funder.name}'s information</p>
          </div>
          <Button onClick={() => navigate('/app/funders/portal')} variant="outline">
            Back to Funders
          </Button>
        </div>

        {/* Funder details content */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                  {funder.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{funder.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{funder.email}</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                    funder.status === 'active'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}>
                    {funder.status}
                  </span>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setShowMessageModal(true)}>
                  <Mail className="h-4 w-4 mr-2" />
                  Message
                </Button>
                <Button onClick={() => handleExportData(funder)}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`${activeTab === 'overview' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('transactions')}
                  className={`${activeTab === 'transactions' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                  Transactions
                </button>
                <button
                  onClick={() => setActiveTab('reports')}
                  className={`${activeTab === 'reports' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                  Reports
                </button>
              </nav>
            </div>

            {/* Overview Tab Content */}
            {activeTab === 'overview' && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Funder Information</h3>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">{funder.email || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white capitalize">{funder.status || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Joined Date</p>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        {new Date(funder.createdAt?.toDate?.() || new Date()).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total Contributed</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                        {formatAmount(byFunder.find(f => f.funder.id === funder.id)?.income || 0, currency)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Transactions Tab Content */}
            {activeTab === 'transactions' && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Transactions</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Project</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {(() => {
                        const funderIncomes = incomes.filter(i => {
                          const proj = projects.find(p => p.id === i.projectId);
                          const walletId = i.walletId || (proj ? proj.funderId : null);
                          return walletId === funder.id;
                        });
                        const funderExpenses = expenses.filter(e => {
                          const proj = projects.find(p => p.id === e.projectId);
                          const walletId = e.walletId || (proj ? proj.funderId : null);
                          return walletId === funder.id;
                        });
                        const allTx = [
                          ...funderIncomes.map(i => ({ ...i, type: 'income', sign: 1 })),
                          ...funderExpenses.map(e => ({ ...e, type: 'expense', sign: -1 }))
                        ].sort((a, b) => new Date(b.date) - new Date(a.date));

                        return allTx.length > 0 ? (
                          allTx.map((tx, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {new Date(tx.date).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  tx.type === 'income'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                }`}>
                                  {tx.type}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                {tx.sign > 0 ? '+' : '-'}{formatAmount(Math.abs(tx.amount), currency)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {projects.find(p => p.id === tx.projectId)?.name || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  tx.status === 'posted'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                }`}>
                                  {tx.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                              No transactions found
                            </td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Reports Tab Content */}
            {activeTab === 'reports' && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Reports</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(() => {
                    const funderData = byFunder.find(f => f.funder.id === funder.id);
                    const funderIncomes = incomes.filter(i => {
                      const proj = projects.find(p => p.id === i.projectId);
                      const walletId = i.walletId || (proj ? proj.funderId : null);
                      return walletId === funder.id;
                    });
                    const funderExpenses = expenses.filter(e => {
                      const proj = projects.find(p => p.id === e.projectId);
                      const walletId = e.walletId || (proj ? proj.funderId : null);
                      return walletId === funder.id;
                    });

                    return (
                      <>
                        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/40 p-6 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-400">Total Contributed</p>
                          <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                            {formatAmount(funderData?.income || 0, currency)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">{funderIncomes.length} transactions</p>
                        </div>
                        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/40 p-6 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-400">Total Expenses</p>
                          <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
                            {formatAmount(funderData?.expenses || 0, currency)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">{funderExpenses.length} transactions</p>
                        </div>
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/40 p-6 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-400">Available Balance</p>
                          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                            {formatAmount(funderData?.available || 0, currency)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Remaining funds</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message Modal */}
        {showMessageModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowMessageModal(false)} />
            <div className="relative w-full max-w-lg bg-white/95 backdrop-blur rounded-2xl border border-slate-200 shadow-xl p-6 dark:bg-slate-900/90 dark:border-slate-700 dark:text-slate-100">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Send Message to {funder.name}</h3>
              <form onSubmit={(e) => handleSendMessage(e, funder)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subject</label>
                  <Input
                    type="text"
                    value={messageForm.subject}
                    onChange={(e) => setMessageForm({...messageForm, subject: e.target.value})}
                    placeholder="Message subject"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Message</label>
                  <textarea
                    rows="5"
                    value={messageForm.message}
                    onChange={(e) => setMessageForm({...messageForm, message: e.target.value})}
                    placeholder="Your message..."
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white p-2 border"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowMessageModal(false)}>Cancel</Button>
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700"><Send className="h-4 w-4 mr-2" />Send</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Main Funders Portal View (when no specific funder ID is selected)
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight dark:text-white">
            Funders Portal
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage and monitor your organization’s funders. Invite new funders and view their contribution activity.
          </p>
        </div>
        <Button 
          onClick={() => setShowInviteForm(!showInviteForm)} 
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Funder
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="hover:shadow-lg transition-shadow duration-200 hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  {stat.icon}
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Invite Funder Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowInviteForm(false)} />
          <div className="relative w-full max-w-2xl bg-white/95 backdrop-blur rounded-2xl border border-slate-200 shadow-xl p-6 dark:bg-slate-900/90 dark:border-slate-700 dark:text-slate-100">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Invite New Funder</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Send an invitation to a new funder to join your organization.</p>
            </div>
            <form onSubmit={handleSubmitInvite} className="space-y-4">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Funder Name <span className="text-red-500">*</span></label>
                  <Input id="name" name="name" type="text" required value={formData.name} onChange={handleInputChange} placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address <span className="text-red-500">*</span></label>
                  <Input id="email" name="email" type="email" required value={formData.email} onChange={handleInputChange} placeholder="john@example.com" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="projectId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Assign Project</label>
                  <select id="projectId" name="projectId" value={formData.projectId} onChange={handleInputChange} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                    <option value="">Select a project (optional)</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                  <select id="role" name="role" value={formData.role} onChange={handleInputChange} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                    <option value="viewer">Viewer</option>
                    <option value="contributor">Contributor</option>
                  </select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Custom Message (optional)</label>
                  <textarea id="message" name="message" rows={3} value={formData.message} onChange={handleInputChange} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white" placeholder="Add a personal message to include in the invitation email." />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowInviteForm(false)}>Cancel</Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700"><Send className="h-4 w-4 mr-2" />Send Invitation</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Funders List */}
      <Card>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div className="relative w-full md:max-w-xs">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder="Search funders..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <select value={statusFilter} onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }} className="rounded-md border-gray-300 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center space-x-1">
                    <span>Funder</span>
                    <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Organization</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Projects</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center space-x-1">
                    <span>Total Funded</span>
                    <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Activity</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {pagedFunders.length > 0 ? (
                pagedFunders.map((funder) => (
                  <tr key={funder.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium flex-shrink-0">
                          {funder.name ? funder.name.charAt(0).toUpperCase() : 'F'}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {funder.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {funder.email || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {funder.organization || '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {projects.filter(p => p.funderId === funder.id).length}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatAmount(byFunder.find(f => f.funder.id === funder.id)?.income || 0, currency)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        funder.status === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}>
                        {funder.status || 'pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {(() => {
                          try {
                            const ds = (incomes || [])
                              .filter(i => {
                                const proj = projects.find(p => p.id === i.projectId);
                                const walletId = i.walletId || (proj ? proj.funderId : null);
                                return walletId === funder.id;
                              })
                              .map(i => new Date(i.date).getTime());
                            if (!ds.length) return '—';
                            return new Date(Math.max(...ds)).toLocaleDateString();
                          } catch { return '—'; }
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/app/funders/portal/${funder.id}`)}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Users className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">No funders found</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Get started by inviting a new funder.
                      </p>
                      <Button 
                        onClick={() => setShowInviteForm(true)}
                        className="mt-2"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Invite Funder
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalResults > 0 && (
          <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing <span className="font-medium">{(page - 1) * pageSize + 1}</span> to <span className="font-medium">{Math.min(page * pageSize, totalResults)}</span> of{' '}
              <span className="font-medium">{totalResults}</span> results
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Funders by Status</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie dataKey="value" data={[
                  { name: 'Active', value: funders.filter(f => (f.status || 'pending') === 'active').length, color: '#10B981' },
                  { name: 'Pending', value: funders.filter(f => (f.status || 'pending') === 'pending').length, color: '#F59E0B' },
                  { name: 'Suspended', value: funders.filter(f => (f.status || 'pending') === 'suspended').length, color: '#EF4444' },
                ]} cx="50%" cy="50%" outerRadius={70} label>
                  {null}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Monthly Funds Received</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(incomes || []).filter(i => i.status === 'posted').reduce((acc, i) => {
                const d = new Date(i.date);
                const k = `${d.getFullYear()}-${d.getMonth()+1}`;
                const label = d.toLocaleString(undefined, { month: 'short', year: '2-digit' });
                const ex = acc.find(x => x.k === k);
                if (ex) { ex.amount += i.amount; } else { acc.push({ k, label, amount: i.amount }); }
                return acc;
              }, []).sort((a,b)=> a.k.localeCompare(b.k))}>
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="amount" fill="#14B8A6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {toast && (
        <div className={`fixed right-4 bottom-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white ${toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'warning' ? 'bg-amber-600' : 'bg-rose-600'}`}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
