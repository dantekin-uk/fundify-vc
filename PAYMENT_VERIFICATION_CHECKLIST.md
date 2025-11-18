# Payment Flow Verification Checklist

Use this checklist to verify the complete payment flow is working end-to-end.

## Pre-Setup Verification

- [ ] **Environment Variables Set**
  - [ ] `REACT_APP_PAYSTACK_PUBLIC_KEY` is set (starts with `pk_`)
  - [ ] `PAYSTACK_SECRET_KEY` is set in Firebase functions config
  - [ ] Firebase credentials are properly configured

- [ ] **Firebase Setup**
  - [ ] Firebase project created
  - [ ] Firestore database enabled
  - [ ] Firebase functions initialized

- [ ] **Paystack Account**
  - [ ] Paystack account created
  - [ ] API keys obtained from dashboard
  - [ ] Using test keys for development

## Deployment Verification

- [ ] **Cloud Functions Deployed**
  ```bash
  firebase deploy --only functions
  ```
  - [ ] Deployment successful (check console for errors)
  - [ ] `paystackWebhook` function deployed
  - [ ] Function URL noted: `https://region-projectid.cloudfunctions.net/paystackWebhook`

- [ ] **Webhook Configured**
  - [ ] Webhook URL added to Paystack Dashboard (Settings → Webhooks)
  - [ ] Test webhook sent from Paystack dashboard
  - [ ] Check Firebase logs for webhook receipt: `firebase functions:log`

## Frontend Verification

- [ ] **Contribution Button Visible**
  - [ ] Log in as a donor/funder
  - [ ] Navigate to DonorDashboard
  - [ ] "Make a Contribution" button visible
  - [ ] Button is green and clickable

