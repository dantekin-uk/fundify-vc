import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { useOrg } from '../context/OrgContext';

export default function DonorHomeRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { byFunder } = useFinance();
  const { activeOrgId } = useOrg();

  useEffect(() => {
    // Wait until we have user/finance context populated
    if (!user) return;

    // Try to find the funder profile for this user (by email), fall back to first funder row
    const me = byFunder.find(f => f?.funder?.contact === user?.email) || byFunder[0] || null;
    const funderId = me?.funder?.id || user?.id || 'me';

    // Prefer donor dashboard if funderId exists, else funding overview
    const dest = funderId ? `/donor/dashboard/${funderId}` : '/donor/funding';

    // Preserve query params if any
    const search = location.search || '';
    navigate(`${dest}${search}`, { replace: true });
  }, [user, byFunder, activeOrgId]);

  return null;
}
