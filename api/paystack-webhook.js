
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const event = req.body;
  if (!event || !event.data) return res.status(400).json({ error: 'Invalid payload' });

  try {
    await db.collection('transactions').add({
      paystackEvent: event,
      createdAt: new Date().toISOString(),
    });
    return res.status(200).json({ status: 'success' });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Failed to save transaction' });
  }
}