- [ ] **Contribution Form Functional**
  - [ ] Click "Make a Contribution" button
  - [ ] Modal opens with amount input field
  - [ ] Currency displays correctly (should be organization's currency)
  - [ ] "Proceed to Pay" button is enabled
  - [ ] Cancel button works and closes modal

## Payment Processing Verification

- [ ] **Paystack Modal Opens**
  - [ ] Click "Proceed to Pay"
  - [ ] Paystack payment modal appears
  - [ ] Email field is pre-filled with donor's email
  - [ ] Amount is displayed correctly
  - [ ] Modal is responsive and centered

- [ ] **Test Payment (Development)**
  - [ ] Use Paystack test card: `4084 0000 0000 3220`
  - [ ] Expiry: Any future date (e.g., 12/25)
  - [ ] CVV: Any 3 digits (e.g., 123)
  - [ ] OTP: `123456` (if prompted)
  - [ ] Payment should complete successfully

- [ ] **Successful Payment Handling**
  - [ ] Modal closes after successful payment
  - [ ] No error messages displayed
  - [ ] Page doesn't throw JavaScript errors
  - [ ] Browser console shows successful payment log

## Database Verification

- [ ] **Income Record Created**
  - [ ] Open Firebase Firestore Console
  - [ ] Navigate to: `orgs/{orgId}/incomes`
  - [ ] New income record should appear
  - [ ] Record has correct fields:
    - [ ] `id`: Generated ID
    - [ ] `amount`: The paid amount
    - [ ] `walletId`: Funder's ID (or 'ORG')
    - [ ] `status`: 'posted'
    - [ ] `date`: Current timestamp
    - [ ] `source`: 'paystack'
    - [ ] `paystack.reference`: Paystack transaction reference

## Real-Time Update Verification

- [ ] **Admin Dashboard Updates**
  - [ ] Open Admin Dashboard (refresh if needed)
  - [ ] "Recent Transactions" section shows new transaction
  - [ ] Transaction shows:
    - [ ] Type: "💰 Income"
    - [ ] Status: "posted"
    - [ ] Amount: Correct amount with currency
    - [ ] Date/time: Recent
    - [ ] Description: Correct donor info

- [ ] **Dashboard Stats Update**
  - [ ] "Total Funds" stat increases by the payment amount
  - [ ] "Net Available" increases
  - [ ] Changes are instant (real-time)

- [ ] **Funder View Updates**
  - [ ] Open funder's profile
  - [ ] "Contributions History" shows new transaction
  - [ ] Amount is correctly displayed

## Real-Time Listener Verification

- [ ] **Automatic Updates Work**
  - [ ] Don't refresh the page after payment
  - [ ] Dashboard automatically updates within 2 seconds
  - [ ] No manual refresh needed
  - [ ] Browser console shows no connection errors

- [ ] **Multiple User Sync**
  - [ ] Open dashboard in two browser windows
  - [ ] Process payment in one window
  - [ ] Other window updates automatically
  - [ ] No timing delays (should be near-instant)

## Webhook Verification

- [ ] **Webhook Called Successfully**
  - [ ] Check Firebase Function logs:
    ```bash
    firebase functions:log
    ```
  - [ ] Log shows webhook received
  - [ ] Log shows "Recorded income from Paystack" message
  - [ ] No errors in the logs

- [ ] **Signature Verification**
  - [ ] Webhook signature is validated
  - [ ] Invalid signatures are rejected
  - [ ] Only valid Paystack signatures accepted

- [ ] **Error Handling**
  - [ ] Missing `orgId` returns error (check logs)
  - [ ] Invalid transaction reference returns error
  - [ ] Firestore write errors are logged

## Advanced Verification

- [ ] **Multiple Transactions**
  - [ ] Process 3+ payments
  - [ ] All appear in Recent Transactions
  - [ ] All increase Total Funds correctly
  - [ ] No duplicates appear

- [ ] **Different Amounts**
  - [ ] Process payment with decimal amount (e.g., 1000.50)
  - [ ] Verified correctly in database
  - [ ] Displayed correctly on dashboard

- [ ] **Currency Handling**
  - [ ] If using different currency, verify it's shown correctly
  - [ ] Amount conversion is accurate
  - [ ] Currency symbol displays properly

## Error Scenarios

- [ ] **Network Issues**
  - [ ] Temporarily disable network
  - [ ] Page doesn't crash
  - [ ] Reconnect and verify sync
  - [ ] Real-time listener reconnects

- [ ] **Invalid Amount**
  - [ ] Enter 0 as amount: "Proceed to Pay" button disabled
  - [ ] Enter negative amount: Error message shown
  - [ ] Enter non-numeric: Form validation prevents submission

- [ ] **Payment Cancellation**
  - [ ] Close Paystack modal during payment
  - [ ] "Payment cancelled" message in console
  - [ ] No income record created
  - [ ] Dashboard unchanged

## Performance Verification

- [ ] **Dashboard Load Time**
  - [ ] Dashboard loads in < 3 seconds
  - [ ] Real-time updates are smooth
  - [ ] No lag when typing in forms

- [ ] **Transaction List**
  - [ ] Recent Transactions section loads quickly
  - [ ] Scrolling is smooth
  - [ ] No UI freezes

## Security Verification

- [ ] **API Keys Protected**
  - [ ] Public key (REACT_APP) can be seen in browser (expected)
  - [ ] Secret key (PAYSTACK_SECRET_KEY) NOT visible anywhere
  - [ ] Secret key only in server-side functions

- [ ] **Signature Verification**
  - [ ] Webhook signature checked
  - [ ] Modified payloads are rejected

- [ ] **Data Validation**
  - [ ] orgId is validated
  - [ ] Email is validated
  - [ ] Amount is validated (positive number)

## Cleanup & Documentation

- [ ] **Environment Variables**
  - [ ] `.env` file created locally
  - [ ] `.env` file added to `.gitignore`
  - [ ] Environment variables documented

- [ ] **Logs Checked**
  - [ ] Firebase function logs reviewed
  - [ ] Paystack webhook logs reviewed
  - [ ] No sensitive data in logs

- [ ] **Documentation**
  - [ ] PAYMENT_SETUP_GUIDE.md reviewed
  - [ ] Setup steps followed
  - [ ] Troubleshooting section reviewed

## Production Readiness

- [ ] **Paystack Keys Updated**
  - [ ] Switched from test to production keys
  - [ ] Public key starts with `pk_live_`
  - [ ] Secret key starts with `sk_live_`

- [ ] **Webhook URL Correct**
  - [ ] Webhook URL in Paystack dashboard is production URL
  - [ ] Not pointing to localhost

- [ ] **Firebase Functions Deployed**
  - [ ] Functions deployed to production project
  - [ ] Not using emulators in production

- [ ] **Testing Complete**
  - [ ] At least 2 test transactions processed
  - [ ] All steps verified
  - [ ] No critical errors

## Success Indicators

✅ **You're successful when:**
1. Contribution button appears on donor dashboard
2. Clicking button opens Paystack payment modal
3. Payment processes without errors
4. Income record automatically appears in Firestore
5. Admin dashboard updates in real-time with new transaction
6. No errors in console or Firebase logs
7. Webhook signature validation passes
8. All metadata is correctly stored

---

**Need Help?**
- Check PAYMENT_SETUP_GUIDE.md for detailed setup instructions
- Review Firebase logs: `firebase functions:log`
- Check Paystack webhook test: Paystack Dashboard → Settings → Webhooks
- Verify database structure in Firestore Console

**Remember:** The entire system works automatically once configured. No manual updates needed!
