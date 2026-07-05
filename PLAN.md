# Bead Jar — Project Plan

A digital reward jar: add beads when you (or your kids) do something good,
watch the jar fill up, and celebrate when it's full. Built as a web app that
also installs on a phone (a Progressive Web App, or PWA).

## Guiding principles

- **Learn by building.** Each phase produces something you can see and use.
- **No frameworks at first.** Plain HTML, CSS, and JavaScript — the
  fundamentals everything else is built on. We can add tools later *when we
  feel the pain they solve*, which is the best way to understand them.
- **Local-first.** Data lives on your device (no accounts, no server) until
  the app earns the complexity of syncing.

## Phase 0 — Foundations *(setup, ~one short session)*

- Initialize a git repository and learn the basic commit workflow.
- Create the project skeleton: `index.html`, `style.css`, `app.js`.
- Get a "hello world" page open in the browser.
- **You'll learn:** what git is for, how a browser loads a page from files.

## Phase 1 — A jar you can see *(HTML & CSS)*

- Draw the jar and beads with HTML and CSS (no logic yet — a fixed number
  of beads).
- Make it look good: colors, a jar shape, beads that sit in the jar.
- **You'll learn:** HTML structure, CSS styling and layout.

## Phase 2 — A jar you can use *(JavaScript)*

- An "add bead" button that drops a new bead into the jar.
- A "remove bead" button (for taking one out, or fixing mistakes).
- A counter showing beads / goal (e.g. "7 / 20").
- **You'll learn:** JavaScript basics — variables, functions, responding to
  clicks, changing the page from code.

## Phase 3 — A jar that remembers *(persistence)*

- Save the bead count in the browser's localStorage so it survives closing
  the tab or restarting the computer.
- **You'll learn:** how apps store data, and the load → change → save cycle
  at the heart of almost every app.

## Phase 4 — Real habits *(app structure)*

- Multiple named jars (one per habit or per kid), each with its own goal
  size and bead color.
- Create, rename, and delete jars.
- **You'll learn:** structuring data (lists of objects), rendering a UI from
  data instead of hand-writing it — the core idea behind React and friends.

## Phase 5 — Delight *(polish)*

- A bead-drop animation when you add a bead.
- A celebration when the jar is full (confetti!).
- Optional: a log of *why* each bead was earned.
- **You'll learn:** CSS animations and making software feel good, not just work.

## Phase 6 — On your phone *(mobile + PWA)*

- Make the layout responsive so it works on a small screen.
- Add a web app manifest and service worker so it can be **installed on a
  phone home screen** and works offline.
- **You'll learn:** responsive design, what makes a web app "installable".

## Phase 7 — Stretch goals *(only if wanted)*

- Sync between devices (this is where a server/account would enter).
- Multiple users / family sharing.
- Reward pictures ("when full: trip to the zoo").

## Progress

- [x] Phase 0 — Foundations *(2026-07-05)*
- [x] Phase 1 — A jar you can see *(2026-07-05)*
- [x] Phase 2 — A jar you can use *(2026-07-05)*
- [x] Phase 3 — A jar that remembers *(2026-07-05)*
- [x] Phase 4 — Real habits *(2026-07-05)*
- [ ] Phase 5 — Delight
- [ ] Phase 6 — On your phone
- [ ] Phase 7 — Stretch goals
