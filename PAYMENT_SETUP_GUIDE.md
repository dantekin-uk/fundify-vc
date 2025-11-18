# Payment Flow Setup Guide

This guide walks through setting up the complete payment flow: Contribution Button → Paystack → Cloudflare Webhook → Firebase Database → Admin Dashboard.

## Architecture Overview

```
Funder Makes Contribution
        ↓
    Paystack Payment
        ↓
Paystack Webhook Event
        ↓
Firebase Cloud Function (paystackWebhook)
        ↓
Firebase Firestore (incomes added to org doc)
        ↓
Real-time Update in FinanceContext
        ↓
Admin Dashboard Updates
```

## Prerequisites

- Firebase project set up
- Paystack account with API keys
- Firebase CLI installed (`firebase-tools`)
- Node.js 22+ (for Cloud Functions)

## Step 1: Configure Environment Variables

1. Copy the contents of `env.example` to a new `.env` file (or update an existing one):

```bash
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=G-XXXX

# Paystack Configuration (REQUIRED for payment processing)
REACT_APP_PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxxx  # or pk_test_ for testing
PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxxx              # or sk_test_ for testing
```

2. Get your Paystack API keys from: https://dashboard.paystack.com/#/settings/developer

## Step 2: Deploy Cloudflare Worker for Webhook

1. Configure Cloudflare Worker credentials:

```bash
cd functions/paystack-webhook
```

2. Set up `wrangler.toml` with your details:
   - Replace `YOUR_CLOUDFLARE_ACCOUNT_ID` with your account ID
   - Set `FIREBASE_PROJECT_ID` to your Firebase project ID
   - Set `FIREBASE_API_KEY` to your Firebase API key (from Firebase Console → Project Settings)

3. Add the Paystack secret key as a Cloudflare secret:

```bash
wrangler secret put PAYSTACK_SECRET_KEY
# Paste your secret key when prompted
```

4. Deploy the worker:

```bash
npm run deploy
```

5. Your worker will be deployed. Note the URL provided in the output.
   If using workers.dev, it will be: `https://paystack-webhook.YOUR_ACCOUNT.workers.dev`
   If using a custom domain, configure it in `wrangler.toml`

## Step 3: Configure Paystack Webhook

1. Go to Paystack Dashboard: https://dashboard.paystack.com/#/settings/webhooks

2. Add the webhook URL from Step 2:
   - If using workers.dev: `https://paystack-webhook.YOUR_ACCOUNT.workers.dev/`
   - If using custom domain: `https://your-domain.com/api/webhooks/paystack` (as configured in wrangler.toml)
   - Click "Save"

3. Test the webhook:
   - Click "Send a test event" in Paystack Dashboard
   - Check Cloudflare Worker logs:
     ```bash
     wrangler tail --env production
     # or
     wrangler tail
     ```
   - Verify the webhook is received and logs show "Payment processed successfully"

## Step 4: Test the Payment Flow

### Option A: Test in Development

1. Start the dev server:
```bash
npm run dev
```

2. Log in to the application as a donor/funder

3. Navigate to the funding page and click "Make a Contribution"

4. Enter a test amount (use Paystack test cards if using test mode)

5. Complete the payment

6. Verify:
   - ✅ Payment modal closes
   - ✅ Admin dashboard shows the new transaction in "Recent Transactions"
   - ✅ Total Funds increases on the dashboard
   - ✅ Income appears in the admin's income list

### Option B: Test in Production

1. Build the app:
```bash
npm run build
```

2. Deploy to your hosting (e.g., Netlify, Firebase Hosting)

3. Use real Paystack API keys

4. Test with a real payment

## Step 5: Verify Real-time Updates

The admin dashboard should automatically update when:
- A funder makes a contribution (income created)
- An admin approves/rejects an income
- An expense is added

Updates happen in real-time through Firebase's Firestore listener.

## Troubleshooting

### Payment modal doesn't appear
- Check that `REACT_APP_PAYSTACK_PUBLIC_KEY` is set correctly
- Ensure the key is a public key (starts with `pk_`)
- Verify the key matches your Paystack account

### Webhook isn't being called
- Check Cloudflare Worker logs: `wrangler tail`
- Verify the webhook URL in Paystack dashboard matches the deployed worker URL
- Test webhook manually in Paystack Dashboard (Settings → Webhooks → Send a test event)
- Check network tab in browser DevTools for webhook requests

