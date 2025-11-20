const admin = require('firebase-admin');
const axios = require('axios');

const serviceAccount = {
  "type": "service_account",
  "project_id": process.env.FIREBASE_PROJECT_ID,
  "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
  "private_key": process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  "client_email": process.env.FIREBASE_CLIENT_EMAIL,
  "client_id": process.env.FIREBASE_CLIENT_ID,
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": process.env.FIREBASE_CLIENT_X509_CERT_URL
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { orgId, business_name, settlement_bank, account_number, currency, contact_email } = req.body;

  if (!orgId || !business_name || !settlement_bank || !account_number || !currency || !contact_email) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const paystackResponse = await axios.post('https://api.paystack.co/subaccount', {
      business_name,
      settlement_bank,
      account_number,
      percentage_charge: 0,
      primary_contact_email: contact_email,
      currency
    }, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
      }
    });

    const subaccountData = {
      org_id: orgId,
      paystack_subaccount_id: paystackResponse.data.data.subaccount_code,
      business_name,
      settlement_bank,
      account_number,
      currency,
      contact_email,
      created_at: new Date().toISOString()
    };

    await db.collection('subaccounts').add(subaccountData);

    res.status(200).json({ subaccount: subaccountData });
  } catch (error) {
    res.status(500).json({ message: error.response?.data?.message || error.message });
  }
}
