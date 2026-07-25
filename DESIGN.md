# Bead Jar — Design

How the app works and why. `PLAN.md` says what we're building and in what order;
this file says what the thing actually *is*.

Written 2026-07-24, at the third design pivot.

---

## What changed, and why

The app started as one jar on one device. Then it became one *shared family* jar where
each bead carried a reason. Now it changes again, because two things came up that the
old design didn't cover:

**Kids want their own jar.** Not to race each other — just to see their own effort
without three other children's beads mixed into it.

**Beads need to buy something.** The old design made rewards *milestones*: cross 20 beads
and the reward unlocks forever, nothing is taken out. That works once. The second time, a
kid who has 200 beads has already unlocked every reward and there's nothing left to aim
for. Beads have to be **spent** to stay meaningful.

So:

| Was | Now |
|---|---|
| One shared family jar | A jar **per kid** |
| Beads only ever accumulate | Beads are **currency** — rewards cost beads |
| Rewards are milestones you cross | Rewards are things you **buy** |
| Anyone holding the phone can do anything | **Parents** award and approve; **kids** earn, watch, and ask |
| No identity at all | A **household**, with a token per device |
| Every bead worth the same | Each reason has its own **bead value** |

The old design's best idea carries over: **effort is never erased.** The jar empties when
a kid spends — that's what spending *means* — but a permanent "earned 200 beads all-time"
figure sits beside it, and history is never deleted.

---

## The people

A **household** contains **profiles**. Every profile has a role:

- **Parent** — can do everything.
- **Kid** — sees their own jar, their own history, and the rewards they could buy. They
  can *ask* to exchange beads for a reward. They cannot award beads.

A parent has a 4-digit **PIN**. On a shared family tablet, that PIN is what stands between
a child and parent mode.

> The PIN gates picking "Grown-up" in the who's-this list, not just the settings screen —
> otherwise a kid can tap Dad and award their own beads all afternoon.

Kids don't have PINs. On a shared tablet, any kid can tap any other kid's name and see
their jar. That's an honour system: a parent is usually nearby, and a four-year-old locked
out by a forgotten PIN is the worse problem. Real separation exists on a kid's own phone,
which opens straight into their own jar.

---

## Beads are money

### The ledger

The app no longer stores a list of beads or a count. It stores an **append-only ledger** —
a list of things that happened, which is never edited and never deleted:

```js
ledger: [
  { id, profileId, type: "earn",  amount: 3,   behaviorId, at, actorProfileId },
  { id, profileId, type: "spend", amount: -20, rewardId,   at, actorProfileId },
  { id, profileId, type: "adjust", amount: -3, at, actorProfileId, note },
]
```

Everything else is **worked out** from it:

```js
balance(profile)       = sum of every amount            // what they can spend
lifetimeEarned(profile) = sum of the positive amounts   // only ever goes up
```

It's the biggest conceptual change in the app, and it buys four things:

- **"Where did my beads go?"** is the single most likely argument in a family using this.
  A ledger answers it. A number can't.
- **A mistake is corrected by adding, not removing.** Award beads to the wrong child and
  the fix is a reversal entry plus a new earn entry — both visible, nothing rewritten.
- **Merging two devices becomes possible.** Two phones that each added entries can simply
  be combined. A balance is a *sum*, and a sum doesn't care what order it arrives in.
  Two phones that each edited a *number* can only fight.
- **Phase 20's insights come free.** Per-kid totals, per-reason totals and streaks are all
  just different questions asked of the same list.

