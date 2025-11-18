export default async function saveTransaction(transactionData) {
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/YOUR_PROJECT_ID/databases/(default)/documents/transactions`;

  const response = await fetch(firestoreUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer YOUR_FIRESTORE_API_KEY`,
    },
    body: JSON.stringify({
      fields: {
        id: { stringValue: transactionData.id },
        amount: { integerValue: transactionData.amount },
        status: { stringValue: transactionData.status },
        createdAt: { timestampValue: transactionData.createdAt },
        updatedAt: { timestampValue: transactionData.updatedAt },
      },
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to save transaction to Firestore');
  }

  return await response.json();
}