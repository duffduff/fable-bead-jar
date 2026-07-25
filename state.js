// The Bead Jar's data: the shape it's stored in, the history that records
// everything that happened, and the sums worked out from that history.
//
// Nothing in this file touches the page. It's data in, data out — which
// means the rendering could be rewritten in anything (a framework, a
// different app entirely) and all of this would come across unchanged.
//
// The big idea: we do NOT store how many beads someone has. We store
// every earn and every spend, and add them up when we need a number.
// A stored count can't answer "where did my beads go?" — a list can.

// --- Settings ---

export const BEAD_COLORS = ["red", "blue", "yellow", "green", "purple"];

export const COMMON_REASONS = [
  "Homework done", "Cleaned room", "Helped a sibling", "Brushed teeth",
  "Read a book", "Good listening", "Made the bed", "Shared nicely",
  "Kind words", "Tried something new",
];

// A NEW key. The old app is still out there in some browser caches, and
// it would read v5 data, decide it was broken, and save an empty jar
// straight over it. Different keys keep the two versions out of each
// other's reach — and leave the old save sitting there as a free backup.
export const STORAGE_KEY = "bead-jar-v5";

const V4_KEY = "bead-jar-v3";            // the key name lagged behind the version
const OLD_MULTI_JAR_KEY = "bead-jar-data";  // Phase 4-8: a list of jars
const OLD_COUNT_KEY = "bead-jar-count";     // Phase 3: a bare number

// --- Ids ---

// Every record needs an id that no other device could ever invent, because
// two phones will one day merge their histories. The old trick of "highest
// id so far, plus one" gives both devices the same answer — and produces
// the same id for two different things.
export function newId() {
  if (crypto.randomUUID) return crypto.randomUUID();

  // randomUUID only exists in a "secure context": https, or localhost.
  // Testing on a phone over the LAN is plain http, so fall back to
  // random bytes, which have no such restriction.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function now() {
  return new Date().toISOString();
}

// Every record carries updatedAt so that one day, when two devices have
// both edited the same reward, we can tell which edit came last.
function stamp(record) {
  record.updatedAt = now();
  return record;
}

// --- The shape ---

export function freshState() {
  return {
    version: 5,
    householdId: newId(),   // replaced by the server's id in Phase 16
    profiles: [],
    behaviors: [],
    rewards: [],
    requests: [],           // stays empty until Phase 15 adds asking
    ledger: [],
  };
}

// --- Storage ---

// Returns the saved jar, or null if there isn't one. Note what it does
// NOT do: save. The old app saved on startup, which meant any failure to
// load was immediately written over the real data.
export function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const data = JSON.parse(raw);
    if (data && data.version === 5 && Array.isArray(data.ledger)) return data;
  } catch (error) {
    // Unreadable save. Leave it alone rather than overwrite it.
  }
  return null;
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// --- Making things ---

export function addProfile(state, { name, color = BEAD_COLORS[0], role = "kid" }) {
  const profile = stamp({ id: newId(), name, color, role, archived: false });
  state.profiles.push(profile);
  return profile;
}

export function addBehavior(state, { name, color, value = 1 }) {
  const behavior = stamp({ id: newId(), name, color, value, archived: false });
  state.behaviors.push(behavior);
  return behavior;
}

export function addReward(state, { name, price, forProfileId = null }) {
  const reward = stamp({ id: newId(), name, price, forProfileId, archived: false });
  state.rewards.push(reward);
  return reward;
}

// Removing is a tombstone, never an actual delete: a record that vanished
// from one device would just be resurrected by the next device to sync.
export function archiveReward(state, rewardId) {
  const reward = rewardById(state, rewardId);
  if (reward) stamp(reward).archived = true;
}

export function archiveBehavior(state, behaviorId) {
  const behavior = behaviorById(state, behaviorId);
  if (behavior) stamp(behavior).archived = true;
}

// --- Things that happen ---

