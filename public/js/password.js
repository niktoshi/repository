document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('password');
  if (!input) return;
  const bar = document.getElementById('pw-bar');
  const text = document.getElementById('pw-text');
  const checks = document.querySelectorAll('#pw-checks li');
  const rules = {
    length: v => v.length >= 8,
    lower: v => /[a-zа-я]/.test(v),
    upper: v => /[A-ZА-Я]/.test(v),
    digit: v => /\d/.test(v),
    special: v => /[^A-Za-zА-Яа-я0-9]/.test(v)
  };
  const labels = ['Очень слабый пароль', 'Слабый пароль', 'Средний пароль', 'Хороший пароль', 'Надёжный пароль', 'Очень надёжный пароль'];
  input.addEventListener('input', () => {
    const v = input.value;
    let score = 0;
    checks.forEach(li => {
      const ok = rules[li.dataset.check] ? rules[li.dataset.check](v) : false;
      li.classList.toggle('pw-ok', ok);
      if (ok) score++;
    });
    if (bar) {
      bar.style.width = (score * 20) + '%';
      bar.style.background = score <= 2 ? '#a3162b' : score <= 3 ? '#b7791f' : '#1a7a2e';
    }
    if (text) text.textContent = v ? labels[score] : 'Минимум 8 символов, строчные и заглавные буквы, цифра и спецсимвол.';
  });
});
