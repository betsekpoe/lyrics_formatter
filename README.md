# Lyrics Formatter

Minimal web app for formatting lyric text into readable grouped lines.

## Project structure

- `index.html` - Main formatter page
- `pages/why.html` - "Why this exists" page
- `assets/css/style.css` - Shared styles
- `assets/js/script.js` - App logic
- `docs/TASKS.md` - Feature backlog
- `docs/LOGO_STYLE_GUIDE.txt` - Logo design brief

## Features

- Auto-format input into grouped line blocks with blank lines between groups
- Section-label filtering toggle (preserve or remove labels like Chorus/Verse)
- Alternate grouping modes: 2, 3, or custom size
- Replace tool that works on currently focused box
- Symbol mapper (applies to output)
- Auto-save + session restore after refresh

## How to use

1. Open `index.html` in your browser.
2. Paste your text into Input.
3. Select grouping mode and filter preference.
4. Use sidebar tools for mapping and replace operations.
5. Copy from Output when done.
