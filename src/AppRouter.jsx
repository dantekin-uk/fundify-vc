import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useOrg } from './context/OrgContext';
import { ThemeProvider } from './context/ThemeContext';
import { OrgProvider } from './context/OrgContext';
import { FinanceProvider } from './context/FinanceContext';
import { PaymentProvider } from './context/PaymentContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Landing from './pages/Landing';
import Register from './pages/Register';
import Pricing from './pages/Pricing';
import HowItWorks from './pages/HowItWorks';
import ForgotPassword from './pages/ForgotPassword';
import OrgSetup from './pages/OrgSetup';
import Funders from './pages/Funders';
import Income from './pages/Income';
import Projects from './pages/Projects';
import Expenses from './pages/Expenses';
import FirebaseTest from './components/FirebaseTest';
import Approvals from './pages/Approvals';
import Audit from './pages/Audit';
import Reports from './pages/Reports';
import ReportsFunder from './pages/ReportsFunder';
import AddFunder from './pages/AddFunder';
import LoginModal from './components/LoginModal';
import Members from './pages/Members';
import AcceptInvite from './pages/AcceptInvite';
import Settings from './pages/Settings';
import FunderPortal from './pages/FunderPortal';
import FunderPortalOverview from './pages/FunderPortalOverview';
import AdminDashboard from './pages/AdminDashboard';
import DonorDashboard from './pages/DonorDashboard';
import DonorFundingOverview from './pages/DonorFundingOverview';
import DonorTransactions from './pages/DonorTransactions';
import DonorProjects from './pages/DonorProjects';
import DonorProjectDetails from './pages/DonorProjectDetails';
import DonorDocuments from './pages/DonorDocuments';
import DonorSettings from './pages/DonorSettings';
import DonorLayout from './layouts/DonorLayout';
import DonorHomeRedirect from './pages/DonorHomeRedirect';
import DonorPaymentSuccess from './pages/DonorPaymentSuccess';
import DonorPaymentCancel from './pages/DonorPaymentCancel';
import IntegrationPage from './pages/IntegrationPage';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Public Route Component
const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  if (user) {
    // Check if user is primarily a funder (not admin/financial officer in any org)
    return <Navigate to="/app/dashboard/overview" replace />;
  }
  return children;
};

// Funder Redirect Component - detects funder users and redirects to donor portal
const FunderRedirect = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { orgs, loading: orgLoading } = useOrg();

  if (authLoading || orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user) return children;

  // IMPORTANT: Check setup status FIRST - don't redirect funders if they haven't completed setup
  // This prevents new admin accounts from being redirected to donor dashboard before setup
  if (user.hasCompletedSetup === false) {
    return children; // Let RequireSetup handle the redirect to /setup
  }

  // Check if user is a funder in any organization
  // A user is a funder if they're listed in the funders array of an org
  const isFunder = orgs && orgs.length > 0 && orgs.some(org => {
    const funders = Array.isArray(org.funders) ? org.funders : [];
    return funders.some(f => f && f.id === user.id);
  });

  // Also check if user's role in all orgs is 'viewer' (indicating they're an external funder)
  const hasNonViewerRole = orgs && orgs.length > 0 && orgs.some(org => {
    const memberships = Array.isArray(org.memberships) ? org.memberships : [];
    const userMembership = memberships.find(m => m && m.userId === user.id);
    return userMembership && (userMembership.role === 'admin' || userMembership.role === 'financial_officer');
  });

  // Redirect to donor portal if user is a funder but not an admin/finance officer
  // Only redirect if setup is complete
  if (isFunder && !hasNonViewerRole && user.hasCompletedSetup !== false) {
    return <Navigate to="/donor/funding" replace />;
  }

  return children;
};

// Invitation Route Component - allows both authenticated and non-authenticated users
const InvitationRoute = ({ children }) => children;

const RequireSetup = ({ children }) => {
  const { user } = useAuth();
  if (user && user.hasCompletedSetup === false) return <Navigate to="/setup" replace />;
  return children;
};