// One entry per award, not one per bead. Three beads for homework is a
// single line in the history, which is both truer and a lot smaller.
export function awardBeads(state, { profileId, behaviorId, amount }) {
  const entry = stamp({
    id: newId(),
    profileId,
    type: "earn",
    amount,
    behaviorId,
    at: now(),
    actorProfileId: null,   // Phase 14 records WHO awarded it
  });
  state.ledger.push(entry);
  return entry;
}

export function redeemReward(state, { profileId, rewardId }) {
  const reward = rewardById(state, rewardId);
  if (!reward) return null;

  const entry = stamp({
    id: newId(),
    profileId,
    type: "spend",
    amount: -reward.price,
    rewardId,
    rewardName: reward.name,   // kept here so old history reads correctly
    at: now(),                 // even if the reward is renamed or archived
    actorProfileId: null,
  });
  state.ledger.push(entry);
  return entry;
}

// Undoing something doesn't erase it. We add an entry that cancels it out,
// so the history stays a true record of what happened — including the
// mistake and the fix.
//
// The id is worked out FROM the entry being reversed rather than being
// random. If two devices ever undo the same thing, both produce the id
// "reverse:abc123", and merging collapses them into one.
export function reverseEntry(state, entryId) {
  const original = state.ledger.find((e) => e.id === entryId);
  if (!original) return null;

  const id = "reverse:" + entryId;
  if (state.ledger.some((e) => e.id === id)) return null;   // already undone

  const entry = stamp({
    id,
    profileId: original.profileId,
    type: "adjust",
    amount: -original.amount,
    at: now(),
    actorProfileId: null,
    note: "undo",
  });
  state.ledger.push(entry);
  return entry;
}

// --- Working things out from the history ---

export function behaviorById(state, id) {
  return state.behaviors.find((b) => b.id === id);
}

export function rewardById(state, id) {
  return state.rewards.find((r) => r.id === id);
}

export function profileById(state, id) {
  return state.profiles.find((p) => p.id === id);
}

// Newest first. Beads carried over from very old versions have no time at
// all, so they sort to the bottom — they did happen first, we just never
// knew when.
export function entriesFor(state, profileId) {
  return state.ledger
    .filter((e) => e.profileId === profileId)
    .sort((a, b) => {
      const when = (b.at || "").localeCompare(a.at || "");
      if (when !== 0) return when;
      // Two things can happen in the same millisecond, and once histories
      // merge there's no "the order they were added" to fall back on.
      // Sorting by id as a tie-break is arbitrary but identical
      // everywhere, so every device draws the same jar.
      return String(b.id).localeCompare(String(a.id));
    });
}

// What they can spend. Adding up earns and spends is order-independent,
// which is why two devices can merge their histories in any order and
// still agree on the total.
export function balance(state, profileId) {
  return state.ledger
    .filter((e) => e.profileId === profileId)
    .reduce((total, e) => total + e.amount, 0);
}

// Everything ever earned. This only goes up — spending never touches it,
// so months of effort aren't wiped out by one big reward.
export function lifetimeEarned(state, profileId) {
  return state.ledger
    .filter((e) => e.profileId === profileId && e.amount > 0)
    .reduce((total, e) => total + e.amount, 0);
}

export function rewardsEnjoyed(state, profileId) {
  return state.ledger.filter(
    (e) => e.profileId === profileId && e.type === "spend"
  ).length;
}

export function activeBehaviors(state) {
  return state.behaviors.filter((b) => !b.archived);
}

// The shared catalogue, plus anything set aside for this person.
export function rewardsFor(state, profileId) {
  return state.rewards.filter(
    (r) => !r.archived && (r.forProfileId === null || r.forProfileId === profileId)
  );
}

// The colours to draw in the jar: one per bead of the CURRENT balance,
// taken from the most recent earns first. So spending empties the oldest
// beads out of the bottom, and what's left shows what they've been doing
// lately. A negative balance draws nothing.
export function jarBeads(state, profileId) {
  const target = Math.max(0, balance(state, profileId));
  const colors = [];

  for (const entry of entriesFor(state, profileId)) {
    if (colors.length >= target) break;
    if (entry.amount <= 0) continue;

    const behavior = behaviorById(state, entry.behaviorId);
    for (let i = 0; i < entry.amount && colors.length < target; i++) {
      colors.push(behavior ? behavior.color : "blue");
    }
  }
  return colors;
}

