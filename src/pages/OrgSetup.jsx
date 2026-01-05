import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import { Building2, FileText, DollarSign, Calendar, TrendingUp } from 'lucide-react';

// Fiscal year end options (common for NGOs)
const fiscalYearEnds = [
  { value: '12-31', label: 'December 31' },
  { value: '06-30', label: 'June 30' },
  { value: '03-31', label: 'March 31' },
  { value: '09-30', label: 'September 30' },
];

// Primary funding models
const fundingModels = [
  { value: 'grant_dependent', label: 'Grant Dependent', description: 'Primarily funded through grants and donor contributions' },
  { value: 'self_sustaining', label: 'Self-Sustaining Projects', description: 'Revenue-generating programs and social enterprises' },
  { value: 'hybrid', label: 'Hybrid', description: 'Mix of grants and self-generated revenue' },
];

// Currencies (prioritizing African markets)
const currencies = [
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'GHS', symbol: '₵', name: 'Ghanaian Cedi' },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling' },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling' },
  { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr' },
  { code: 'RWF', symbol: 'RF', name: 'Rwandan Franc' },
];

export default function OrgSetup() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    legalName: user?.name || '',
    currency: user?.orgSettings?.currency || 'KES',
    fiscalYearEnd: '12-31',
    fundingModel: 'grant_dependent',
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.legalName.trim()) {
      newErrors.legalName = 'Organization legal name is required';
    } else if (formData.legalName.trim().length < 3) {
      newErrors.legalName = 'Organization name must be at least 3 characters';
    }

    if (!formData.currency) {
      newErrors.currency = 'Base reporting currency is required';
    }

    if (!formData.fiscalYearEnd) {
      newErrors.fiscalYearEnd = 'Fiscal year end is required';
    }

    if (!formData.fundingModel) {
      newErrors.fundingModel = 'Primary funding model is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    setSaving(true);
    try {
      // Parse fiscal year end
      const [month, day] = formData.fiscalYearEnd.split('-');
      const fiscalYearStartMonth = month === '12' ? 1 : parseInt(month) + 1;

      await updateUser({
        name: formData.legalName.trim(),
        orgSettings: {
          currency: formData.currency,
          fiscalYearStartMonth: fiscalYearStartMonth,
          fiscalYearEnd: formData.fiscalYearEnd,
        },
        fundingModel: formData.fundingModel,
        hasCompletedSetup: true,
        isNewUser: false, // User has completed onboarding setup
        setupCompletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Navigate to dashboard with demo mode initialized
      navigate('/app/dashboard/overview');
    } catch (e) {
      console.error('Setup save error:', e);
      setErrors({ submit: 'Failed to initialize workspace. Please check your connection and try again.' });
    } finally {
      setSaving(false);
    }
  };

  const selectedCurrency = currencies.find(c => c.code === formData.currency);
  const selectedFundingModel = fundingModels.find(m => m.value === formData.fundingModel);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-30 dark:opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }} />
      </div>
      
      <div className="relative w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 dark:bg-slate-800 mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Initialize Organization Ledger
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Configure your financial management workspace
          </p>
        </div>

        {/* Main Form Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* Error Message */}
            {errors.submit && (
              <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded">
                <p className="text-sm text-red-700 dark:text-red-300">{errors.submit}</p>
              </div>
            )}

            {/* Organization Legal Name */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                <FileText className="w-4 h-4" />
                Organization Legal Name
              </label>
              <input
                type="text"
                value={formData.legalName}
                onChange={(e) => handleChange('legalName', e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.legalName 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-slate-300 dark:border-slate-700 focus:border-slate-900 dark:focus:border-slate-500'
                } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 transition-colors`}
                placeholder="e.g., Community Development Initiative"
                autoFocus
              />
              {errors.legalName && (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.legalName}</p>
              )}
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                This is the official name that will appear on all financial reports and compliance documents.
              </p>
            </div>

            {/* Base Reporting Currency */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                <DollarSign className="w-4 h-4" />
                Base Reporting Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.currency 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-slate-300 dark:border-slate-700 focus:border-slate-900 dark:focus:border-slate-500'
                } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 transition-colors`}
              >
                {currencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} ({currency.symbol}) - {currency.name}
                  </option>
                ))}
              </select>
              {errors.currency && (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.currency}</p>
              )}
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                This currency will be used for all Board Reports and financial statements. Multi-currency support can be configured later.
              </p>
            </div>

            {/* Fiscal Year End */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                <Calendar className="w-4 h-4" />
                Fiscal Year End
              </label>
              <select
                value={formData.fiscalYearEnd}
                onChange={(e) => handleChange('fiscalYearEnd', e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.fiscalYearEnd 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-slate-300 dark:border-slate-700 focus:border-slate-900 dark:focus:border-slate-500'
                } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 transition-colors`}
              >
                {fiscalYearEnds.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.fiscalYearEnd && (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.fiscalYearEnd}</p>
              )}
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                Select when your organization's fiscal year ends. This determines reporting periods and budget cycles.
              </p>
            </div>

            {/* Primary Funding Model */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                <TrendingUp className="w-4 h-4" />
                Primary Funding Model
              </label>
              <div className="space-y-3">
                {fundingModels.map((model) => (
                  <label
                    key={model.value}
                    className={`relative flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.fundingModel === model.value
                        ? 'border-slate-900 dark:border-slate-500 bg-slate-50 dark:bg-slate-800/50'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="fundingModel"
                      value={model.value}
                      checked={formData.fundingModel === model.value}
                      onChange={(e) => handleChange('fundingModel', e.target.value)}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-slate-900 dark:text-slate-100 mb-1">
                        {model.label}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {model.description}
                      </div>
                    </div>
                    <div className={`ml-4 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      formData.fundingModel === model.value
                        ? 'border-slate-900 dark:border-slate-500'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {formData.fundingModel === model.value && (
                        <div className="w-3 h-3 rounded-full bg-slate-900 dark:bg-slate-500" />
                      )}
                    </div>
                  </label>
                ))}
              </div>
              {errors.fundingModel && (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.fundingModel}</p>
              )}
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                This helps us configure default workflows and reporting templates for your organization type.
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <Button
                type="submit"
                disabled={saving}
                className="w-full justify-center py-3 text-base font-semibold"
                variant="primary"
              >
                {saving ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Initializing Workspace...
                  </>
                ) : (
                  <>
                    Initialize Workspace
                    <Building2 className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Footer Note */}
        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          You can configure additional settings, funding sources, and projects after initialization.
        </p>
      </div>
    </div>
  );
}
