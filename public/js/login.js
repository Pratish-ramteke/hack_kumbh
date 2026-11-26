// ---------- Helpers ----------
const form = document.getElementById('loginForm');
const emailEl = document.getElementById('email');
const passEl = document.getElementById('password');
const emailErr = document.getElementById('emailError');
const passErr = document.getElementById('passwordError');
const btn = document.getElementById('signInBtn');
const btnText = document.getElementById('btnText');
const toastEl = document.getElementById('toast');

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toastEl.classList.remove('show'), 2800);
}

function setError(input, errEl, message) {
  errEl.textContent = message;
  input.closest('.input-wrap').classList.toggle('invalid', !!message);
}

// ---------- Show / hide password ----------
document.getElementById('togglePw').addEventListener('click', () => {
  const show = passEl.type === 'password';
  passEl.type = show ? 'text' : 'password';
});

// ---------- Validation ----------
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate() {
  let ok = true;
  if (!emailPattern.test(emailEl.value.trim())) {
    setError(emailEl, emailErr, 'Please enter a valid email address.');
    ok = false;
  } else setError(emailEl, emailErr, '');

  if (passEl.value.length < 6) {
    setError(passEl, passErr, 'Password must be at least 6 characters.');
    ok = false;
  } else setError(passEl, passErr, '');
  return ok;
}

emailEl.addEventListener('input', () => setError(emailEl, emailErr, ''));
passEl.addEventListener('input', () => setError(passEl, passErr, ''));

// ---------- Submit ----------
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validate()) return;

  btn.disabled = true;
  btnText.textContent = 'Signing in...';

  // TODO: replace with your real API call, e.g.
  // const res = await fetch('/api/login', { method:'POST', headers:{'Content-Type':'application/json'},
  //   body: JSON.stringify({ email: emailEl.value, password: passEl.value }) });
  await new Promise((r) => setTimeout(r, 1200));

  btn.disabled = false;
  btnText.textContent = 'Sign In';
  toast('Signed in successfully');
  sessionStorage.setItem('loggedIn', 'true');   // <-- add here
  setTimeout(() => { window.location.href = 'medok.html'; }, 600);
});

// ---------- Links ----------
document.getElementById('forgotLink').addEventListener('click', (e) => {
  e.preventDefault();
  toast('Password reset link would be sent to your email');
});
document.getElementById('signupLink').addEventListener('click', (e) => {
  e.preventDefault();
  toast('Sign Up page goes here');
});
