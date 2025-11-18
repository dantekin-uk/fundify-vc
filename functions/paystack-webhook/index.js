// Paystack Webhook Handler for Cloudflare Workers + Firestore
// Deploy to Cloudflare Workers to handle Paystack webhook events

// Environment variables required:
// - PAYSTACK_SECRET_KEY: Your Paystack secret key for verifying webhook signatures
// - FIREBASE_PROJECT_ID: Your Firebase project ID
// - FIREBASE_API_KEY: Your Firebase API key (public key, safe to use in workers)

// Verify Paystack webhook signature using SubtleCrypto (Cloudflare Workers compatible)
async function verifyPaystackSignature(rawBody, signature, secretKey) {
  if (!signature) {
    console.error('No Paystack signature found in headers');
    return false;
  }

  if (!secretKey || secretKey.length === 0) {
    console.error('PAYSTACK_SECRET_KEY is not set or empty');
    return false;
  }

  try {
    // Use SubtleCrypto for HMAC verification (Cloudflare Workers native)
    // Paystack signs the raw request body, not the JSON parsed version
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign', 'verify']
    );

    const bodyData = encoder.encode(rawBody);
    const sigBuffer = await crypto.subtle.sign('HMAC', cryptoKey, bodyData);
    const calculatedSignature = Array.from(new Uint8Array(sigBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Paystack signature is case-insensitive, but we'll do exact match first
    const isValid = calculatedSignature.toLowerCase() === signature.toLowerCase();
    
    if (!isValid) {
      console.error('Signature mismatch:', {
        received: signature.substring(0, 20) + '...',
        calculated: calculatedSignature.substring(0, 20) + '...',
        bodyLength: rawBody.length
      });
    }
    
    return isValid;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// Helper to convert Firestore timestamp to ISO string
function getCurrentTimestamp() {
  return new Date().toISOString();
}

// Update org document with new income (using Firestore REST API)
async function addIncomeToOrg(projectId, walletId, amount, currency, reference, metadata, firebaseProjectId, firebaseApiKey) {
  const orgId = metadata?.orgId;
  if (!orgId) {
    throw new Error('Missing orgId in metadata');
  }

  const incomeRecord = {
    id: `inc-${Math.random().toString(36).substr(2, 10)}`,
    projectId: projectId || null,
    walletId: walletId || 'ORG',
    amount: Number(amount) || 0,
    date: getCurrentTimestamp(),
    description: metadata?.description || `Donation from ${metadata?.email}`,
    status: 'posted',
    attachments: [],
    currency: currency || 'NGN',
    fxRate: 1,
    source: 'paystack',
    paystack: {
      reference,
      id: metadata?.paystackId,
      channel: metadata?.channel || 'card',
      paidAt: getCurrentTimestamp(),
      customer: metadata?.email || null
    }
  };

  // Get existing incomes array from org doc
  // Note: Firestore REST API requires OAuth tokens, not API keys
  // We'll use unauthenticated requests and rely on security rules allowing webhook writes
  const getOrgUrl = `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents/orgs/${orgId}`;

  const getResponse = await fetch(getOrgUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!getResponse.ok) {
    const errorText = await getResponse.text();
    console.error('Failed to fetch org doc:', getResponse.status, errorText);
    throw new Error(`Failed to fetch org doc: ${getResponse.status} ${errorText}`);
  }

  const orgDoc = await getResponse.json();
  const currentIncomes = orgDoc.fields?.incomes?.arrayValue?.values || [];

  // Add new income to array
  const updatedIncomes = [
    {
      mapValue: {
        fields: {
          id: { stringValue: incomeRecord.id },
          projectId: { stringValue: incomeRecord.projectId || '' },
          walletId: { stringValue: incomeRecord.walletId },
          amount: { doubleValue: incomeRecord.amount },
          date: { stringValue: incomeRecord.date },
          description: { stringValue: incomeRecord.description },
          status: { stringValue: incomeRecord.status },
          attachments: { arrayValue: { values: [] } },
          currency: { stringValue: incomeRecord.currency },
          fxRate: { doubleValue: incomeRecord.fxRate },
          source: { stringValue: incomeRecord.source },
          paystack: {
            mapValue: {
              fields: {
                reference: { stringValue: incomeRecord.paystack.reference },
                customer: { stringValue: incomeRecord.paystack.customer || '' },
                channel: { stringValue: incomeRecord.paystack.channel },
                paidAt: { stringValue: incomeRecord.paystack.paidAt }
              }
            }
          }
        }
      }
    },
    ...currentIncomes
  ];

  // Update org doc with new incomes array
  // Note: Using unauthenticated request - security rules allow webhook writes to incomes field
  const updateUrl = `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents/orgs/${orgId}`;
  const updateResponse = await fetch(updateUrl, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fields: {
        incomes: {
          arrayValue: {
            values: updatedIncomes
          }
        }
      }
    })
  });

  if (!updateResponse.ok) {
    const errorText = await updateResponse.text();
    console.error('Failed to update org doc:', updateResponse.status, errorText);
    throw new Error(`Failed to update org doc: ${updateResponse.status} ${errorText}`);
  }

  return incomeRecord;
}

// Handle incoming webhook
async function handleWebhook(request, env) {
  try {
    // Get raw body for signature verification (Paystack signs the raw body)
    const rawBody = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    console.log('Webhook received:', {
      hasSignature: !!signature,
      bodyLength: rawBody.length,
      hasSecretKey: !!env.PAYSTACK_SECRET_KEY
    });

    // Verify the webhook signature before parsing JSON
    const isValid = await verifyPaystackSignature(rawBody, signature, env.PAYSTACK_SECRET_KEY);
    if (!isValid) {
      console.error('Invalid Paystack signature - webhook rejected');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    console.log('Signature verified successfully');

    // Parse body after verification
    const body = JSON.parse(rawBody);

    const event = body.event;
    const data = body.data;

    console.log('Webhook event:', event, 'Reference:', data?.reference);

    // Handle charge.success event (successful payment)
    if (event === 'charge.success') {
      const { reference, amount, customer, metadata } = data;
      const { orgId, walletId, funderId, userId, email, name, description } = metadata || {};

      if (!orgId) {
        console.error('Missing orgId in metadata');
        return new Response(JSON.stringify({ error: 'Missing orgId' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      // Convert amount from kobo to actual amount
      const amountValue = Number(amount || 0) / 100;
      const currency = (metadata?.currency || 'NGN').toUpperCase();

      try {
        // Add income to organization document
        const incomeRecord = await addIncomeToOrg(
          metadata?.projectId || null,
          walletId || funderId || 'ORG',
          amountValue,
          currency,
          reference,
          {
            orgId,
            email: email || customer?.email,
            name,
            description,
            paystackId: data.id,
            channel: data.channel
          },
          env.FIREBASE_PROJECT_ID,
          env.FIREBASE_API_KEY
        );

        console.log(`Payment ${reference} processed successfully:`, incomeRecord);

        return new Response(JSON.stringify({ success: true, income: incomeRecord }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (err) {
        console.error('Error adding income to Firestore:', err);
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // For other events, just acknowledge receipt
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Main worker function
export default {
  async fetch(request, env) {
    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Handle the webhook
    return handleWebhook(request, env);
  }
};
