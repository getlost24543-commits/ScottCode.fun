# Aether — interactive atlas of the universe

Static site: HTML, CSS and JavaScript. No build step, no dependencies.

## Open it
Unzip, then double-click `index.html`. (Needs internet once for the Archivo font; it falls back to system fonts offline.)

## Put it online (free)
Drag the unzipped folder onto Netlify Drop (app.netlify.com/drop), or use Cloudflare Pages / GitHub Pages.

## Edit it
- `index.html`: all text and structure
- `css/style.css`: colors at the top (`:root`), layout below
- `js/main.js`: planets data, missions, timeline stages, travel speeds

## Try
Press and hold anywhere on the home screen to jump. Use arrow keys on the planets and timeline.

## Note
The "Join the list" form is front-end only. Connect it to an email service (see the TODO in `initSignup` in `js/main.js`).
