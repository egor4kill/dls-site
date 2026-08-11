# Подключение Decap CMS к GitHub Pages

GitHub Pages размещает статические файлы, но не выполняет серверный OAuth-код.
Поэтому Decap CMS нужны GitHub-репозиторий и отдельный OAuth-прокси.

## 1. Создать репозиторий

1. Установить Git: https://git-scm.com/download/win
2. Создать на GitHub пустой репозиторий без README, например `dls-site`.
3. В `admin/config.yml` заменить:

```yaml
repo: YOUR_GITHUB_USERNAME/YOUR_REPOSITORY_NAME
```

на реальный адрес:

```yaml
repo: username/dls-site
```

4. Загрузить проект в ветку `main`.

## 2. Включить GitHub Pages

В репозитории открыть `Settings -> Pages` и выбрать `Source: GitHub Actions`.
Workflow `.github/workflows/pages.yml` установит зависимости, соберёт Eleventy и
опубликует папку `_site` после каждого изменения ветки `main`.

Адрес будет выглядеть так:

```text
https://username.github.io/dls-site/
```

Если репозиторий называется `username.github.io`, удалите переменную
`ELEVENTY_PATH_PREFIX` из workflow: такой сайт публикуется в корне домена.

## 3. Развернуть OAuth-прокси

OAuth Worker на базе `sterlingwes/decap-proxy` уже добавлен в папку
`oauth-proxy/`. Секреты в проект не записываются.

1. Создать GitHub OAuth App: `GitHub -> Settings -> Developer settings -> OAuth Apps`.
2. В `Homepage URL` указать публичный адрес сайта.
3. В `Authorization callback URL` указать `https://АДРЕС-ПРОКСИ/callback`.
4. Авторизовать Wrangler в Cloudflare:

```powershell
$env:PATH = "C:\Program Files\nodejs;$env:PATH"
& "C:\Program Files\nodejs\npm.cmd" run proxy:login
```

5. Передать GitHub Client ID и Client Secret в секреты Cloudflare. Каждая
   команда запросит значение интерактивно:

```powershell
& "C:\Program Files\nodejs\npm.cmd" run proxy:secret:id
& "C:\Program Files\nodejs\npm.cmd" run proxy:secret:key
```

6. Развернуть Worker:

```powershell
& "C:\Program Files\nodejs\npm.cmd" run proxy:deploy
```

Wrangler покажет адрес вида `https://dls-decap-proxy.account.workers.dev`.
Откройте его в браузере: должна появиться строка `Decap CMS OAuth proxy is
running.`. Именно этот адрес используется как `base_url`.

7. Передать адрес Worker в CMS.
5. В `admin/config.yml`, внутри `backend`, добавить:

```yaml
base_url: https://АДРЕС-ПРОКСИ
auth_endpoint: auth
site_domain: username.github.io
```

Итоговый блок:

```yaml
backend:
  name: github
  repo: username/dls-site
  branch: main
  base_url: https://АДРЕС-ПРОКСИ
  auth_endpoint: auth
  site_domain: username.github.io
```

Не добавляйте GitHub Client Secret в `admin/config.yml` или репозиторий.

Если репозиторий приватный, измените в `oauth-proxy/wrangler.toml` значение
`GITHUB_REPO_PRIVATE` с `"0"` на `"1"` и повторите `proxy:deploy`.

## 4. Проверить панель

Открыть:

```text
https://username.github.io/dls-site/admin/
```

Войти через GitHub. Пользователь должен иметь право записи в репозиторий.
После публикации CMS создаёт Markdown-файл, GitHub Actions пересобирает сайт,
и через несколько минут новость появляется в ленте.

## Локальная проверка CMS

В двух терминалах из корня проекта запустить:

```powershell
$env:PATH = "C:\Program Files\nodejs;$env:PATH"
& "C:\Program Files\nodejs\npm.cmd" run dev
```

```powershell
$env:PATH = "C:\Program Files\nodejs;$env:PATH"
& "C:\Program Files\nodejs\npm.cmd" run cms
```

Затем открыть `http://localhost:8080/admin/`. Локальный режим изменяет файлы
на диске напрямую и не требует GitHub OAuth.

## Единые источники данных

- Категории и их цвета меняются только в `src/_data/categories.json`.
- `admin/config.yml` синхронизируется автоматически перед `dev`, `build` и
  `cms`; вручную блок между `BEGIN GENERATED CATEGORIES` и
  `END GENERATED CATEGORIES` редактировать нельзя.
- Пункты меню меняются только в `src/_data/site.json`, массив `nav`.
- Новость создаётся одним Markdown-файлом в `src/content/news/` или одной
  записью в CMS. Шаблон, URL и попадание в коллекцию задаются автоматически
  файлом `src/content/news/news.json`.
