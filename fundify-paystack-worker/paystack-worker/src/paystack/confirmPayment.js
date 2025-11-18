export default async function confirmPayment(eventData) {
  const paystackSecretKey = 'YOUR_PAYSTACK_SECRET_KEY'; // Replace with your actual Paystack secret key
  const transactionReference = eventData.data.id;

  const response = await fetch(`https://api.paystack.co/transaction/verify/${transactionReference}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${paystackSecretKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to confirm payment');
  }

  const paymentData = await response.json();

  if (paymentData.status && paymentData.data.status === 'success') {
    return paymentData.data;
  } else {
    throw new Error('Payment not successful');
  }
}