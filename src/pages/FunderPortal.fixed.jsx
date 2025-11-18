import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { useOrg } from '../context/OrgContext';
import { formatAmount } from '../utils/format';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
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

export default function FunderPortal() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { byFunder, funders = [], projects = [] } = useFinance();
  const { currency } = useOrg();
  
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
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
  
  const handleSubmitInvite = (e) => {
    e.preventDefault();
    // TODO: Implement invite logic
    console.log('Invite data:', formData);
    // Show success toast
    setShowInviteForm(false);
    // Reset form
    setFormData({
      name: '',
      email: '',
      projectId: '',
      role: 'viewer',
      message: ''
    });
  };
  
  // Filter funders based on search query
  const filteredFunders = useMemo(() => {
    return funders.filter(funder => 
      funder.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (funder.email && funder.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [funders, searchQuery]);
  
  // If viewing a specific funder's details
  if (id) {
    const funder = funders.find(f => f.id === id);
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
        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                  {funder.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{funder.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{funder.email}</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                    funder.status === 'active' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}>
                    {funder.status || 'pending'}
                  </span>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline">
                  <Mail className="h-4 w-4 mr-2" />
                  Message
                </Button>
                <Button>
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8">
                <button className="border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 whitespace-nowrap py-4 px-1 text-sm font-medium">
                  Overview
                </button>
                <button className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
                  Transactions
                </button>
                <button className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
                  Reports
                </button>
              </nav>
            </div>
            
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
                      {funder.createdAt?.toDate ? new Date(funder.createdAt.toDate()).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Contributed</p>
                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                      {formatAmount(byFunder?.find(f => f.funder?.id === funder.id)?.income || 0, currency)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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
            Manage all your funders, their linked projects, and insights in one place.
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

      {/* Invite Funder Form */}
      {showInviteForm && (
        <Card className="mb-6 overflow-hidden transition-all duration-300">
          <CardHeader className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Invite New Funder</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Send an invitation to a new funder to join your organization.
            </p>
          </CardHeader>
          <form onSubmit={handleSubmitInvite}>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Funder Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="john@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="projectId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Assign Project
                  </label>
                  <select
                    id="projectId"
                    name="projectId"
                    value={formData.projectId}
                    onChange={handleInputChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  >
                    <option value="">Select a project (optional)</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Role
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="contributor">Contributor</option>
                  </select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Custom Message (optional)
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={3}
                    value={formData.message}
                    onChange={handleInputChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    placeholder="Add a personal message to include in the invitation email."
                  />
                </div>
              </div>
            </CardContent>
            <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800 text-right border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowInviteForm(false)}
                className="mr-2"
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                <Send className="h-4 w-4 mr-2" />
                Send Invitation
              </Button>
            </div>
          </form>
        </Card>
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
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
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
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Projects
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center space-x-1">
                    <span>Total Funded</span>
                    <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {filteredFunders.length > 0 ? (
                filteredFunders.map((funder) => (
                  <tr key={funder.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium flex-shrink-0">
                          {funder.name?.charAt(0)?.toUpperCase() || 'F'}
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
                        {projects.filter(p => p.funderId === funder.id).length}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatAmount(byFunder?.find(f => f.funder?.id === funder.id)?.income || 0, currency)}
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
                        {searchQuery ? 'Try a different search term' : 'Get started by inviting a new funder.'}
                      </p>
                      {!searchQuery && (
                        <Button 
                          onClick={() => setShowInviteForm(true)}
                          className="mt-2"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Invite Funder
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredFunders.length > 0 && (
          <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing <span className="font-medium">1</span> to <span className="font-medium">{filteredFunders.length}</span> of{' '}
              <span className="font-medium">{filteredFunders.length}</span> results
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