One entry covers a whole award (`amount: 3`), not one entry per bead. That matters for
size — see [Growing too big](#growing-too-big).

> In the interface, this is called **history**.

### What a bead is worth

Each reason carries its own value:

```js
behaviors: [
  { id, name: "Homework done",  color: "blue", value: 3 },
  { id, name: "Brushed teeth",  color: "green", value: 1 },
]
```

Tapping a reason awards that many beads. A parent can still override the amount for a
one-off ("you did *all* the washing up — have 5").

### Going into the red

Balances can go **negative**, and the app says so plainly: *"you owe 40 beads"*.

That falls out of how syncing works. Picture two parents, both with no signal, each
approving a 50-bead reward against the same 60-bead balance. Both phones come back online.
The beads are already spent. Nothing can reject either one after the fact — a merge that
never throws anything away can't enforce a rule about a *total*.

So the app plans for it:

- Approving something that would overdraw shows a warning first —
  *"this leaves Sam at −40. Approve anyway?"* — but never blocks it.
- Negative balances are shown as they are, and earning beads climbs back out.

---

## Rewards, and asking for them

A reward has a **price**:

```js
rewards: [
  { id, name: "Movie night",     price: 20, forProfileId: null },  // anyone
  { id, name: "Trip to the zoo", price: 30, forProfileId: null },
  { id, name: "New football",    price: 50, forProfileId: 7 },     // just for Sam
]
```

`forProfileId: null` means it's part of the **shared catalogue** — every kid can work
toward it. A profile id makes it a **personal extra** a parent has set for one child.

### The asking flow

A kid never spends beads on their own. They *ask*, and a parent decides:

```
Kid:     [ Exchange: Movie night — 20 beads ]
         → "Asked for Movie night. Waiting for a grown-up."   (can be cancelled)

Parent:  ⏳ Ella wants Movie night (20 beads)
         [ Approve ]   [ Not yet ]

Approved → 20 beads deducted, logged in Ella's history
```

Nothing is deducted until a parent approves — which matches how it works in a real
kitchen, and stops a kid redeeming an ice cream at 9pm on a school night.

```js
requests: [{
  id, profileId, rewardId,
  rewardName,        // snapshotted — so a deleted reward doesn't orphan the request
  priceAtRequest,    // snapshotted — so changing the price mid-ask isn't a surprise
  status: "pending" | "approved" | "declined" | "cancelled",
  requestedAt, decidedAt, decidedBy,
}]
```

Both snapshots exist for the same reason: the request has to still make sense later, even
if the reward it points at has been renamed, re-priced, or removed.

A request only works if a parent sees it, so the app syncs when it opens, when it comes
back into focus, and (debounced) whenever something changes — and a parent's screen
carries a badge with the number waiting. Otherwise a request can sit unnoticed for days.

---

## Accounts

There are **no usernames, no passwords, and no email addresses.** The account is the
household, and the credential is the device.

### How a device gets in

```
Phone 1:   "Start a new family jar"
           → household created, this device gets a secret token

           Settings → Devices → Add a device
           → invite code:  BEAD-7K2Q     (expires in 15 minutes)

Phone 2:   "Join with an invite code"  →  BEAD-7K2Q
           → this device gets its OWN token

Thereafter, every request:
           Authorization: Bearer <that device's token>
```

Each device holds its own token, so any single device can be revoked without disturbing
the others. **The token never appears in a URL.** The previous design put the sync code in
the path (`/state/{syncId}`), which meant the credential landed in server access logs and
browser history, and could never be taken back.

### The details that matter

**Tokens** are 32 random bytes. The server stores only a **SHA-256 hash** of the token,
never the token itself — so a leaked database doesn't hand over anyone's jar.

> The hash is deliberately **unsalted and unstretched**, which is the opposite of the rule
> for passwords. Salting and slow hashing exist to defend *low-entropy* secrets — a human
> picked "hunter2" and an attacker can guess it. There is nothing to guess about 256 random
> bits, so a plain fast hash is the right tool.

**Invite codes** are 8 characters of Crockford base32 — `23456789ABCDEFGHJKMNPQRSTVWXYZ`,
with `I`, `L`, `O`, `U`, `0` and `1` left out so a code can be read aloud across a kitchen
without anyone asking "letter O or zero?". Codes expire after **15 minutes**, are
**single-use**, and only one is live per household at a time.

Single-use is enforced by the *database*, with a conditional write:

```js
ConditionExpression: "attribute_exists(code) AND attribute_not_exists(usedAt) AND expiresAt > :now"
UpdateExpression:    "SET usedAt = :now"
```

The expiry alone can't enforce it: DynamoDB's TTL deletes expired rows on a best-effort
basis and **can lag by up to 48 hours**, so a code that "expired" is still sitting there,
readable and usable, unless the handler checks.

If the condition fails, the answer is always the same sentence — *"that code isn't valid
any more"* — whether it was wrong, used, or expired. Three different messages would tell
an attacker which guesses were close, and would give the user three confusing things to
read instead of one clear one.

**Why 15 minutes matters more than the rate limit.** The API allows 20 requests a second.
Over a 15-minute window that's about 18,000 guesses against 32⁸ ≈ 1.1 × 10¹² possible
codes — roughly a 1-in-60-million chance. But a rate limit is a *throttle*, not a lockout:
nothing stops an attacker grinding away for months. The short expiry is what actually
closes the door.

---

## The app, screen by screen

### First run

1. **Start a new family jar** or **Join with an invite code**
2. Starting new: your name → choose a PIN → name this device
3. Add the kids — name and colour
4. Add some reasons (with bead values) and some rewards (with prices)
5. **Add a second parent device.** The app makes the case for this at setup — see
   [No way back in](#no-way-back-in).

### On a shared family tablet

Opens on a picker — every kid, plus 🔒 **Grown-up**. Tap a kid, see their jar. Tap
Grown-up, enter the PIN. Parent mode relocks when the app goes to the background or after
a few idle minutes.

### On a personal device

Bound to one profile when the invite code is redeemed. A kid's phone opens straight into
their own jar. A parent's phone opens into parent mode, with an optional
"ask for the PIN every time" setting (off by default — it's their own phone).

### A kid's jar

```
        ╔═════╗
        ║ ●●  ║      20 beads to spend
        ╚═════╝
   🏆 200 earned all-time
   🎁 3 rewards enjoyed

   Movie night        20   [ Exchange ]
   Pick dinner        15   [ Exchange ]
   Trip to the zoo    30   10 more beads
```

Rewards are sorted by what they can afford *now*, so the screen doesn't open as a wall of
things they can't have. Below that: their history, earns and spends together.

There's no award button on this screen.

### A parent's view

- Every kid's jar at a glance, with balances
- **Waiting requests at the top** — approve, or not yet
- **Award beads**: pick who (one child or several at once — everyone tidied up), pick a
  reason, adjust the amount if you like
- Manage reasons, rewards, profiles and devices
- The whole household's history, filterable by kid

### Fixing mistakes

Two things go wrong in the first week of real use, so both are designed in from the start:

**Beads went to the wrong child.** A *move to another kid* action: a reversal on one, a
matching earn on the other, both visible in history.

**A fat-fingered "award 10".** Two different mechanisms, depending on timing:

- Not synced yet → the entry is dropped from the outbox, and history stays clean.
- Already synced → a reversal entry is appended, because other devices have already seen it.

---

## Syncing between devices

Each device keeps a full local copy and works offline. The cloud holds one blob per
household with a `revision` number; saving with a stale revision is rejected with a `409`,
and the device then refetches, merges, and retries.

### Merge rules

Merging covers **all five collections**, not just history. It's the easiest part to get
wrong: if only the ledger merged, a device that renamed a reward and hit a 409 would
replay its history entries and lose the rename with no sign that anything happened.

- **Union by `id`.** For a record both sides have, the one with the newer `updatedAt` wins.
  So every record in every collection carries an `updatedAt`.
- **Deleting is a tombstone** — `archived: true`, never an actual removal. A record that
  vanished from one device would otherwise be resurrected by the other.
- **The outbox is the source of truth** for un-synced entries — not the state. An entry
  leaves the outbox only when a save that *contained it* returns 200. Clearing the queue on
  any successful save silently drops anything created in between.
- **IDs are minted once, before the first attempt, and reused on every retry.** The case
  this covers: a save succeeds but the response is lost (tunnel, backgrounded tab), so the
  device assumes failure and retries. Stable ids make that second attempt harmless.
- **On 409:** refetch → merge → retry, with jittered backoff, giving up after about three
  attempts with "we'll sync later".

### Two ids, two rules

```js
crypto.randomUUID()        // things that genuinely happened independently
"spend:" + requestId       // things derived from a decision
"reverse:" + entryId
```

Independent events get random ids: two parents each awarding a bead really *is* two beads.

But things *derived* from a decision get a **deterministic** id built from what they came
from. If two parents both approve the same request, both devices generate the spend entry
with the id `spend:abc123` — and union-by-id collapses them into one. Double-approval
becomes harmless for free, with no locking and no coordination.

> `crypto.randomUUID` only exists in a secure context. It works on `https://` and on
> `localhost`, but throws on a plain `http://192.168.1.5` — which is exactly how you'd
> test on a phone over the LAN. A small `crypto.getRandomValues` fallback covers it.

### What clocks do and don't affect

**Balances don't care about clocks.** They're a sum, and a sum is order-independent —
a tablet with the wrong date still computes the right balance.

**Displaying history does**, and two entries can share a timestamp to the millisecond.
Sorting falls back to the entry's id when the times are equal: arbitrary, but identical
on every device, so nobody sees a different jar from the same history.

**Record edits do.** Last-write-wins compares `updatedAt`, so a device with a badly wrong
clock could win a rename it shouldn't. For a family app, that's an acceptable trade.

### One error that isn't ours

A `429` (too many requests) comes from API Gateway, not from our code, so it has a
different body shape with no `error` field. Treating it like our own errors throws a
parse error on top of the rate limit.

---

## The server

Three tables, kept separate. DynamoDB convention would fold them into one (it's called
single-table design); three separate ones are easier to read while learning:

| Table | Key | Holds |
|---|---|---|
| `bead-jar-households` | `householdId` | the state blob, `revision`, `savedAt` |
| `bead-jar-devices` | `tokenHash` | `householdId`, `profileId`, `role`, `label` |
| `bead-jar-invites` | `code` | `householdId`, `expiresAt` (TTL), `usedAt` |

```
POST   /households              → { householdId, token, state }
POST   /invites                 (parent) → { code, expiresAt }
POST   /devices                 { code, label, profileId? } → { householdId, token, state }
GET    /state                   → { state, revision, me: { profileId, role, householdId } }
PUT    /state                   { state, revision } → { savedAt, revision }
GET    /devices                 (parent) → the household's devices
DELETE /devices/{tokenHash}     a parent revokes any; any device revokes itself
```

`GET /state` returns a `me` block so a device can ask *"who am I?"* after a restart
without having to trust whatever localStorage says.

**`tokenHash` is both the primary key and the public device id.** The alternative — a
separate `deviceId` as the key, with `tokenHash` in an index — would put an
eventually-consistent index lookup on every authenticated request, and a freshly-created
device would get a 401 on its first call. A hash isn't a secret, so showing it is fine.

### Growing too big

DynamoDB refuses any row over 400KB, and the API caps a save at 300KB. A history entry is
roughly 150 bytes, so that's about 2,000 entries — three kids at five awards a day is
**around four months**.

Phase 19 handles it: fold entries older than a few months into a single "opening balance"
entry, and keep the detail in a local-only archive. The old one-row-per-bead design had
the same wall at about 680 beads.

---

## Limits

Things this design doesn't do, and the reasoning behind each.

### The server can't stop a determined kid

The server stores the household state as an **opaque blob** — it never looks inside. That's
what lets the app change its own data model without redeploying the backend. It also means
the server can't see beads, so:

- **The server enforces:** which household a token belongs to, and whether a parent-only
  route may be called.
- **The app enforces, on the device only:** that kids can't award themselves beads.

Every device holds the *whole household's* data and can save arbitrary state back. **A kid
who opens developer tools can give themselves a thousand beads**, or wipe a sibling's
history. The PIN is a speed bump against a seven-year-old, not a security control.

For a family app that's a reasonable trade — but it's a house rule, not security. Moving
those rules to the server later would be a real piece of work rather than a setting:
comparing two opaque blobs to work out "did this device award beads it shouldn't have?"
isn't practical, so it would need a separate append-only events endpoint.

### No way back in

There is no email address, no password, and therefore **no account recovery**. Lose every
parent device — or forget the PIN with only one device set up — and the household is gone.

Two things soften it:

- Setup encourages adding a **second parent device** before finishing.
- **Export and import** is pulled forward from the old Phase 14 into Phase 19, so there's
  always a file you can keep.

### Siblings can peek

Covered above: on a shared tablet, kid privacy is honour-system only.

---

## Coming from the old version

Existing data is a single shared jar, stored under `bead-jar-v3` as:

```js
{ version: 4, behaviors: [...], beads: [{ id, behaviorId, at }], rewards: [{ id, name, target, earnedAt }] }
```

The new state is written to a **new key, `bead-jar-v5`**, and the old blob is left exactly
where it is as a free backup.

> The new key prevents a data-loss bug. The service worker falls back to a cached `app.js`
> when offline, and the *old* app reading v5 data fails its `Array.isArray(data.beads)`
> check, decides there's nothing there, and saves an empty state straight over it. A
> separate key puts the two versions out of each other's reach.

What happens to each piece:

**Beads** → one `earn` entry each, `amount: 1`. Beads migrated from very old versions have
`at: null` ("before today"), and the ledger keeps tolerating that.

**Rewards already earned** → these were *milestones that were never paid for*. They become
a purchase that cost **0** beads, so the trophies survive and nobody wakes up bankrupt.
Deducting their old `target` retroactively would open the app on a large negative balance
on day one.

> Rewards are a catalogue you buy from repeatedly, not milestones you cross once, so an
> old earned reward is simply a past purchase — a zero-amount `spend` entry. It doesn't
> need the request machinery, which is why this works before Phase 15 exists.

**Rewards not yet earned** → `target` becomes `price`. But these mean genuinely different
things: a 100-bead *milestone* was reachable at 100 beads earned over all time, while a
100-bead *price* has to be affordable right now. So migration shows a one-time prompt:
*"your rewards have prices now — worth checking them."*

**Profiles** → didn't exist. Migration can't guess whether 400 beads belong to one child or
four, so it runs a short setup asking who's in the family, and the "move to another kid"
action handles the rest.

**Behaviour ids** are integers today and new ids are strings. Mixing them is fine —
matching is by id, and an id is just a key. The old `Math.max(0, ...ids) + 1` trick
doesn't survive the change though: run it over a string id and it returns `NaN`, minting
broken ids from then on. All three call sites are replaced.

**In the cloud**, nothing of value exists — Phase 9 never shipped, and the old table holds
one leftover test row. So the old table and the `/state/{syncId}` routes get **deleted**
rather than carried along. This is the one moment when breaking that API costs nothing.
