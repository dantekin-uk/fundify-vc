// Test script for Paystack webhook
// This simulates a Paystack webhook event

const crypto = require('crypto');

// Your Paystack secret key (use test key for testing)
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_YOUR_SECRET_KEY';

// Sample webhook payload (charge.success event)
const webhookPayload = {
  event: 'charge.success',
  data: {
    id: 1234567890,
    domain: 'test',
    status: 'success',
    reference: 'DONATION_' + Date.now(),
    amount: 500000, // 5000.00 in kobo
    message: 'Successful',
    gateway_response: 'Successful',
    paid_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    channel: 'card',
    currency: 'NGN',
    ip_address: '127.0.0.1',
    metadata: {
      orgId: 'test-org-id', // Replace with a real org ID from your Firestore
      walletId: 'test-funder-id',
      funderId: 'test-funder-id',
      userId: 'test-user-id',
      email: 'test@example.com',
      name: 'Test Donor',
      description: 'Test contribution',
      currency: 'NGN'
    },
    customer: {
      id: 123456,
      first_name: 'Test',
      last_name: 'Donor',
      email: 'test@example.com',
      customer_code: 'CUS_test123',
      phone: null,
      metadata: null,
      risk_action: 'default'
    },
    authorization: {
      authorization_code: 'AUTH_test123',
      bin: '408408',
      last4: '4081',
      exp_month: '12',
      exp_year: '2030',
      channel: 'card',
      card_type: 'visa',
      bank: null,
      country_code: 'NG',
      brand: 'visa',
      reusable: true,
      signature: 'SIG_test123'
    },
    plan: null,
    split: {},
    order_id: null,
    paidAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    requested_amount: 500000
  }
};

// Generate HMAC SHA512 signature (same as Paystack does)
function generateSignature(payload, secret) {
  return crypto
    .createHmac('sha512', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
}

// Test the webhook
async function testWebhook() {
  const webhookUrl = 'https://fundify-paystack-worker.danfrankline.workers.dev';
  const signature = generateSignature(webhookPayload, PAYSTACK_SECRET_KEY);

  console.log('Testing webhook at:', webhookUrl);
  console.log('Payload:', JSON.stringify(webhookPayload, null, 2));
  console.log('Signature:', signature);
  console.log('\nSending POST request...\n');

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': signature
      },
      body: JSON.stringify(webhookPayload)
    });

    const responseText = await response.text();
    console.log('Response Status:', response.status, response.statusText);
    console.log('Response Body:', responseText);

    if (response.ok) {
      console.log('\n✅ Webhook test successful!');
    } else {
      console.log('\n❌ Webhook test failed');
    }
  } catch (error) {
    console.error('Error testing webhook:', error);
  }
}

// Run the test
testWebhook();

