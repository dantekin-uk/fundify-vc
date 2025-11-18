# Cloudflare Workers - Paystack Webhook Setup

This guide walks you through setting up the Paystack webhook handler using Cloudflare Workers (instead of Firebase Cloud Functions).

## Architecture

```
Payment Event
    ↓
Paystack Sends Webhook
    ↓
Cloudflare Worker Receives Request
    ↓
Signature Verified (HMAC-SHA512)
    ↓
Firestore REST API Called
    ↓
Income Record Created in Firebase
    ↓
Real-time Listener Updates Dashboard
```

## Prerequisites

1. **Cloudflare Account** (free tier is fine)
   - Sign up at https://cloudflare.com
   - Get your Account ID from Cloudflare Dashboard

2. **Firebase Project**
   - Firebase API key (from Project Settings)
   - Firebase Project ID
   - Firestore database created

3. **Paystack Account**
   - Paystack API keys (test or live)

4. **Node.js 16+**
   - For running wrangler CLI

## Step 1: Get Your Cloudflare Account ID

1. Go to https://dash.cloudflare.com/
2. In the top right, click your profile
3. Go to "Account Settings"
4. Find "Account ID" and copy it
5. Keep this handy for the next step

## Step 2: Get Firebase Credentials

1. Go to Firebase Console
2. Click "Project Settings" (gear icon)
3. Under "API keys", find the **Web API Key**
4. Copy both:
   - `FIREBASE_PROJECT_ID` (from Project ID field)
   - `FIREBASE_API_KEY` (any of the API keys listed)

**Important**: These are public keys, safe to include in wrangler.toml

## Step 3: Configure the Worker

1. Open `functions/paystack-webhook/wrangler.toml`:

```toml
name = "paystack-webhook"
type = "javascript"
account_id = "YOUR_CLOUDFLARE_ACCOUNT_ID"  # Replace with your account ID
workers_dev = true
compatibility_date = "2024-01-01"

[vars]
FIREBASE_PROJECT_ID = "your_firebase_project_id"  # Replace with yours
FIREBASE_API_KEY = "your_firebase_api_key"        # Replace with yours
```

2. Replace the placeholders with your actual values

3. Open `functions/paystack-webhook/package.json` and verify it has:
```json
"scripts": {
  "deploy": "wrangler deploy",
  "dev": "wrangler dev --local"
}
```

## Step 4: Set Up Paystack Secret

Run this command in `functions/paystack-webhook/`:

```bash
wrangler secret put PAYSTACK_SECRET_KEY
```

When prompted, paste your **Paystack Secret Key** (starts with `sk_test_` or `sk_live_`)

**Note**: Secrets are stored securely on Cloudflare and never exposed in your code.

## Step 5: Install Dependencies

```bash
cd functions/paystack-webhook
npm install
```

## Step 6: Deploy the Worker

```bash
npm run deploy
```

**Output**: You'll see something like:
```
✓ Deployed paystack-webhook to paystack-webhook.YOUR_ACCOUNT.workers.dev
```

**Copy this URL** - you'll need it in the next step.

## Step 7: Configure Paystack Webhook

1. Go to https://dashboard.paystack.com/#/settings/webhooks
2. Add new webhook:
   - **URL**: `https://paystack-webhook.YOUR_ACCOUNT.workers.dev/`
   - Replace `YOUR_ACCOUNT` with your Cloudflare account username
3. Click "Save"
4. Click "Send a test event"
5. Check the logs:
   ```bash
   wrangler tail
   ```
   You should see: `Payment processed successfully`

## Step 8: Verify Setup

### Test in Development

1. Run the dev server:
```bash
npm run dev
```

2. Make a test contribution from the app:
   - Click "Make a Contribution"
   - Enter amount: `1000`
   - Use test card: `4084 0000 0000 3220`
   - Complete payment

3. Check logs:
```bash
wrangler tail
```

4. Check Firestore:
   - Open Firebase Console
   - Go to `/orgs/{orgId}/incomes`
   - New transaction should appear

5. Check Dashboard:
   - Dashboard should update automatically
   - New transaction appears in "Recent Transactions"
   - Total Funds increases

## How the Worker Works

### Request Flow

```javascript
POST https://paystack-webhook.YOUR_ACCOUNT.workers.dev/
Body: {
  "event": "charge.success",
  "data": {
    "reference": "DONATION_xxx",
    "amount": 100000,  // in kobo
    "metadata": {
      "orgId": "your_org_id",
      "walletId": "funder_id",
      "email": "donor@example.com",
      ...
    }
  }
}
```

### Processing Steps

1. **Verify Signature**
   - Uses HMAC-SHA512 with Paystack secret key
   - Prevents unauthorized requests

2. **Validate Metadata**
   - Checks for required `orgId`
   - Extracts funder and project info

3. **Create Income Record**
   - Converts amount from kobo to actual value
   - Creates Firestore document in `/orgs/{orgId}/incomes`
   - Stores complete payment details

4. **Update Dashboard**
   - Real-time listener detects change
   - Dashboard updates automatically

