
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
  const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    console.error('Invalid Paystack signature');
    return res.status(401).json({ error: 'Unauthorized: Invalid signature' });
  }

  const event = req.body;

  if (event.event !== 'charge.success') {
    console.log(`Received non-charge.success event: ${event.event}`);
    return res.status(200).json({ message: 'Event received but not processed' });
  }

  console.log('Processing charge.success event...');

  const { data } = event;
  const { reference, amount, currency, status, metadata } = data;
  const { funderId, ngoId } = metadata || {};

  if (!funderId || !ngoId) {
    console.error('Missing funderId or ngoId in transaction metadata', { reference });
    return res.status(400).json({ error: 'Bad Request: Missing funderId or ngoId in metadata' });
  }

  const amountInNaira = amount / 100;

  try {
    const ngoRef = db.collection('ngos').doc(ngoId);
    const transactionRef = db.collection('transactions').doc(reference);
    const ngoTransactionRef = db.collection('ngos').doc(ngoId).collection('transactions').doc(reference);

    await db.runTransaction(async (t) => {
      const ngoDoc = await t.get(ngoRef);
      if (!ngoDoc.exists) {
        throw new Error(`NGO with ID ${ngoId} not found.`);
      }

      const ngoData = ngoDoc.data();
      const subaccountId = ngoData.paystackSubaccountId || null;

      const transactionData = {
        transactionId: reference,
        amount: amountInNaira,
        currency,
        status,
        funderId,
        ngoId,
        subaccountId,
        paidAt: new Date(data.paid_at),
        createdAt: FieldValue.serverTimestamp(),
      };

      t.set(transactionRef, transactionData);
      t.set(ngoTransactionRef, transactionData);
      t.update(ngoRef, {
        totalFunds: FieldValue.increment(amountInNaira),
      });
    });

    console.log(`Successfully processed transaction: ${reference} for NGO: ${ngoId}`);
    return res.status(200).json({ message: 'Webhook processed successfully' });

  } catch (error) {
    console.error(`Error processing transaction ${reference}:`, error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
