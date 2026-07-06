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

## Part II — A real backend (serverless on AWS)

Goal: jars that sync between devices. The app talks to an API built on
AWS Lambda — code that runs in the cloud only when called, with no server
to maintain, and effectively free at our scale.

## Phase 7 — Hello, Lambda *(the primitives, by hand)*

- One tiny function deployed to AWS with raw CLI commands — no frameworks —
  so every moving part is visible: the code zip, the IAM role (its
  permission badge), the function, and a public URL.
- Call it from the terminal and see it respond from the cloud.
- **You'll learn:** what "serverless" actually means, IAM roles, and what
  a Lambda is under the costume.

## Phase 8 — A real API *(infrastructure as code)*

- Feel the pain of hand-run commands, then fix it: declare everything in
  Terraform and deploy with one command.
- A DynamoDB table to store jars, and real endpoints:
  `GET /jars/{syncId}` and `PUT /jars/{syncId}` behind API Gateway.
- **You'll learn:** infrastructure as code with Terraform (plan/apply,
  state), NoSQL basics, API design.

## Phase 9 — Connect the app *(sync)*

- The frontend gets a "sync code": jars save to the cloud and load on any
  device with the same code. localStorage stays as the offline copy.
- Deploy the frontend to real hosting (GitHub Pages) so your phone can
  finally install the PWA.
- **You'll learn:** fetch(), CORS, and thinking about conflicts/merging.

## Phase 10 — Hardening *(only if wanted)*

- Input validation, rate limiting, real accounts instead of sync codes,
  cost alarms.
- **You'll learn:** what separates a demo API from one you'd give strangers.

## Part III — The app grows

**Design pivot (2026-07-06):** ONE shared jar instead of a jar per habit.
Each bead now carries *why* it was earned — you award a bead for a
"behavior" (a named, colored task), and a history log records every bead
with its reason and time. The jar is the family's shared progress toward
a reward; its colors show what everyone has been doing. (Phase 4's
multi-jar work wasn't wasted — it taught the render-from-data pattern
this is built on.)

## Phase 11 — Rewards *(what filling the jar means)*

- Set the reward while filling ("when full: trip to the zoo"), show it on
  the jar, and a proper "jar is full" ceremony: celebrate, archive the
  filled jar into a trophy shelf, start fresh.
- Editable goal size.

## Phase 12 — Insights *(what the beads say)*

- Per-behavior totals, beads-per-week, streaks ("5 days in a row!").
- **You'll learn:** deriving statistics from event data — the log built in
  the pivot becomes a dataset.

## Phase 13 — Family *(more people)*

- Profiles (each kid their own jar, or beads tagged per kid).
- A parent mode: only parents award/remove beads (PIN), kids can watch.
- Builds on Phase 9's sync so everyone sees the same jar.

## Phase 14 — Quality of life

- Undo, export/import of data, optional sounds, jar themes.

## Progress

- [x] Phase 0 — Foundations *(2026-07-05)*
- [x] Phase 1 — A jar you can see *(2026-07-05)*
- [x] Phase 2 — A jar you can use *(2026-07-05)*
- [x] Phase 3 — A jar that remembers *(2026-07-05)*
- [x] Phase 4 — Real habits *(2026-07-05)*
- [x] Phase 5 — Delight *(2026-07-05)*
- [x] Phase 6 — On your phone *(2026-07-05)*
- [x] Phase 7 — Hello, Lambda *(2026-07-05)*
- [x] Phase 8 — A real API *(2026-07-05)*
- [ ] Phase 9 — Connect the app
- [ ] Phase 10 — Hardening
- [x] Design pivot — one jar, beads with reasons *(2026-07-06)*
- [ ] Phase 11 — Rewards
- [ ] Phase 12 — Insights
- [ ] Phase 13 — Family
- [ ] Phase 14 — Quality of life
