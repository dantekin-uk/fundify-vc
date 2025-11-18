#!/usr/bin/env node
/**
 * scripts/sanitize-invites.js
 *
 * Usage:
 *  - Dry run (no writes):
 *      node scripts/sanitize-invites.js
 *  - Apply changes:
 *      node scripts/sanitize-invites.js --apply
 *
 * Requirements:
 *  - Set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON with Firestore access,
 *    or run in an environment where application default credentials are available.
 *
 * What it does:
 *  - Iterates all org docs in the 'orgs' collection and normalizes the 'organization'
 *    field on each invite in the org doc to the org's friendly name when appropriate.
 *  - Updates the top-level 'invites' collection documents (if present) to match.
 *
 * Safety:
 *  - Dry-run by default. Use --apply to perform writes.
 */

const admin = require('firebase-admin');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');

function looksLikeEmail(s) {
  return typeof s === 'string' && s.includes('@');
}
function looksLikeId(s) {
  return typeof s === 'string' && /^[A-Za-z0-9_-]{8,}$/.test(s) && s.length > 8;
}

async function main() {
  try {
    if (!admin.apps.length) {
      // Initialize using Application Default Credentials
      admin.initializeApp();
    }
    const db = admin.firestore();
    console.log('Connected to Firestore');

    const orgsSnap = await db.collection('orgs').get();
    console.log(`Found ${orgsSnap.size} org documents`);

    let totalUpdatedInOrgs = 0;
    let totalUpdatedTopInvites = 0;

    for (const orgDoc of orgsSnap.docs) {
      const orgId = orgDoc.id;
      const data = orgDoc.data() || {};
      const orgName = data.name || null;
      const invites = Array.isArray(data.invites) ? data.invites : [];
      if (!invites.length) continue;

      const nextInvites = invites.map((inv) => {
        if (!inv || typeof inv !== 'object') return inv;
        const curOrgField = inv.organization;
        let newOrgField = curOrgField;

        // If orgName exists and is friendly, prefer it
        if (orgName && typeof orgName === 'string' && orgName.trim().length && !looksLikeEmail(orgName) && !looksLikeId(orgName)) {
          // Replace if current is absent, or looks like an ID or email, or equals the orgId
          if (!curOrgField || looksLikeEmail(curOrgField) || looksLikeId(curOrgField) || String(curOrgField) === orgId) {
            newOrgField = orgName;
          }
        } else {
          // orgName is missing or not friendly; if current is the opaque orgId, clear it to null so UI falls back to friendly name
          if (String(curOrgField) === orgId || looksLikeId(curOrgField)) {
            newOrgField = null;
          }
        }

        const changed = newOrgField !== curOrgField;
        return { ...inv, _changed: changed, _oldOrg: curOrgField, _newOrg: newOrgField };
      });

      const changedItems = nextInvites.filter((i) => i && i._changed);
      if (!changedItems.length) continue;

      console.log(`Org ${orgId}: ${changedItems.length} invite(s) would be updated`);
      changedItems.forEach((it) => console.log(' - invite id:', it.id, 'old:', it._oldOrg, 'new:', it._newOrg));

      if (APPLY) {
        // Strip helper markers and build clean invites
        const cleaned = nextInvites.map((i) => {
          const copy = { ...i };
          delete copy._changed;
          delete copy._oldOrg;
          delete copy._newOrg;
          return copy;
        });
        await db.collection('orgs').doc(orgId).update({ invites: cleaned });
        totalUpdatedInOrgs += cleaned.filter((i, idx) => nextInvites[idx]._changed).length;

        // Also update top-level invites docs if they exist
        for (const inv of cleaned) {
          try {
            if (inv && inv.token) {
              const topRef = db.collection('invites').doc(inv.token);
              const topSnap = await topRef.get();
              if (topSnap.exists) {
                const topData = topSnap.data() || {};
                const topOrgField = topData.organization;
                const desired = inv.organization || orgName || null;
                if (topOrgField !== desired) {
                  await topRef.update({ organization: desired });
                  totalUpdatedTopInvites++;
                }
              }
            }
          } catch (e) {
            console.warn('Failed to update top-level invite for token', inv && inv.token, e.message || e);
          }
        }
      }
    }

    console.log('Done. Dry-run mode:', !APPLY);
    if (APPLY) console.log(`Updated ${totalUpdatedInOrgs} invites in org docs and ${totalUpdatedTopInvites} top-level invite docs.`);
    else console.log('Run with --apply to persist changes');
    process.exit(0);
  } catch (e) {
    console.error('Sanitizer failed', e);
    process.exit(2);
  }
}

main();
