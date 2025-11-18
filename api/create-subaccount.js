import { NextApiRequest, NextApiResponse } from 'next';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import axios from 'axios';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { orgId, business_name, settlement_bank, account_number, currency, contact_email } = req.body;
  if (!orgId || !business_name || !settlement_bank || !account_number || !currency || !contact_email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Create Paystack subaccount
  try {
    const paystackRes = await axios.post('https://api.paystack.co/subaccount', {
      business_name,
      settlement_bank,
      account_number,
      currency,
      contact_email
    }, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    const subaccount = paystackRes.data.data;

    // Save subaccount to Firestore
    await db.collection('organizations').doc(orgId).set({
      subaccount,
      createdAt: new Date().toISOString(),
    }, { merge: true });

    return res.status(200).json({ subaccount });
  } catch (error) {
    return res.status(500).json({ error: error?.response?.data?.message || 'Failed to create subaccount' });
  }
}
