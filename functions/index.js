/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { setGlobalOptions } = require("firebase-functions");
const { onRequest } = require("firebase-functions/https");
const logger = require("firebase-functions/logger");
const admin = require('firebase-admin');
const crypto = require('crypto');
try { admin.apps.length ? admin.app() : admin.initializeApp(); } catch (e) {}

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// Paystack webhook: verify signature, confirm transaction, and record income under org doc
exports.paystackWebhook = onRequest({ maxInstances: 5 }, async (req, res) => {
  if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }
  try {
    // Get secret from environment (Firebase Functions v2 uses different env var access)
    const secret = process.env.PAYSTACK_SECRET_KEY || 
                   (process.env.PAYSTACK && process.env.PAYSTACK_SECRET_KEY) ||
                   '';
    if (!secret) {
      logger.error('Missing PAYSTACK_SECRET_KEY env - set it with: firebase functions:config:set paystack.secret_key="sk_test_..."');
      res.status(500).send('Server not configured');
      return;
    }

    const signature = req.get('x-paystack-signature') || '';
    // Get raw body for signature verification (Paystack signs the raw body)
    // In Firebase Functions v2, we need to get the raw body differently
    let rawBody = req.rawBody;
    if (!rawBody && req.body) {
      // Fallback: reconstruct raw body from parsed body (less secure but works)
      rawBody = JSON.stringify(req.body);
    }
    const expected = crypto.createHmac('sha512', secret).update(rawBody || '').digest('hex');
    if (signature.toLowerCase() !== expected.toLowerCase()) {
      logger.warn('Invalid paystack signature', { received: signature.substring(0, 20), expected: expected.substring(0, 20) });
      res.status(401).send('Invalid signature');
      return;
    }

    const event = req.body || {};
    const type = event?.event || event?.type || '';
    const data = event?.data || {};
    const reference = data?.reference;
    if (!reference) {
      res.status(200).send('No reference');
      return;
    }

    // Verify with Paystack API
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` }
    });
    const verifyJson = await verifyRes.json().catch(() => ({}));
    if (!verifyJson?.status || verifyJson?.data?.status !== 'success') {
      logger.warn('Verification failed or not successful', verifyJson);
      res.status(200).send('Ignored');
      return;
    }

    const v = verifyJson.data;
    const metadata = v?.metadata || {};
    const orgId = metadata.orgId;
    const walletId = metadata.walletId || metadata.funderId || 'ORG';
    const projectId = metadata.projectId || null;
    const amount = (Number(v.amount || 0) / 100) || 0;
    const currency = (v.currency || metadata.currency || 'KES').toUpperCase();
    const description = metadata.description || `Paystack ${v.gateway_response || 'payment'}`;
    if (!orgId) {
      logger.error('Missing orgId in paystack metadata');
      res.status(200).send('Missing orgId');
      return;
    }

    const db = admin.firestore();
    const ref = db.doc(`orgs/${orgId}`);
    const snap = await ref.get();
    if (!snap.exists) {
      logger.error('Org doc not found', orgId);
      res.status(200).send('Org not found');
      return;
    }
    const current = snap.data() || {};
    const incomes = Array.isArray(current.incomes) ? current.incomes : [];
    const income = {
      id: `inc-${Math.random().toString(36).slice(2, 10)}`,
      projectId: projectId || null,
      walletId,
      amount,
      date: new Date().toISOString(),
      description,
      status: 'posted',
      attachments: [],
      currency,
      fxRate: 1,
      source: 'paystack',
      paystack: {
        reference: v.reference,
        id: v.id,
        channel: v.channel,
        paidAt: v.paid_at,
        customer: v.customer?.email || null
      }
    };
    const next = [income, ...incomes];
    await ref.update({ incomes: next });
    logger.info('Recorded income from Paystack', { orgId, walletId, projectId, amount, currency });
    res.status(200).send('ok');
  } catch (e) {
    logger.error('paystackWebhook error', e);
    res.status(500).send('Error');
  }
});
