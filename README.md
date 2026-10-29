# Лекции по ООП (Java) — Явор Томов

Записки от лекциите за випуск 23 (233/234/235), УКТЦ. Статичен сайт за GitHub Pages.

## Как да добавиш лекция

1. Създай `.md` файл в папка `lections/`, напр. `04-nasledyavane.md`.
2. Добави го в `lections/lections.json`:
   ```json
   { "file": "04-nasledyavane.md", "title": "Наследяване", "date": "2026-10-29" }
   ```
   Лекцията с най-новата дата се показва на началната страница.
3. Снимките слагай в `img/` и ги вмъквай така: `![описание](../img/snimka.png)`.

## Локално

```bash
python -m http.server 8000
```

После отвори http://localhost:8000 (директно отваряне на `index.html` не работи, защото сайтът зарежда `.md` файловете с `fetch`).

## GitHub Pages

Settings → Pages → Source: *Deploy from a branch* → `main` / `(root)`.
