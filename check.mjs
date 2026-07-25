// Checks for the data in state.js. Run them with:
//
//     node check.mjs
//
// No test framework, no npm install, nothing to set up — this works
// because state.js never touches the page. That's the whole reason the
// data and the rendering live in separate files: the part with the
// tricky arithmetic can be checked outside a browser entirely.

import {
  buildFresh, buildFromOld, addBehavior, addReward, awardBeads, redeemReward,
  reverseEntry, balance, lifetimeEarned, rewardsEnjoyed, jarBeads, entriesFor,
} from "./state.js";

let failures = 0;
const is = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failures++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${ok ? "" : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`);
};

// --- a fresh jar, earning and spending ---
const s = buildFresh({ name: "Ella", color: "blue" });
const me = s.profiles[0].id;
const homework = addBehavior(s, { name: "Homework", color: "blue", value: 3 });
const teeth = addBehavior(s, { name: "Teeth", color: "green", value: 1 });
const movie = addReward(s, { name: "Movie night", price: 20 });

is("empty balance", balance(s, me), 0);
awardBeads(s, { profileId: me, behaviorId: homework.id, amount: 3 });
awardBeads(s, { profileId: me, behaviorId: teeth.id, amount: 1 });
is("balance after earning", balance(s, me), 4);
is("one entry per award, not per bead", s.ledger.length, 2);
is("lifetime earned", lifetimeEarned(s, me), 4);
is("jar draws one colour per bead", jarBeads(s, me).length, 4);

// --- spending goes negative, and lifetime does not move ---
redeemReward(s, { profileId: me, rewardId: movie.id });
is("balance after overdraft", balance(s, me), -16);
is("lifetime is untouched by spending", lifetimeEarned(s, me), 4);
is("rewards enjoyed", rewardsEnjoyed(s, me), 1);
is("negative balance draws no beads", jarBeads(s, me).length, 0);

// --- undo is a new entry, not a deletion ---
const spend = s.ledger.find(e => e.type === "spend");
reverseEntry(s, spend.id);
is("undo restores the balance", balance(s, me), 4);
is("undo adds a row rather than removing one", s.ledger.length, 4);
reverseEntry(s, spend.id);
is("undoing twice does nothing", s.ledger.length, 4);
is("reversal id is derived, not random", s.ledger.at(-1).id, "reverse:" + spend.id);

// --- spending empties the OLDEST beads first ---
const s2 = buildFresh({ name: "Sam", color: "red" });
const sam = s2.profiles[0].id;
const old = addBehavior(s2, { name: "Old", color: "red", value: 5 });
const recent = addBehavior(s2, { name: "Recent", color: "green", value: 5 });
// Real awards land milliseconds apart; the test pins the times so
// "oldest" means something definite.
awardBeads(s2, { profileId: sam, behaviorId: old.id, amount: 5 }).at = "2026-07-01T09:00:00.000Z";
awardBeads(s2, { profileId: sam, behaviorId: recent.id, amount: 5 }).at = "2026-07-05T09:00:00.000Z";
const cheap = addReward(s2, { name: "Sticker", price: 5 });
redeemReward(s2, { profileId: sam, rewardId: cheap.id });
is("oldest beads leave first", jarBeads(s2, sam), ["green","green","green","green","green"]);

// --- migrating the old single jar ---
const v4 = {
  version: 4,
  behaviors: [{ id: 1, name: "Tidying", color: "purple" }],
  beads: [
    { id: 1, behaviorId: 1, at: null },
    { id: 2, behaviorId: 1, at: "2026-07-01T10:00:00.000Z" },
    { id: 3, behaviorId: 1, at: "2026-07-02T10:00:00.000Z" },
  ],
  rewards: [
    { id: 1, name: "Zoo",   target: 50, earnedAt: null },
    { id: 2, name: "Sweets", target: 2, earnedAt: "2026-07-02T11:00:00.000Z" },
  ],
};
const m = buildFromOld(v4, { name: "Ava", color: "yellow" });
const ava = m.profiles[0].id;
is("every bead carried over", lifetimeEarned(m, ava), 3);
is("already-earned rewards cost nothing", balance(m, ava), 3);
is("target became price", m.rewards.find(r => r.name === "Zoo").price, 50);
is("old integer ids are kept", m.behaviors[0].id, 1);
is("reasons start worth one bead", m.behaviors[0].value, 1);
is("the trophy survives as a purchase", rewardsEnjoyed(m, ava), 1);
is("beads with no time sort last", entriesFor(m, ava).at(-1).at, null);
is("requests stay empty until Phase 15", m.requests, []);

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
