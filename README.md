# APEX DRIVE

Браузерная аркадная гоночная игра. Текущий результат — первая вертикальная срезка: процедурная спортивная машина, горная трасса, физика Rapier, круги, контрольные точки, HUD и пауза.

## Технологии

- JavaScript ES modules, Three.js 0.187.0, Rapier 3D 0.19.3, GSAP 3.15.0 и Vite 8.3.5.
- Flask 3.1.2 и SQLite.
- Vitest для фронтенда, pytest для API.

## Запуск

Требуются Node.js 20.19+ (либо 22.12+) и Python 3.11+.

```powershell
npm install
npm run dev
```

Откройте адрес Vite, показанный в терминале. API запускается отдельно:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
py -m pip install -r requirements.txt
npm run api
```

На Windows также можно запустить `START_GAME.bat`: он откроет Vite-сервер и браузер. Не открывайте `frontend/index.html` двойным щелчком — браузеру нужен HTTP-сервер Vite, чтобы загрузить CSS, ES-модули и Rapier/WASM.

API по умолчанию слушает `127.0.0.1:5000`; SQLite создаётся в `backend/data/apex_drive.sqlite3`. Для изолированного хранилища задайте `APEX_DATA_DIR`.

## Управление

- `W` / `↑` — газ.
- `S` / `↓` — тормоз и задний ход.
- `A` / `←`, `D` / `→` — поворот.
- `Space` — ручник.
- `R` — возврат к старту.
- `Escape` — пауза.
- `H` — подсказка.

## Проверки

```powershell
npm test
npm run build
pytest
```

## Документация

- [Дизайн игры](docs/GAME_DESIGN.md)
- [Архитектура](docs/ARCHITECTURE.md)
- [План фаз](docs/DEVELOPMENT_PLAN.md)
- [Каталог машин](docs/VEHICLE_CATALOG.md)
- [Каталог трасс](docs/TRACK_CATALOG.md)
- [API](docs/API.md)
- [Роли агентов](docs/agents/README.md)
- [Проектные инструкции и навыки](docs/skills/README.md)

## Текущие ограничения

В первом срезе трасса и машина построены из процедурной геометрии. Пока нет ИИ-соперников, карьеры, сохранения прогресса гонок, звуков двигателя, настоящих передач и выбора из каталога. Перечень фаз и их состояние ведутся в `docs/DEVELOPMENT_PLAN.md`.
