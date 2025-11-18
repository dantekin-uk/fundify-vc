# 🚀 Payment Flow Quick Start (5 Minutes)

## What Was Built

✅ Complete payment flow from contribution button to admin dashboard updates

## What You Need

1. Paystack account (free) - https://paystack.com
2. Firebase project (already set up)
3. Paystack API keys

## 30-Second Setup

### Step 1: Get Paystack Keys (2 min)
```
1. Go to https://dashboard.paystack.com/#/settings/developer
2. Copy "Public Key" (starts with pk_)
3. Copy "Secret Key" (starts with sk_)
```

### Step 2: Set Environment Variables (1 min)
Update your `.env` file:
```bash
REACT_APP_PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
```

### Step 3: Deploy Cloudflare Worker (2 min)
```bash
cd functions/paystack-webhook
wrangler secret put PAYSTACK_SECRET_KEY
# Paste your secret key when prompted
npm run deploy
```

### Step 4: Configure Paystack Webhook (1 min)
```
1. Go to Paystack Dashboard → Settings → Webhooks
2. Paste your Cloudflare Worker URL:
   https://paystack-webhook.YOUR_ACCOUNT.workers.dev/
   (replace YOUR_ACCOUNT with your Cloudflare account username)
3. Click Save
4. Click "Send a test event"
5. Check logs: wrangler tail
```

Done! ✅

## Test It (2 Minutes)

1. **Run app**:
   ```bash
   npm run dev
   ```

2. **Log in** as a donor

3. **Make a contribution**:
   - Click "Make a Contribution" button
   - Enter amount: `1000`
   - Click "Proceed to Pay"

4. **Complete payment**:
   - Test card: `4084 0000 0000 3220`
   - Expiry: Any future date
   - CVV: Any 3 digits
   - Click "Pay"

5. **Verify**:
   - Payment closes
   - Go to Admin Dashboard
   - Look for new transaction in "Recent Transactions"
   - Total Funds should increase ✅

## How It Works

```
You Click Button
    ↓
Paystack Opens
    ↓
You Pay
    ↓
Webhook Notifies Firebase
    ↓
Dashboard Updates Automatically
    ↓
Done!
```

## Troubleshooting (30 seconds)

**Problem**: "Paystack not loading"
- Check: Is `REACT_APP_PAYSTACK_PUBLIC_KEY` set?

**Problem**: "Payment doesn't update dashboard"
- Check: Did you run `npm run deploy` from `functions/paystack-webhook/`?
- Check: Is webhook URL correct in Paystack Dashboard?

**Problem**: "Webhook not received"
- Run: `wrangler tail` to see worker logs
- Check: Webhook URL in Paystack matches your worker URL
- Check: Is PAYSTACK_SECRET_KEY set as a Cloudflare secret?

## What Happens Automatically

✅ Payment triggers webhook
✅ Webhook creates income record
✅ Dashboard updates in real-time
✅ Total funds increase
✅ Funder sees transaction in history
✅ Admin sees transaction in Recent Transactions

**NO MANUAL UPDATES NEEDED!**

## Next Steps

1. ✅ Follow the quick setup above
2. 📖 Read `PAYMENT_SETUP_GUIDE.md` for detailed info
3. ✅ Run through `PAYMENT_VERIFICATION_CHECKLIST.md`
4. 🚀 Go live!

## Key Files

- `src/components/ContributionForm.jsx` - The contribution button
- `src/components/RecentTransactions.jsx` - Dashboard display
- `functions/index.js` - Webhook handler
- `PAYMENT_SETUP_GUIDE.md` - Full documentation

## Production Checklist

- [ ] Switch to live Paystack keys (pk_live_ / sk_live_)
- [ ] Update webhook URL to production domain
- [ ] Deploy Firebase functions to production
- [ ] Test with real payment
- [ ] Monitor `firebase functions:log` for errors

## You're Ready! 🎉

The payment system is fully implemented and ready to use. Just follow the quick setup steps above and you're done!

Questions? Check the detailed guides:
- **Setup issues?** → `PAYMENT_SETUP_GUIDE.md`
- **Testing issues?** → `PAYMENT_VERIFICATION_CHECKLIST.md`
- **How it works?** → `PAYMENT_FLOW_IMPLEMENTATION_SUMMARY.md`

---

**Time to setup**: ~5 minutes ⏱️
**Time to first payment**: ~10 minutes 🎉
