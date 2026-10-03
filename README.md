# FFOneWeb

Русский фанатский сайт FFOne на Astro и TypeScript. Статический портал в оформлении FusionFall Legacy: без сервера игры, авторизации, аналитики и подключения загрузки.

## Запуск

Требуется Node.js 22.12+ (или совместимая более новая версия).

```powershell
npm ci
npm run dev
```

Адрес: http://127.0.0.1:4321.

```powershell
npm run check
npm run build
npm run preview
```

Готовый статический сайт собирается в `dist/`. Сервер: `user1@slavicfall.ru`, сайт: `https://slavicfall.ru`. Развёртывание выполняется через Git скриптом `deploy/update.sh`.

## Где редактировать

- `src/pages/index.astro` — русские тексты, разделы и навигация.
- `src/styles/global.css` — оформление и адаптация для телефона.
- `src/components/DownloadButton.astro` — кнопка «Скачать». Сейчас это отключённая кнопка без URL, обработчика или сетевого запроса.
- `public/fonts/jeffe.otf` — заменённый JEFF из FFOneClient для заголовков, меню и кнопок.
- `public/fonts/chaletbook-regular.ttf` — шрифт FFOneClient для основного текста.
- `public/images/ffone-logo.png` — сгенерированный оригинальный логотип FFOne.
- `public/images/retro-heroes.png` — панорамный арт FusionFall Retro, опубликованный [Hayrullah на SteamGridDB](https://www.steamgriddb.com/hero/68458).
- `public/images/legacy-eddy.png`, `legacy-zoocrew.png` — оригинальные баннерные иллюстрации с архивного сайта FusionFall Legacy.

Референс: [FusionFall Legacy, архив от 28 января 2020](https://web.archive.org/web/20200128183901/https://www.fusionfalllegacy.com/). Фон лаборатории, рамка баннера, исходные спрайты кнопок, фоны навигации и текстуры панелей перенесены из указанного референса. Исходный логотип FusionFall, CSS и скрипты не используются. Заголовки и меню написаны по-русски заменённым JEFF.

Логотип создан встроенным imagegen: «Transparent original FFOne wordmark, exact capitalization, silver-white beveled FF and acid-green One, thick dark outlines, dynamic early-2000s sci-fi cartoon videogame lettering; not the FusionFall logo; no extra text».

Сгенерированный фон города удалён. Все иллюстрации в баннере — существующие арты FusionFall Legacy/Retro. Отдельный логотип FFOne сохранён по первоначальному запросу.

## Обновление сервера

После коммита и push в `main`:

```powershell
ssh user1@slavicfall.ru 'bash /opt/FFOneWeb/deploy/update.sh'
```

Скрипт делает `git pull --ff-only`, устанавливает зависимости по lockfile, проверяет и собирает сайт, затем атомарно переключает `/var/www/ffone/current` на новый выпуск. Предыдущие выпуски сохраняются для отката. Настройка Nginx: `deploy/slavicfall.ru.conf`; сертификат обслуживает Certbot.

## Карта мира

Раздел `#map`: canvas с масштабом, перемещением, поиском NPC и переключателями слоёв. Изображение и преобразование координат взяты из OpenFusionProject/OpenFusionMap-rs (MIT); новый интерфейс реализован на TypeScript. Источник: https://github.com/OpenFusionProject/OpenFusionMap-rs .

`deploy/map-api.mjs` читает NPC и имена из действующих таблиц `/opt/rustyfusion/tabledata` и получает игроков из monitor TCP `127.0.0.1:8003`. Публикует только имена и игровые координаты; сообщения, почта и прочие события отбрасываются. NPC из отдельных инстансов исключены из общей карты. Снимок игроков протухает через 15 секунд, старые позиции не показываются. На странице обновление выполняется каждые три секунды только при открытой карте.

Сервис: `deploy/ffone-map.service`, HTTP только на `127.0.0.1:8890`; Nginx проксирует `/map-api/`. После установки сервиса `deploy/update.sh` перезапускает его при каждом обновлении. Для локального API задайте `MAP_TABLEDATA` и запустите `node deploy/map-api.mjs`; monitor-порт задаётся через `MONITOR_PORT`. В локальной разработке без proxy показывается сообщение о недоступности данных.
