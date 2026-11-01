# Відновлення пароля — Мій Улюбленець

Окремий мінімальний вебзастосунок для безпечного встановлення нового пароля в тестовому Supabase-проєкті `csdyppwfbzgcxzekqixn`. Реалізований на Vite і TypeScript без React. Клієнт додатково відхиляє endpoint не з цього тестового проєкту та будь-який ключ без префікса `sb_publishable_`.

## Локальний запуск

1. Встановіть Node.js і npm.
2. У цій папці встановіть залежності:

   ```sh
   npm install
   ```

3. Скопіюйте `.env.example` у `.env.local` і заповніть значеннями тестового Supabase:

   ```dotenv
   VITE_SUPABASE_URL=https://csdyppwfbzgcxzekqixn.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=ваш_публічний_publishable_ключ_тестового_проєкту
   ```

   Використовуйте лише publishable-ключ із префіксом `sb_publishable_`. Ніколи не додавайте `service_role` чи інший secret key у браузерний застосунок.

4. Додайте `http://localhost:5173/reset-password` до Redirect URLs тестового проєкту Supabase.
5. Запустіть сайт:

   ```sh
   npm run dev
   ```

Для перевірки повного callback-запиту створіть запит на відновлення через застосунок або Supabase Auth, налаштований на той самий redirect URL.

## Перевірка та production-збірка

```sh
npm run build
npm run preview
```

Vite створює production-файли в `dist/`. Файл `vercel.json` налаштовує переписування `/reset-password` на `index.html`, щоб пряме відкриття й перезавантаження цього маршруту працювали.

## Публікація на Vercel

1. Створіть GitHub-репозиторій `mii-uliublenets-password-reset` і додайте в нього вміст цієї папки. Не додавайте `.env.local` або інші локальні файли з ключами.
2. Імпортуйте цей репозиторій у Vercel. Якщо проєкт розміщений у монорепозиторії, задайте Root Directory `mii-uliublenets-password-reset`; для окремого репозиторію залиште кореневу директорію.
3. Вкажіть build command `npm run build` і output directory `dist`.
4. У Vercel Project Settings → Environment Variables додайте `VITE_SUPABASE_URL` і `VITE_SUPABASE_PUBLISHABLE_KEY` для потрібного середовища. Використовуйте тільки тестовий Supabase-проєкт до окремого підтвердження переходу на production.
5. Після першого deployment перевірте адресу `https://<ваш-домен>/reset-password` та її перезавантаження.
6. Лише після отримання постійного HTTPS-домену додайте точний URL сторінки, наприклад `https://<ваш-домен>/reset-password`, до Authentication → URL Configuration → Redirect URLs у тестовому Supabase. Для локальних перевірок окремо дозвольте `http://localhost:5173/reset-password`.
7. Перевірте, що шаблон листа відновлення використовує стандартне посилання Supabase, яке поважає переданий redirect URL. Не додавайте ключі чи токени вручну до шаблону.

Мобільний `redirectTo` у цьому репозиторії не змінюється. Після публікації URL сторінки його потрібно буде окремо оновити в мобільному застосунку.

## Callback і безпека

- Callback із `token_hash` приймається лише для `type=recovery` і підтверджується через `supabase.auth.verifyOtp({ token_hash, type: 'recovery' })`.
- Implicit recovery callback із `access_token`, `refresh_token` і `type=recovery` перевіряється через `setSession` та серверний `getUser`.
- PKCE `code` не обмінюється: verifier, створений в іншому середовищі (наприклад, у мобільному застосунку), не можна безпечно припускати доступним у браузері.
- Форма нового пароля доступна лише після успішного підтвердження recovery-сесії.
- Параметри callback видаляються з адресного рядка до мережевої перевірки. Токени не виводяться в інтерфейс і не записуються в логи.
- Supabase-клієнт використовує лише публічний ключ, не зберігає сесію між відвідуваннями та вимикає автоматичне розбирання URL.

## Межі цього проєкту

Цей сайт не змінює пароль користувачеві без дійсного recovery callback. Він не зберігає паролі в локальному сховищі й не має доступу до `service_role` або до бази даних напряму.
