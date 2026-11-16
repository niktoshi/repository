document.addEventListener('DOMContentLoaded', () => {
  const number = document.getElementById('card_number');
  const expiry = document.getElementById('expiry');
  const cvc = document.getElementById('cvc');
  const brandEl = document.getElementById('card-brand');
  function detectBrand(num) {
    if (/^4/.test(num)) return 'Visa';
    if (/^(5[1-5]|2[2-7])/.test(num)) return 'Mastercard';
    if (/^220[0-4]/.test(num)) return 'Мир';
    if (/^3[47]/.test(num)) return 'American Express';
    if (/^6/.test(num)) return 'Discover';
    return '';
  }
  function formatNumber(digits) {
    if (/^3[47]/.test(digits)) return digits.replace(/^(\d{4})(\d{0,6})(\d{0,5}).*/, (_, a, b, c) => [a, b, c].filter(Boolean).join(' '));
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  }
  if (number) number.addEventListener('input', () => {
    const digits = number.value.replace(/\D/g, '').slice(0, 19);
    number.value = formatNumber(digits);
    if (brandEl) brandEl.textContent = detectBrand(digits);
  });
  if (expiry) expiry.addEventListener('input', () => {
    const digits = expiry.value.replace(/\D/g, '').slice(0, 4);
    expiry.value = digits.length > 2 ? digits.slice(0, 2) + '/' + digits.slice(2) : digits;
  });
  if (cvc) cvc.addEventListener('input', () => {
    cvc.value = cvc.value.replace(/\D/g, '').slice(0, 4);
  });
  const form = document.getElementById('payment-form');
  const btn = document.getElementById('pay-btn');
  if (form && btn) form.addEventListener('submit', () => {
    btn.disabled = true;
    btn.textContent = 'Обработка платежа…';
  });
});
