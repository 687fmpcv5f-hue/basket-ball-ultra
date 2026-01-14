# basket-ball-ultra

A small browser basketball mini-game (split into HTML, CSS, and JS).

This repository originally had the entire app embedded in README.md. The app has been refactored into separate files:

- `index.html` — game UI and markup
- `styles.css` — all styles and animations
- `app.js` — game logic, input handling, sounds, and main loop
- `assets/` — (suggested) put `swish.mp3`, `bounce.mp3`, `cheer.mp3`, `buzzer.mp3`, `bgm.mp3` here

Quick local run
1. Clone the repo:
   - git clone https://github.com/687fmpcv5f-hue/basket-ball-ultra
2. Ensure the audio files are present (or remove/replace audio element sources).
3. Open `index.html` in a browser (for development you can use a static server, e.g. `npx http-server` or `python -m http.server`).

Improvements included
- Modular code with a `Game` class and clear lifecycle (start, pause, resume, reset).
- Fixed previous truncation bug and removed accidental globals.
- Responsive layout and accessible controls (keyboard support).
- Clean separation of markup, styles, and scripts for maintainability.

If you'd like, I can:
- Add a minimal AI for PvC,
- Move assets into an assets/ folder and update paths,
- Commit these files to the repo for you (I can prepare a PR or push if you give permission and repo details).
