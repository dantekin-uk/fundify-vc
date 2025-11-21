const admin = require('firebase-admin');

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
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { orgId } = req.query;

  if (!orgId) {
    return res.status(400).json({ message: 'orgId is required' });
  }

  try {
    const subaccountRef = db.collection('subaccounts').where('org_id', '==', orgId);
    const snapshot = await subaccountRef.get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'Subaccount not found' });
    }

    const subaccount = snapshot.docs[0].data();
    res.status(200).json({ subaccount });
  } catch (error) {
    res.status(500).json({ message: 'An internal server error occurred.', error: error.message });
  }
}
