# Bead Jar — Project Plan

A digital reward jar: kids earn beads for doing good things, watch their
jar fill up, and spend them on rewards they've saved for. Built as a web
app that also installs on a phone (a Progressive Web App, or PWA).

*(It began as a single jar that simply filled up — Part IV and
[DESIGN.md](DESIGN.md) cover how it grew from there.)*

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

### Backend review *(2026-07-24)* — before Phase 9 could start

A review of the Phase 7–8 backend found the API had drifted out of sync
with the app: it still demanded `{ "jars": [...] }`, a shape the two design
pivots had erased. Fixed, along with the crash paths and cost risks found
alongside it:

- The API is now `GET`/`PUT /state/{syncId}` and stores an **opaque blob** —
  whatever JSON object the app sends comes back unchanged. The backend
  knows nothing about beads, so the app's data model can keep changing
  without a redeploy.
- A `revision` number makes two devices refuse to silently overwrite each
  other (a stale save gets a `409`). That's the concrete version of the
  "conflicts/merging" note in Phase 9 below.
- Crash fixes: a top-level `try/catch` (failures were escaping as bare
  502s), and a size check that counts real bytes instead of characters.
- Cost safety: 20 req/s rate limit on the API, 14-day log retention.
- Phase 7's `bead-jar-hello` was still live on a public URL that Terraform
  didn't manage — deleted.

Still open: **there is no authentication.** The sync code *is* the
credential, it rides in the URL, and CORS is `*`. Phase 16 replaces the
whole scheme rather than patching it.

## Phases 9 and 10 — *superseded*

*Phase 9 (a sync code the app types in) and Phase 10 (hardening that
scheme) were never built. The third pivot below replaces sync codes with
households and per-device tokens, so they're replaced rather than
patched. Their content now lives in Phases 13, 16, 17, 18 and 19.*

## Part III — The app grows

**Design pivot (2026-07-06):** ONE shared jar instead of a jar per habit.
Each bead now carries *why* it was earned — you award a bead for a
"behavior" (a named, colored task), and a history log records every bead
with its reason and time. The jar is the family's shared progress toward
a reward; its colors show what everyone has been doing. (Phase 4's
multi-jar work wasn't wasted — it taught the render-from-data pattern
this is built on.)

## Phase 11 — Rewards *(what the beads are FOR)*

