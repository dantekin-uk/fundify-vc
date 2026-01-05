import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Marks an organization as having real data, which disables demo mode
 * Call this function whenever a user adds real data (funder, income, expense, project)
 */
export const markAsRealData = async (orgId) => {
  if (!orgId) return;
  
  try {
    const orgRef = doc(db, 'orgs', orgId);
    await updateDoc(orgRef, {
      hasRealData: true,
      isDemoMode: false,
      demoInitializedAt: null,
    });
    console.log('Organization marked as having real data');
  } catch (error) {
    console.error('Failed to mark as real data:', error);
  }
};

/**
 * Checks if an organization should show demo banner
 * Returns true if it's a new organization with demo data that hasn't been marked as real
 */
export const shouldShowDemoBanner = (org, user) => {
  if (!org) return false;
  
  const isTrulyNewOrg = !org.demoInitializedAt && !org.hasRealData;
  const hasDemoMode = org.isDemoMode === true;
  
  // Show demo banner if this is a truly new organization that just got demo data
  // OR if the user hasn't completed setup yet
  return hasDemoMode && (isTrulyNewOrg || !user?.hasCompletedSetup);
};
