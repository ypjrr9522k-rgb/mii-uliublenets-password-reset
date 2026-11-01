import { createClient } from '@supabase/supabase-js';
import './style.css';

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Required page element is missing: ${selector}`);
  return element;
}

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Application root element was not found.');

app.innerHTML = `
  <main class="page-shell">
    <section class="reset-card" aria-labelledby="page-title">
      <a class="brand" href="/" aria-label="Мій Улюбленець — головна">
        <span class="brand-mark" aria-hidden="true">♥</span>
        <span>Мій Улюбленець</span>
      </a>
      <div class="card-content">
        <div class="eyebrow">Безпечне відновлення доступу</div>
        <h1 id="page-title">Новий пароль</h1>
        <p class="intro">Створіть новий пароль для свого профілю.</p>
        <div id="status" class="notice" role="status" aria-live="polite">
          Перевіряємо посилання для відновлення…
        </div>
        <form id="password-form" class="password-form" hidden novalidate>
          <label for="password">Новий пароль</label>
          <input
            id="password"
            name="password"
            type="password"
            autocomplete="new-password"
            minlength="8"
            required
            placeholder="Щонайменше 8 символів"
            disabled
          />
          <label for="password-confirm">Підтвердіть пароль</label>
          <input
            id="password-confirm"
            name="password-confirm"
            type="password"
            autocomplete="new-password"
            minlength="8"
            required
            placeholder="Введіть пароль ще раз"
            disabled
          />
          <p class="hint">Використайте щонайменше 8 символів.</p>
          <button id="submit-button" type="submit" disabled>Зберегти новий пароль</button>
        </form>
        <div id="success" class="success-panel" hidden>
          <span class="success-icon" aria-hidden="true">✓</span>
          <p>Пароль успішно змінено. Поверніться до застосунку та увійдіть із новим паролем</p>
        </div>
      </div>
      <p class="privacy-note">Якщо ви не запитували зміну пароля, просто закрийте цю сторінку.</p>
    </section>
  </main>
`;

const statusElement = requireElement<HTMLDivElement>('#status');
const form = requireElement<HTMLFormElement>('#password-form');
const passwordInput = requireElement<HTMLInputElement>('#password');
const passwordConfirmInput = requireElement<HTMLInputElement>('#password-confirm');
const submitButton = requireElement<HTMLButtonElement>('#submit-button');
const successElement = requireElement<HTMLDivElement>('#success');

const env = import.meta.env;
const supabaseUrl = env.VITE_SUPABASE_URL;
const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;

function isValidTestConfiguration(url: string | undefined, key: string | undefined): url is string {
  if (!url || !key || !key.startsWith('sb_publishable_')) return false;
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'https:'
      && parsedUrl.hostname === 'csdyppwfbzgcxzekqixn.supabase.co';
  } catch {
    return false;
  }
}

const supabase = isValidTestConfiguration(supabaseUrl, publishableKey)
  ? createClient(supabaseUrl, publishableKey, {
      auth: {
        detectSessionInUrl: false,
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

function showStatus(message: string, kind: 'info' | 'error' = 'info') {
  statusElement.textContent = message;
  statusElement.className = `notice notice--${kind}`;
  statusElement.hidden = false;
}

function clearCallbackFromAddressBar() {
  window.history.replaceState(null, document.title, window.location.pathname);
}

async function establishRecoverySession() {
  const callbackUrl = new URL(window.location.href);
  const query = callbackUrl.searchParams;
  const hash = new URLSearchParams(callbackUrl.hash.replace(/^#/, ''));
  const tokenHash = query.get('token_hash') ?? hash.get('token_hash');
  const callbackType = query.get('type') ?? hash.get('type');
  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');
  const hasPkceCode = query.has('code');

  if (query.size > 0 || hash.size > 0) clearCallbackFromAddressBar();

  if (!supabase) {
    showStatus('Сервіс відновлення не налаштовано для тестового проєкту. Зверніться до підтримки.', 'error');
    return;
  }

  if (hasPkceCode) {
    showStatus(
      'Це посилання потребує додаткового коду підтвердження, якого немає в цьому браузері. Запросіть новий лист для відновлення пароля.',
      'error',
    );
    return;
  }

  if (tokenHash) {
    if (callbackType !== 'recovery') {
      showStatus('Посилання не призначене для відновлення пароля. Запросіть новий лист.', 'error');
      return;
    }

    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'recovery',
    });

    if (error || !data.session || !data.user) {
      showStatus('Посилання недійсне, прострочене або вже використане. Запросіть новий лист.', 'error');
      return;
    }

    showPasswordForm();
    return;
  }

  if (accessToken || refreshToken) {
    if (callbackType !== 'recovery' || !accessToken || !refreshToken) {
      showStatus('Посилання недійсне або неповне. Запросіть новий лист для відновлення пароля.', 'error');
      return;
    }

    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error || !data.session || !data.user) {
      showStatus('Посилання недійсне, прострочене або вже використане. Запросіть новий лист.', 'error');
      return;
    }

    const { data: verifiedUser, error: verificationError } = await supabase.auth.getUser();
    if (verificationError || !verifiedUser.user) {
      await supabase.auth.signOut({ scope: 'local' });
      showStatus('Не вдалося підтвердити посилання. Запросіть новий лист для відновлення пароля.', 'error');
      return;
    }

    showPasswordForm();
    return;
  }

  showStatus('Відкрийте сторінку за посиланням із листа для відновлення пароля.', 'error');
}

function showPasswordForm() {
  statusElement.hidden = true;
  form.hidden = false;
  passwordInput.disabled = false;
  passwordConfirmInput.disabled = false;
  submitButton.disabled = false;
  passwordInput.focus();
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!supabase) {
    showStatus('Сторінка тимчасово недоступна. Спробуйте пізніше.', 'error');
    return;
  }

  const password = passwordInput.value;
  const confirmation = passwordConfirmInput.value;

  if (password.length < 8 || password.trim().length === 0) {
    showStatus('Пароль має містити щонайменше 8 символів і не може складатися лише з пробілів.', 'error');
    passwordInput.focus();
    return;
  }

  if (password !== confirmation) {
    showStatus('Паролі не збігаються. Перевірте введені значення.', 'error');
    passwordConfirmInput.focus();
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Зберігаємо…';
  showStatus('Змінюємо пароль…');

  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      showStatus('Не вдалося змінити пароль. Перевірте вимоги до пароля та спробуйте ще раз.', 'error');
      return;
    }

    form.hidden = true;
    statusElement.hidden = true;
    successElement.hidden = false;
  } catch {
    showStatus('Не вдалося змінити пароль через помилку з’єднання. Спробуйте ще раз.', 'error');
  } finally {
    if (successElement.hidden) {
      submitButton.disabled = false;
      submitButton.textContent = 'Зберегти новий пароль';
    }
  }
});

void establishRecoverySession().catch(() => {
  showStatus('Не вдалося перевірити посилання. Перевірте з’єднання та запросіть новий лист, якщо проблема повториться.', 'error');
});
