export function formatAmount(value, currency = null) {
  const v = Number(value || 0);
  try {
    const cur = currency || (typeof localStorage !== 'undefined' ? (localStorage.getItem('finTrackCurrency') || null) : null);
    if (cur) {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur, maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(Math.round(v));
    }
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(Math.round(v));
  } catch (e) {
    return Math.round(v).toString();
  }
}