### Income doesn't appear after payment
- Check Firestore Console: Navigate to `/orgs/{orgId}` and verify the `incomes` array exists
- Check Cloudflare logs for signature verification errors: `wrangler tail`
- Verify `orgId` is included in the payment metadata (see ContributionForm)
- Verify Firebase API key has Firestore read/write permissions

### Dashboard doesn't update
- Refresh the page (Ctrl+R)
- Check browser console for errors
- Verify Firestore real-time listener is working (check FinanceContext logs)
- Verify the income record was actually created in Firestore

### "Invalid signature" error in logs
- Verify `PAYSTACK_SECRET_KEY` matches your actual Paystack secret key
- Check the secret key starts with `sk_` (not `pk_`)
- Ensure the secret is set as a Cloudflare secret: `wrangler secret put PAYSTACK_SECRET_KEY`

### "Failed to update org doc" error
- Verify `FIREBASE_API_KEY` is set correctly in wrangler.toml
- Check that the API key is from Firebase Console → Project Settings → API keys
- Ensure Firestore security rules allow writes from unauthenticated requests
- Verify the organization document exists in Firestore

## Required Metadata Structure

When a payment is processed, the webhook expects this metadata:

```javascript
{
  orgId: "your_organization_id",        // Required - identifies which org to update
  walletId: "funder_id_or_ORG",        // The funder's wallet (or 'ORG' for organization)
  funderId: "funder_id_or_ORG",        // Same as walletId
  userId: "user_uid",                   // Firebase Auth UID of the payer
  email: "payer@example.com",           // Email of the payer
  name: "Payer Name",                   // Name of the payer
  description: "Payment description"    // Optional description
}
```

The ContributionForm automatically includes this metadata - no changes needed.

## Database Structure

After payment, the income is stored in Firestore:

```
/orgs/{orgId}
  incomes: [
    {
      id: "inc-xxxxxxxx",
      projectId: null,
      walletId: "funder_id",
      amount: 5000,
      date: "2024-01-15T10:30:00Z",
      description: "Contribution from John Doe",
      status: "posted",
      currency: "NGN",
      source: "paystack",
      paystack: {
        reference: "DONATION_xxx",
        id: 12345678,
        channel: "card",
        paidAt: "2024-01-15T10:30:00Z",
        customer: "john@example.com"
      }
    }
  ]
```

## Email Notifications (Optional)

To send approval notification emails:

1. Set up EmailJS or Firebase mail collection (optional)
2. Configure environment variables for your email service
3. Emails will be sent to admins when approvals are needed

## API Endpoints

### Webhook Endpoint
- **URL:** `https://region-projectid.cloudfunctions.net/paystackWebhook`
- **Method:** POST
- **Headers:** `X-Paystack-Signature` (auto-verified)
- **Body:** Paystack webhook event object

### Frontend Endpoints
- Contribution modal triggered from any donor page
- No additional API calls needed - webhook handles everything

## Currency Support

The system supports any currency that Paystack supports:
- NGN (Nigerian Naira) - Default
- GHS (Ghana Cedis)
- ZAR (South African Rand)
- USD (US Dollar)
- And many more

Set the currency in your organization settings.

## Security

- ✅ Paystack signature verification on webhook
- ✅ Firebase Firestore security rules protect data
- ✅ API keys stored in environment variables (never in code)
- ✅ Real-time updates only for authenticated users
- ✅ Income automatically marked as "posted" (ready to use)

## Next Steps

1. ✅ Configure environment variables
2. ✅ Deploy Firebase Cloud Functions
3. ✅ Set webhook in Paystack dashboard
4. ✅ Test the complete flow
5. ✅ Train admin users on income approval/rejection
6. ✅ Set up email notifications (optional)
7. ✅ Monitor webhook activity in Firebase logs

## Support

For issues:
1. Check Firebase Function logs: `firebase functions:log`
2. Verify Paystack test webhook: Dashboard → Settings → Webhooks
3. Review the ContributionForm component for metadata structure
4. Check FinanceContext for real-time listener status

---

**Note:** The payment flow is now fully integrated. Once the webhook is configured in Paystack and Firebase Functions are deployed, the system will automatically:
- Receive payment confirmations
- Create income records
- Update the dashboard
- Show transaction history
