import admin from 'firebase-admin';
import axios from 'axios';

function ensureDb() {
  if (!admin.apps.length) {
    const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    try {
      if (base64) {
        const serviceAccount = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      } else {
        const serviceAccount = {
          type: 'service_account',
          project_id: process.env.FIREBASE_PROJECT_ID,
          private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
          private_key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          client_id: process.env.FIREBASE_CLIENT_ID,
          auth_uri: 'https://accounts.google.com/o/oauth2/auth',
          token_uri: 'https://oauth2.googleapis.com/token',
          auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
          client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
        };
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      }
    } catch (e) {
      throw new Error('Firebase Admin init failed: ' + (e?.message || e));
    }
  }
  return admin.firestore();
}

export default async function handler(req, res) {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const orgId = req.body.orgId || req.body.ngoId;
  const name = req.body.business_name || req.body.name;
  const email = req.body.contact_email || req.body.email;
  const bank = req.body.settlement_bank || req.body.bank;
  const accountNumber = req.body.account_number || req.body.accountNumber;
  const currency = req.body.currency || 'NGN';

  if (!orgId || !name || !email || !bank || !accountNumber) {
    return res.status(400).json({ error: 'Missing required fields: orgId, name, email, bank, accountNumber' });
  }

  if (!process.env.PAYSTACK_SECRET_KEY) {
    return res.status(500).json({ error: 'Missing PAYSTACK_SECRET_KEY environment variable' });
  }

  try {
    const db = ensureDb();
    // 1. Create Paystack Subaccount
    const paystackResponse = await axios.post(
      'https://api.paystack.co/subaccount',
      {
        business_name: name,
        settlement_bank: bank,
        account_number: accountNumber,
        percentage_charge: 10,
        currency,
        primary_contact_email: email,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = paystackResponse.data.data || {};
    const subaccount_code = data.subaccount_code;
    if (!subaccount_code) throw new Error('No subaccount_code returned by Paystack');

    // 2. Store Subaccount in Firestore under subaccounts collection
    const sub = {
      org_id: orgId,
      paystack_subaccount_id: subaccount_code,
      business_name: name,
      settlement_bank: bank,
      account_number: accountNumber,
      currency,
      contact_email: email,
      created_at: new Date().toISOString(),
      details: data,
    };
    await db.collection('subaccounts').doc(`${orgId}`).set(sub, { merge: true });

    return res.status(200).json({ success: true, subaccount: sub });
  } catch (error) {
    const msg = error?.response?.data || error?.message || 'Failed to create subaccount';
    console.error('Error creating subaccount:', msg);
    return res.status(500).json({ error: msg });
  }
}