const RequireAdmin = ({ children }) => {
  const { role } = useOrg();
  if (role !== 'admin') return <Navigate to="/app/dashboard/overview" replace />;
  return children;
};

function AppContent() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const navigate = useNavigate();

  const openLogin = () => { setShowLoginModal(true); navigate('/login'); };
  const closeLogin = () => { setShowLoginModal(false); if (window.location.pathname === '/login') navigate(-1); };

  return (
    <>
      {showLoginModal && <LoginModal onClose={closeLogin} />}
      <Routes>
        {/* Public marketing landing page at root */}
        {/* Temporary route for testing Firebase connection */}
        <Route path="/firebase-test" element={<FirebaseTest />} />
        
        <Route path="/" element={
          <PublicRoute>
            <>
              <FirebaseTest />
              <Landing />
            </>
          </PublicRoute>
        } />
        {/* Optional alias */}
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/invite/:orgId/:token" element={<InvitationRoute><AcceptInvite /></InvitationRoute>} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/forgot" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/how" element={<PublicRoute><HowItWorks /></PublicRoute>} />
        <Route path="/pricing" element={<PublicRoute><Pricing /></PublicRoute>} />
        <Route path="/setup" element={<ProtectedRoute><OrgSetup /></ProtectedRoute>} />

        {/* Protected application area under /app/* (Admin/Org) */}
        {/* RequireSetup must run BEFORE FunderRedirect to prevent redirecting before setup */}
        <Route path="/app/*" element={<ProtectedRoute><RequireSetup><FunderRedirect><Layout /></FunderRedirect></RequireSetup></ProtectedRoute>}>
          <Route index element={<Navigate to="/app/dashboard/overview" replace />} />
          <Route path="dashboard/*" element={<Dashboard />} />
          <Route path="income" element={<Income />} />
          <Route path="funders">
            <Route index element={<Funders />} />
            <Route path="add" element={<AddFunder />} />
          </Route>
          <Route path="projects" element={<Projects />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="approvals" element={<Approvals />} />
          <Route path="accounts" element={<RequireAdmin><Members /></RequireAdmin>} />
          <Route path="members" element={<Navigate to="/app/accounts" replace />} />
          <Route path="audit" element={<Audit />} />
          <Route path="reports" element={<Reports />} />
          <Route path="reports/funder/:id" element={<ReportsFunder />} />
          <Route path="settings" element={<Settings />} />
          <Route path="integration" element={<IntegrationPage orgId={useOrg()?.activeOrgId} />} />
          <Route path="donor-portal" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
          <Route path="funders/portal" element={<FunderPortal />} />
          <Route path="funders/portal/:id" element={<FunderPortal />} />
          <Route path="donor-portal/:id" element={<FunderPortal />} />
          <Route path="*" element={<Navigate to="/app/dashboard/overview" replace />} />
        </Route>

        {/* Protected donor portal under /donor/* (separate layout) */}
        <Route path="/donor/*" element={<ProtectedRoute><DonorLayout /></ProtectedRoute>}>
          <Route index element={<DonorHomeRedirect />} />
          <Route path="dashboard/:id" element={<DonorDashboard />} />
          <Route path="funding" element={<DonorFundingOverview />} />
          <Route path="transactions" element={<DonorTransactions />} />
          <Route path="projects" element={<DonorProjects />} />
          <Route path="projects/:id" element={<DonorProjectDetails />} />
          <Route path="documents" element={<DonorDocuments />} />
          <Route path="settings" element={<DonorSettings />} />
          <Route path="payments/success" element={<DonorPaymentSuccess />} />
          <Route path="payments/cancel" element={<DonorPaymentCancel />} />
        </Route>
      </Routes>
    </>
  );
}

export default function AppRouter() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <OrgProvider>
            <FinanceProvider>
              <PaymentProvider>
                <AppContent />
              </PaymentProvider>
            </FinanceProvider>
          </OrgProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}