## Environment Variables

### Required

- **PAYSTACK_SECRET_KEY** (Secret)
  - Type: Cloudflare Secret
  - Set with: `wrangler secret put PAYSTACK_SECRET_KEY`
  - Value: Your Paystack secret key

### Configuration

- **FIREBASE_PROJECT_ID** (Env Var)
  - Value: Your Firebase project ID
  - Location: `wrangler.toml`
  - Safe to commit (public)

- **FIREBASE_API_KEY** (Env Var)
  - Value: Your Firebase Web API key
  - Location: `wrangler.toml`
  - Safe to commit (public)

- **CLOUDFLARE_ACCOUNT_ID** (Config)
  - Value: Your Cloudflare account ID
  - Location: `wrangler.toml`
  - Safe to commit (public)

## Monitoring and Debugging

### View Live Logs

```bash
wrangler tail --format pretty
```

### Watch for Webhook Events

```bash
wrangler tail --search "charge.success"
```

### Filter by Status

```bash
wrangler tail --search "Payment processed"
wrangler tail --search "Invalid signature"
wrangler tail --search "error"
```

## Common Issues & Solutions

### ❌ "Account ID not found"

**Solution**: Replace `YOUR_CLOUDFLARE_ACCOUNT_ID` in wrangler.toml with your actual account ID

### ❌ "Invalid signature"

**Cause**: PAYSTACK_SECRET_KEY is wrong or not set
**Solution**:
```bash
wrangler secret put PAYSTACK_SECRET_KEY
# Verify with:
wrangler secret list
```

### ❌ "Failed to update org doc"

**Cause**: Firebase API key or project ID is wrong
**Solution**:
1. Verify in `wrangler.toml`:
   ```toml
   FIREBASE_PROJECT_ID = "correct_id"
   FIREBASE_API_KEY = "correct_key"
   ```
2. Check Firebase Console → Project Settings for correct values
3. Redeploy: `npm run deploy`

### ❌ "Missing orgId in metadata"

**Cause**: Payment sent without orgId in metadata
**Solution**: 
- ContributionForm automatically includes orgId
- Verify `useOrg()` is working in ContributionForm
- Check browser console for errors

### ❌ Worker shows "Timeout"

**Cause**: Firestore REST API taking too long
**Solution**:
- Check Firebase quota and rate limits
- Verify network connectivity
- Try again (transient issue)

## Firestore Security Rules

To allow the worker to write to Firestore, update your rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow webhook to write incomes to org documents
    match /orgs/{orgId} {
      allow read, write: if request.auth.uid != null || 
                            request.auth.token.iss == "https://securetoken.google.com/YOUR_PROJECT_ID";
    }
  }
}
```

Or if you want to allow the worker to write without authentication:

```javascript
match /orgs/{orgId} {
  allow write: if request.path[0] == 'orgs' && 'incomes' in request.resource.data;
}
```

## Deployment to Production

### 1. Switch to Live Keys

```bash
wrangler secret put PAYSTACK_SECRET_KEY
# Enter your sk_live_ key
```

### 2. Update wrangler.toml

```toml
[env.production]
name = "paystack-webhook-prod"
route = "your-domain.com/api/webhooks/paystack"
zone_id = "YOUR_ZONE_ID"
```

### 3. Deploy to Production

```bash
npm run deploy -- --env production
```

### 4. Update Paystack Webhook

- Go to Paystack Dashboard → Settings → Webhooks
- Update URL to your production domain: `https://your-domain.com/api/webhooks/paystack`

## Monitoring Production

### View Production Logs

```bash
wrangler tail --env production
```

### Check Deployment Status

```bash
wrangler deployments list
```

## Cost Considerations

### Cloudflare Workers
- Free tier: 100,000 requests/day
- Paid tier: $0.50/million requests
- Most financial apps fit in free tier

### Firebase Firestore
- Free tier: 50,000 reads/day, 20,000 writes/day
- Paid tier: $0.06 per 100,000 writes
- One webhook = one write operation

## Best Practices

1. **Always verify signatures** - Prevents unauthorized requests
2. **Log everything** - Use `console.log()` for debugging
3. **Handle errors gracefully** - Return appropriate HTTP status codes
4. **Store secrets securely** - Use `wrangler secret` for sensitive data
5. **Test before deploying** - Use `wrangler dev` locally first
6. **Monitor logs regularly** - Check for errors or unusual activity

## Next Steps

1. ✅ Configure wrangler.toml with your values
2. ✅ Deploy the worker: `npm run deploy`
3. ✅ Configure Paystack webhook with worker URL
4. ✅ Test with a real payment
5. ✅ Monitor logs: `wrangler tail`
6. ✅ Set up production deployment

## Support

- **Cloudflare Documentation**: https://developers.cloudflare.com/workers/
- **Paystack Documentation**: https://paystack.com/docs/
- **Firebase Firestore REST API**: https://firebase.google.com/docs/firestore/use-rest-api

---

**Your Cloudflare Worker is now handling all Paystack payments in real-time!** 🚀