// --- Coming from the old version ---

// Reads whatever the previous versions of the app left behind and hands
// back a v4-shaped object, or null if this browser has never run the app.
// The v4 save is only ever READ — never written to, never deleted.
export function readOldData() {
  const raw = localStorage.getItem(V4_KEY);
  if (raw) {
    try {
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.behaviors) && Array.isArray(data.beads)) {
        if (!Array.isArray(data.rewards)) data.rewards = [];
        return data;
      }
    } catch (error) { /* fall through to the older formats */ }
  }

  // Phase 4-8: a list of jars. Each jar becomes a reason, and its count
  // becomes that many beads earned for it.
  try {
    const oldJars = JSON.parse(localStorage.getItem(OLD_MULTI_JAR_KEY));
    if (Array.isArray(oldJars) && oldJars.length > 0) {
      const data = { behaviors: [], beads: [], rewards: [] };
      for (const oldJar of oldJars) {
        const behavior = {
          id: data.behaviors.length + 1,
          name: oldJar.name,
          color: oldJar.color,
        };
        data.behaviors.push(behavior);
        for (let i = 0; i < oldJar.beads; i++) {
          data.beads.push({ id: data.beads.length + 1, behaviorId: behavior.id, at: null });
        }
      }
      return data;
    }
  } catch (error) { /* fall through */ }

  // Phase 3: a bare number.
  const oldCount = Math.floor(Number(localStorage.getItem(OLD_COUNT_KEY)));
  if (oldCount >= 1) {
    const data = {
      behaviors: [{ id: 1, name: "Good deeds", color: "blue" }],
      beads: [],
      rewards: [],
    };
    for (let i = 0; i < oldCount; i++) {
      data.beads.push({ id: i + 1, behaviorId: 1, at: null });
    }
    return data;
  }

  return null;
}

export function buildFresh({ name, color }) {
  const state = freshState();
  addProfile(state, { name, color });
  return state;
}

// Turn the old single shared jar into one person's jar.
//
// The old ids were plain integers and the new ones are long random
// strings. Mixing the two is fine — an id is only ever compared, never
// counted — so the old ones are kept exactly as they are.
export function buildFromOld(old, { name, color }) {
  const state = freshState();
  const profile = addProfile(state, { name, color });

  // Reasons keep their id and colour, and start out worth one bead each,
  // which is what every bead was worth before.
  for (const behavior of old.behaviors) {
    state.behaviors.push(stamp({
      id: behavior.id,
      name: behavior.name,
      color: behavior.color,
      value: 1,
      archived: false,
    }));
  }

  // Each old bead becomes one earned bead. Beads carried over from the
  // very first versions never had a time, and still don't.
  for (const bead of old.beads) {
    state.ledger.push(stamp({
      id: newId(),
      profileId: profile.id,
      type: "earn",
      amount: 1,
      behaviorId: bead.behaviorId,
      at: bead.at,
      actorProfileId: null,
    }));
  }

  for (const reward of old.rewards) {
    // A target was a milestone you crossed; a price is what you hand over.
    // The number carries across, but it now means something different —
    // which is why the app asks you to check them afterwards.
    state.rewards.push(stamp({
      id: reward.id,
      name: reward.name,
      price: reward.target,
      forProfileId: null,
      archived: false,
    }));

    // Rewards already earned were never actually paid for. They become a
    // purchase that cost nothing, so the trophies survive and nobody
    // wakes up owing hundreds of beads.
    if (reward.earnedAt) {
      state.ledger.push(stamp({
        id: newId(),
        profileId: profile.id,
        type: "spend",
        amount: 0,
        rewardId: reward.id,
        rewardName: reward.name,
        at: reward.earnedAt,
        actorProfileId: null,
        note: "earned before rewards had prices",
      }));
    }
  }

  return state;
}
