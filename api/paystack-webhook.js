
import crypto from 'crypto';
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
  if (secret) {
    const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');
    if (hash !== req.headers['x-paystack-signature']) {
      console.error('Invalid Paystack signature');
      return res.status(401).json({ error: 'Unauthorized: Invalid signature' });
    }
  }

  const event = req.body;

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

  const amountInNaira = amount / 100;

  try {
    const orgRef = db.collection('orgs').doc(orgId);
    await db.runTransaction(async (t) => {
      const orgDoc = await t.get(orgRef);
      if (!orgDoc.exists) {
        throw new Error(`Org with ID ${orgId} not found.`);
      }

      const incomeEntry = {
        id: reference,
        amount: amountInNaira,
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
