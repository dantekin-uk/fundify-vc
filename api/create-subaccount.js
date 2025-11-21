import admin from 'firebase-admin';
import axios from 'axios';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { ngoId, name, email, bank, accountNumber } = req.body;

  if (!ngoId || !name || !email || !bank || !accountNumber) {
    return res.status(400).json({ error: 'Missing required fields: ngoId, name, email, bank, accountNumber' });
  }

  try {
    // 1. Create Paystack Subaccount
    const paystackResponse = await axios.post(
      'https://api.paystack.co/subaccount',
      {
        business_name: name,
        settlement_bank: bank,
        account_number: accountNumber,
        percentage_charge: 10, // Your platform's commission
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const { subaccount_code } = paystackResponse.data.data;

    // 2. Store Subaccount ID in Firestore
    const ngoRef = db.collection('ngos').doc(ngoId);
    await ngoRef.update({
      paystackSubaccountId: subaccount_code,
      bankDetailsSet: true,
    });

    return res.status(200).json({ success: true, subaccountId: subaccount_code });
  } catch (error) {
    console.error('Error creating subaccount:', error.response ? error.response.data : error.message);
    return res.status(500).json({ error: 'Failed to create subaccount' });
  }
}