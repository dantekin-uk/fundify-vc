
import crypto from 'crypto';
import axios from 'axios';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const firebaseConfig = {
  credential: cert(JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8'))),
};

if (!getApps().length) {
  initializeApp(firebaseConfig);
}

const db = getFirestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    console.warn(`Method Not Allowed: ${req.method}`);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  const allowMock = (process.env.ALLOW_PAYMENT_MOCK === 'true') || (process.env.ALLOW_SUBACCOUNT_MOCK === 'true');
  if (!secret && !allowMock) {
    return res.status(500).json({ error: 'Missing PAYSTACK_SECRET_KEY environment variable' });
  }
  let verifiedEvent = null;
  if (secret) {
    const raw = JSON.stringify(req.body);
    const hash = crypto.createHmac('sha512', secret).update(raw).digest('hex');
    const sig = req.headers['x-paystack-signature'];
    if (hash !== sig) {
      try {
        const ref = req.body?.data?.reference;
        if (!ref) throw new Error('Missing reference for verification');
        const resp = await axios.get(`https://api.paystack.co/transaction/verify/${encodeURIComponent(ref)}`, {
          headers: { Authorization: `Bearer ${secret}` }
        });
        if (resp?.data?.status && resp.data?.data?.status === 'success') {
          verifiedEvent = { event: 'charge.success', data: resp.data.data };
        } else {
          console.error('Paystack verify failed or not success', resp?.data);
          return res.status(401).json({ error: 'Unauthorized: Invalid signature' });
        }
      } catch (e) {
        console.error('Signature verify fallback error', e?.message || e);
        return res.status(401).json({ error: 'Unauthorized: Signature check failed' });
      }
    }
  }

  const event = verifiedEvent || req.body;

  if (event.event !== 'charge.success') {
    console.log(`Received non-charge.success event: ${event.event}`);
    return res.status(200).json({ message: 'Event received but not processed' });
  }

  console.log('Processing charge.success event...');

  const { data } = event;
  const { reference, amount, currency, status, metadata } = data;
  const { funderId } = metadata || {};
  const orgId = (metadata && (metadata.orgId || metadata.ngoId)) || null;

  if (!funderId || !orgId) {
    console.error('Missing funderId or orgId in transaction metadata', { reference });
    return res.status(400).json({ error: 'Bad Request: Missing funderId or orgId in metadata' });
  }

  const amountInMajorUnits = amount / 100;

  try {
    const orgRef = db.collection('orgs').doc(orgId);
    await db.runTransaction(async (t) => {
      const orgDoc = await t.get(orgRef);
      if (!orgDoc.exists) {
        throw new Error(`Org with ID ${orgId} not found.`);
      }

      const incomeEntry = {
        id: reference,
        amount: amountInMajorUnits,
        currency,
        status,
        walletId: funderId,
        date: data.paid_at,
        paystack_reference: reference,
        paystack_event: event,
        createdAt: FieldValue.serverTimestamp(),
      };

      const current = orgDoc.data();
      const incomes = Array.isArray(current.incomes) ? current.incomes.slice() : [];
      incomes.push(incomeEntry);
      t.update(orgRef, { incomes });
    });

    console.log(`Successfully processed transaction: ${reference} for Org: ${orgId}`);
    return res.status(200).json({ message: 'Webhook processed successfully' });

  } catch (error) {
    console.error(`Error processing transaction ${reference}:`, error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
