# 🚀 Публикация на GitHub и деплой на Vercel

Репозиторий уже настроен на `origin`: **https://github.com/lx-grzdv/career-hub-report.git**

## 1. Создать репозиторий на GitHub

1. Откройте [github.com/new](https://github.com/new).
2. **Repository name:** `career-hub-report` (или другой — тогда поменяйте remote, см. ниже).
3. **Public**, без README, .gitignore и лицензии (всё уже в проекте).
4. Нажмите **Create repository**.

Если имя репозитория другое — обновите remote:

```bash
git remote set-url origin https://github.com/ВАШ_USERNAME/ИМЯ_РЕПО.git
```

## 2. Авторизация и первый пуш

Выберите один способ.

### Вариант A: GitHub в браузере (рекомендуется)

1. В терминале выполните:
   ```bash
   cd "/Users/alexeygruzdev/Documents/Career Hub Report"
   git push -u origin main
   ```
2. Когда запросит логин — выберите **Sign in with your browser** и завершите вход в GitHub.
3. После успешного входа пуш выполнится.

### Вариант B: Personal Access Token (HTTPS)

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token**.
2. Выдайте право **repo**.
3. Скопируйте токен и выполните:
   ```bash
   git push -u origin main
   ```
   **Username:** ваш GitHub username  
   **Password:** вставьте токен (не пароль от аккаунта).

### Вариант C: SSH

1. Настройте [SSH-ключ на GitHub](https://docs.github.com/en/authentication/connecting-to-github-with-ssh).
2. Поменяйте remote на SSH и пушьте:
   ```bash
   git remote set-url origin git@github.com:lx-grzdv/career-hub-report.git
   git push -u origin main
   ```

## 3. Деплой на Vercel

1. Зайдите на [vercel.com](https://vercel.com) и войдите через **Continue with GitHub**.
2. **Add New** → **Project**.
3. Выберите репозиторий **career-hub-report** (или ваш) → **Import**.
4. Vercel подставит настройки:
   - **Framework Preset:** Vite  
   - **Build Command:** `npm run build` (или `pnpm build`)  
   - **Output Directory:** `dist`  
   - **Install Command:** `npm install` или `pnpm install`
5. Нажмите **Deploy**.

После деплоя сайт будет доступен по адресу вида `https://career-hub-report-xxx.vercel.app`. Домен можно изменить в настройках проекта Vercel.

## 4. Дальнейшие обновления

После изменений в коде:

```bash
git add .
git commit -m "Описание изменений"
git push
```

Vercel автоматически соберёт и задеплоит новый вариант при каждом пуше в ветку `main`.
