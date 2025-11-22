// Lightweight loader and opener for Paystack Inline Checkout
// Usage: const { openPaystack } = await import('../utils/paystack');
// openPaystack({ key, email, amount, currency, reference, metadata, onSuccess, onCancel });

let scriptLoading = null;

function loadScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.PaystackPop) return Promise.resolve(window.PaystackPop);
  if (scriptLoading) return scriptLoading;
  scriptLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://js.paystack.co/v1/inline.js';
    s.async = true;
    s.onload = () => resolve(window.PaystackPop);
    s.onerror = () => reject(new Error('Failed to load Paystack script'));
    document.head.appendChild(s);
  });
  return scriptLoading;
}

export async function openPaystack({ key, email, amount, currency = 'KES', reference, metadata = {}, onSuccess, onCancel }) {
  const PaystackPop = await loadScript();
  if (!PaystackPop) throw new Error('Paystack not available');

  const koboAmount = Math.round(Number(amount || 0) * 100);
  if (!key) throw new Error('Missing Paystack public key');
  if (!email) throw new Error('Missing payer email');
  if (!koboAmount) throw new Error('Invalid amount');

  const handler = PaystackPop.setup({
    key,
    email,
    amount: koboAmount,
    currency: currency || 'KES',
    ref: reference,
    metadata,
    callback: function(res) {
      try { if (typeof onSuccess === 'function') onSuccess(res); } catch {}
    },
    onClose: function() {
      try { if (typeof onCancel === 'function') onCancel(); } catch {}
    }
  });
  handler.openIframe();
}