**Reshaped by a second pivot (2026-07-19, Chris's call): the jar has no
upper limit.** It simply grows as beads accumulate; nothing is ever taken
out. Rewards are milestones along the way: each has a bead target, and
when the count crosses it, the reward is earned (confetti + earned date)
and the next target becomes the chase. The old "goal" migrated into the
first reward. Earned rewards form the trophy list; beads and history are
never destroyed.

## Part IV — The family jar

**Design pivot (2026-07-24, Chris's call): a jar per kid, and beads are
money.** Two things came up that the old design didn't cover. Kids wanted
their own jar — not to race, just to see their own effort. And milestone
rewards only work once: a kid with 200 beads has unlocked everything and
has nothing left to aim for. So rewards get a **price**, and spending
**deducts** beads. Kids ask; parents approve. Each reason is worth a
different number of beads. The household becomes a real account, with a
revocable token per device instead of a sync code.

This supersedes the 2026-07-06 pivot (one shared jar) and most of Phase
11's "nothing is ever taken out". The part worth keeping survives: effort
is never erased — the jar empties when you spend, but a permanent
"earned all-time" figure sits beside it, and history is never deleted.

**The full design is in [DESIGN.md](DESIGN.md)** — every phase below
builds on the state shape it defines, so it's worth reading before
Phase 12.

**Phases 12–15 touch no AWS at all.** The domain model gets settled
offline, where a mistake costs an edit instead of a `terraform apply`;
by the time Phase 16 starts, the state shape has stopped moving.

## Phase 12 — Currency *(beads become money)*

- Rewards get prices, reasons get bead values, and spending deducts.
- The bead list becomes an **append-only history**, and balances are
  worked out from it rather than stored. Migration from the old data,
  under a new storage key.
- A reward is redeemed directly — no asking flow yet.
- The data moves into its own file, `state.js`, which never touches the
  page. That split is what lets `check.mjs` test the arithmetic with
  plain `node` and no tooling — and it's the escape hatch if the
  rendering ever moves to a framework.
- **You'll learn:** deriving state from a list of events instead of
  storing it, and how to migrate real data without losing it.

## Phase 13 — Ship it *(real hosting)*

- Deploy to GitHub Pages so the PWA installs properly on a phone.
- Pulled forward from the old Phase 9: HTTPS is needed for the browser's
  id generator, and it's easier to build sync for an app the family is
  already using.
- **You'll learn:** static hosting, and what "secure context" means.

**Live at <https://duffduff.github.io/fable-bead-jar/>**, served from
`main` at the repo root — no build step, the files go up as they are.

Two things only work here, and never worked on the LAN:
`crypto.randomUUID` (it needs a *secure context*, so `https://` or
`localhost` — a plain `http://192.168.x.x` falls back), and the service
worker, which needs HTTPS too. Pulling the network and reloading now
gives the whole app back from cache.

Going public meant the AWS account id and the live API endpoint had to
come out of `backend/README.md` first — the API still takes writes from
anyone who knows the URL.

## Phase 14 — People *(profiles and roles)*

- A jar per kid. Parents see everyone; kids see their own.
- Parent and kid roles, a parent PIN, and the "who's this?" picker.
- Shared family device vs a personal one.
- Shared rewards plus per-kid extras.
- **You'll learn:** modelling roles and permissions in an interface.

## Phase 15 — Asking *(request and approve)*

- Kid asks to exchange beads; a parent approves or declines.
- Overdraft warnings, moving beads to the right kid, undo.
- The complete model, still entirely offline.
- **You'll learn:** state machines, and designing for mistakes.

## Phase 16 — Households and devices *(real accounts)*

- Three DynamoDB tables, invite codes, a token per device, revocation.
- **No app code.** Driven entirely from the terminal with curl, exactly
  the way Phase 8 was.
- **You'll learn:** token authentication, why you store a hash instead of
  a secret, and conditional writes.

## Phase 17 — Sync *(the app talks to the cloud)*

- Token storage, syncing on open and on focus, an offline outbox, and
  merging when two saves collide.
- **You'll learn:** offline-first design and optimistic concurrency.

## Phase 18 — Many devices *(what this was all for)*

- Invite codes in the UI with a countdown, adding a device, the device
  list, revoking one.
- Real two-device conflict testing.
- **You'll learn:** what distributed state does in practice.

## Phase 19 — Hardening and recovery

- Export and import, PIN reset, CORS locked to the real site, cost
  alarms, and a plan for history growing too big.
- **You'll learn:** what separates a demo from something you'd hand to
  someone else.

## Phase 20 — Insights *(what the beads say)*

- Per-kid and per-reason totals, beads per week, streaks.
- Nearly free, because Phase 12's history is already the dataset.
- **You'll learn:** deriving statistics from event data.

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
- [x] Backend review — opaque state API, conflict detection, hardening *(2026-07-24)*
- [~] Phases 9 & 10 — superseded by the 2026-07-24 pivot, never built
- [x] Design pivot — one jar, beads with reasons *(2026-07-06)*
- [x] Phase 11 — Rewards, reshaped: no-limit jar + milestone rewards *(2026-07-19)*
- [x] Design pivot — a jar per kid, beads are money *(2026-07-24, see DESIGN.md)*
- [x] Phase 12 — Currency *(2026-07-24)*
- [x] Phase 13 — Ship it *(2026-07-24)*
- [ ] Phase 14 — People
- [ ] Phase 15 — Asking
- [ ] Phase 16 — Households and devices
- [ ] Phase 17 — Sync
- [ ] Phase 18 — Many devices
- [ ] Phase 19 — Hardening and recovery
- [ ] Phase 20 — Insights
