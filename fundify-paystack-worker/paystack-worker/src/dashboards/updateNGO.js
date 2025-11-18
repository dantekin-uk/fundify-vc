export default async function updateNGO(ngoId, transactionData) {
  const response = await fetch(`https://your-firestore-api-endpoint/ngos/${ngoId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer YOUR_FIRESTORE_API_KEY`,
    },
    body: JSON.stringify({
      lastTransaction: transactionData,
      updatedAt: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to update NGO dashboard');
  }

  return await response.json();
}