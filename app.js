// The behavior of the Bead Jar app.
//
// One shared jar with NO upper limit — it just grows. Every bead is
// awarded FOR a "behavior" (a named, colored task) and remembers when
// it was earned. Rewards are milestones: when the bead count crosses
// a reward's target, that reward is earned (beads are never removed).

// --- Settings ---
const BEAD_COLORS = ["red", "blue", "yellow", "green", "purple"];
const MAX_AWARD = 10;   // most beads you can give in one go
const COMMON_REASONS = [
  "Homework done", "Cleaned room", "Helped a sibling", "Brushed teeth",
  "Read a book", "Good listening", "Made the bed", "Shared nicely",
  "Kind words", "Tried something new",
];
const STORAGE_KEY = "bead-jar-v3";
const OLD_MULTI_JAR_KEY = "bead-jar-data";   // Phase 4-8 format
const OLD_COUNT_KEY = "bead-jar-count";      // Phase 3 format

// --- Grab the page elements we need ---
const jar = document.querySelector(".jar");
const jarZone = document.querySelector(".jar-zone");
const progress = document.querySelector("#progress");
const nextRewardEl = document.querySelector("#next-reward");
const rewardListEl = document.querySelector("#reward-list");
const newRewardButton = document.querySelector("#new-reward");
const rewardForm = document.querySelector("#reward-form");
const rewardNameInput = document.querySelector("#reward-name");
const rewardTargetInput = document.querySelector("#reward-target");
const rewardError = document.querySelector("#reward-error");
const cancelRewardButton = document.querySelector("#cancel-reward");
const chipsEl = document.querySelector("#behavior-chips");
const countMinus = document.querySelector("#count-minus");
const countPlus = document.querySelector("#count-plus");
const countDisplay = document.querySelector("#count-display");
const suggestionsEl = document.querySelector("#suggestions");
const newBehaviorButton = document.querySelector("#new-behavior");
const behaviorForm = document.querySelector("#behavior-form");
const nameInput = document.querySelector("#behavior-name");
const colorChoices = document.querySelector("#color-choices");
const cancelButton = document.querySelector("#cancel-behavior");
const logEl = document.querySelector("#log");

// --- State ---
// {
//   behaviors: [{ id, name, color }]
//   beads:     [{ id, behaviorId, at }]     at = ISO time, null if migrated
//   rewards:   [{ id, name, target, earnedAt }]   earnedAt = ISO time or null
// }
let state = loadState();
let chosenColor = BEAD_COLORS[0];   // color picked in the new-behavior form
let awardCount = 1;                 // how many beads the next chip click gives

// --- Storage ---

function freshState() {
  return { version: 4, behaviors: [], beads: [], rewards: [] };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.behaviors) && Array.isArray(data.beads)) {
        return upgradeState(data);
      }
    } catch (error) {
      // Broken saved data: fall through and start over.
    }
  }
  return migrateOldData();
}

// v3 saves had a goal (an upper limit) and no rewards. The goal becomes
// the first reward, so the target you were chasing isn't lost.
function upgradeState(data) {
  if (!Array.isArray(data.rewards)) {
    data.rewards = [];
    if (Number(data.goal) >= 1) {
      data.rewards.push({
        id: 1,
        name: "Fill the jar",
        target: Math.floor(data.goal),
        earnedAt: data.beads.length >= data.goal ? new Date().toISOString() : null,
      });
    }
  }
  delete data.goal;
  data.version = 4;
  return data;
}

// Convert saves from much older versions of the app so no beads are lost.
function migrateOldData() {
  const migrated = freshState();

  // Phase 4-8 format: a list of jars. Each old jar becomes a behavior,
  // and its beads become beads earned for that behavior.
  try {
    const oldJars = JSON.parse(localStorage.getItem(OLD_MULTI_JAR_KEY));
    if (Array.isArray(oldJars) && oldJars.length > 0) {
      for (const oldJar of oldJars) {
        const behavior = {
          id: migrated.behaviors.length + 1,
          name: oldJar.name,
          color: oldJar.color,
        };
        migrated.behaviors.push(behavior);
        for (let i = 0; i < oldJar.beads; i++) {
          migrated.beads.push({
            id: migrated.beads.length + 1,
            behaviorId: behavior.id,
            at: null,   // we never knew when these were earned
          });
        }
      }
      return migrated;
    }
  } catch (error) { /* fall through */ }

  // Phase 3 format: a bare count.
  const oldCount = Number(localStorage.getItem(OLD_COUNT_KEY));
  if (oldCount >= 1) {
    migrated.behaviors.push({ id: 1, name: "Good deeds", color: "blue" });
    for (let i = 0; i < Math.floor(oldCount); i++) {
      migrated.beads.push({ id: i + 1, behaviorId: 1, at: null });
    }
  }
  return migrated;
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// --- Actions: change the data, then save and redraw ---

function addBeads(behaviorId, count) {
  let nextId = Math.max(0, ...state.beads.map(b => b.id)) + 1;
  const at = new Date().toISOString();
  for (let i = 0; i < count; i++) {
    state.beads.push({ id: nextId++, behaviorId, at });
  }

  // Did this award push us across any reward targets?
  const justEarned = state.rewards.filter(
    r => !r.earnedAt && state.beads.length >= r.target
  );
  for (const reward of justEarned) {
    reward.earnedAt = at;
  }

  save();
  render();

  // Animate the new beads dropping in one after another.
  const newBeads = [...jar.children].slice(-count);
  newBeads.forEach((bead, i) => {
    bead.classList.add("drop");
    bead.style.animationDelay = (i * 0.09) + "s";
  });

  if (justEarned.length > 0) {
    setTimeout(celebrate, 400 + count * 90);
  }

  setAwardCount(1);   // reset so the next award is deliberate
}

function setAwardCount(n) {
  awardCount = Math.max(1, Math.min(MAX_AWARD, n));
  countDisplay.textContent = awardCount;
}

function removeBead(beadId) {
  // Earned rewards stay earned — history is history.
  state.beads = state.beads.filter(b => b.id !== beadId);
  save();
  render();
}

function addBehavior(name, color) {
  const id = Math.max(0, ...state.behaviors.map(b => b.id)) + 1;
  state.behaviors.push({ id, name, color });
  save();
  render();
}

function addReward(name, target) {
  const id = Math.max(0, ...state.rewards.map(r => r.id)) + 1;
  state.rewards.push({ id, name, target, earnedAt: null });
  save();
  render();
}

function removeReward(rewardId) {
  state.rewards = state.rewards.filter(r => r.id !== rewardId);
  save();
  render();
}

// Rain confetti over the jar.
function celebrate() {
  const colors = ["#d64545", "#3a72c9", "#e0a92e", "#3d9c50", "#8a4fc7"];
  for (let i = 0; i < 40; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti";
    piece.style.left = Math.random() * 100 + "%";
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = Math.random() * 0.4 + "s";
    piece.style.setProperty("--drift", (Math.random() * 160 - 80) + "px");
    jarZone.appendChild(piece);
    setTimeout(() => piece.remove(), 3000);
  }
}

// --- Rendering: rebuild the screen from the data ---

function behaviorById(id) {
  return state.behaviors.find(b => b.id === id);
}

function formatWhen(iso) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function render() {
  const beadCount = state.beads.length;

  // The jar: one circle per bead, colored by its behavior.
  jar.innerHTML = "";
  for (const bead of state.beads) {
    const el = document.createElement("div");
    const behavior = behaviorById(bead.behaviorId);
    el.className = "bead " + (behavior ? behavior.color : "blue");
    jar.appendChild(el);
  }

  progress.textContent = beadCount + (beadCount === 1 ? " bead" : " beads");

  // The next milestone to chase: the closest unearned reward.
  const upcoming = state.rewards
    .filter(r => !r.earnedAt)
    .sort((a, b) => a.target - b.target);
  if (upcoming.length > 0) {
    const next = upcoming[0];
    nextRewardEl.textContent =
      "🎁 " + next.name + ": " + (next.target - beadCount) + " more beads";
  } else if (state.rewards.length > 0) {
    nextRewardEl.textContent = "🏆 All rewards earned — add a new one!";
  } else {
    nextRewardEl.textContent = "Add a reward to aim for!";
  }

  // The rewards list: upcoming first (nearest target on top), earned after.
  rewardListEl.innerHTML = "";
  if (state.rewards.length === 0) {
    const li = document.createElement("li");
    li.className = "hint";
    li.textContent = "No rewards yet.";
    rewardListEl.appendChild(li);
  }
  const earned = state.rewards
    .filter(r => r.earnedAt)
    .sort((a, b) => b.earnedAt.localeCompare(a.earnedAt));
  for (const reward of [...upcoming, ...earned]) {
    const li = document.createElement("li");
    li.className = "reward" + (reward.earnedAt ? " earned" : "");

    const title = document.createElement("div");
    title.className = "reward-title";

    const name = document.createElement("span");
    name.className = "reward-name";
    name.textContent = (reward.earnedAt ? "🏆 " : "🎁 ") + reward.name;

    const status = document.createElement("span");
    status.className = "reward-status";
    status.textContent = reward.earnedAt
      ? "earned " + formatWhen(reward.earnedAt)
      : Math.min(beadCount, reward.target) + " / " + reward.target;

    const remove = document.createElement("button");
    remove.className = "log-remove";
    remove.textContent = "×";
    remove.title = "Remove this reward";
    remove.addEventListener("click", () => removeReward(reward.id));

    title.append(name, status, remove);
    li.appendChild(title);

    if (!reward.earnedAt) {
      const bar = document.createElement("div");
      bar.className = "bar";
      const fill = document.createElement("div");
      fill.className = "bar-fill";
      fill.style.width = Math.min(100, (beadCount / reward.target) * 100) + "%";
      bar.appendChild(fill);
      li.appendChild(bar);
    }

    rewardListEl.appendChild(li);
  }

  // One chip per behavior — clicking it awards beads.
  chipsEl.innerHTML = "";
  if (state.behaviors.length === 0) {
    const hint = document.createElement("p");
    hint.className = "hint";
    hint.textContent = "Create your first behavior to start earning beads.";
    chipsEl.appendChild(hint);
  }
  for (const behavior of state.behaviors) {
    const chip = document.createElement("button");
    chip.className = "chip " + behavior.color;
    chip.textContent = behavior.name;
    chip.addEventListener("click", () => addBeads(behavior.id, awardCount));
    chipsEl.appendChild(chip);
  }

  // The history: newest first. Each row can remove its bead.
  logEl.innerHTML = "";
  if (state.beads.length === 0) {
    const li = document.createElement("li");
    li.className = "hint";
    li.textContent = "No beads yet.";
    logEl.appendChild(li);
  }
  for (const bead of [...state.beads].reverse()) {
    const behavior = behaviorById(bead.behaviorId);
    const li = document.createElement("li");

    const dot = document.createElement("span");
    dot.className = "dot " + (behavior ? behavior.color : "blue");

    const name = document.createElement("span");
    name.className = "log-name";
    name.textContent = behavior ? behavior.name : "(unknown)";

    const when = document.createElement("time");
    when.textContent = bead.at ? formatWhen(bead.at) : "before today";

    const remove = document.createElement("button");
    remove.className = "log-remove";
    remove.textContent = "×";
    remove.title = "Remove this bead";
    remove.addEventListener("click", () => removeBead(bead.id));

    li.append(dot, name, when, remove);
    logEl.appendChild(li);
  }
}

// --- The count stepper ---

countMinus.addEventListener("click", () => setAwardCount(awardCount - 1));
countPlus.addEventListener("click", () => setAwardCount(awardCount + 1));

// --- The new-reward form ---

newRewardButton.addEventListener("click", () => {
  rewardForm.hidden = false;
  rewardError.hidden = true;
  rewardNameInput.focus();
});

cancelRewardButton.addEventListener("click", () => {
  rewardForm.hidden = true;
});

rewardForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = rewardNameInput.value.trim();
  const target = Math.floor(Number(rewardTargetInput.value));
  if (!name || !(target >= 1)) return;

  // A target we've already passed wouldn't be something to chase.
  if (target <= state.beads.length) {
    rewardError.textContent =
      "The jar already has " + state.beads.length +
      " beads — pick a bigger target.";
    rewardError.hidden = false;
    return;
  }

  addReward(name, target);
  rewardNameInput.value = "";
  rewardTargetInput.value = "";
  rewardForm.hidden = true;
});

// --- The new-behavior form ---

// Offer common reasons the family hasn't added yet; tapping one
// fills the name box (you can still edit it before creating).
function renderSuggestions() {
  suggestionsEl.innerHTML = "";
  const existing = state.behaviors.map(b => b.name.toLowerCase());
  for (const reason of COMMON_REASONS) {
    if (existing.includes(reason.toLowerCase())) continue;
    const suggestion = document.createElement("button");
    suggestion.type = "button";   // NOT a submit button
    suggestion.className = "suggestion";
    suggestion.textContent = reason;
    suggestion.addEventListener("click", () => {
      nameInput.value = reason;
      nameInput.focus();
    });
    suggestionsEl.appendChild(suggestion);
  }
}

newBehaviorButton.addEventListener("click", () => {
  renderSuggestions();
  behaviorForm.hidden = false;
  nameInput.focus();
});

cancelButton.addEventListener("click", () => {
  behaviorForm.hidden = true;
});

behaviorForm.addEventListener("submit", (event) => {
  event.preventDefault();   // forms reload the page by default — stop that
  const name = nameInput.value.trim();
  if (!name) return;
  addBehavior(name, chosenColor);
  nameInput.value = "";
  behaviorForm.hidden = true;
});

// Build the five color swatches once.
for (const color of BEAD_COLORS) {
  const swatch = document.createElement("button");
  swatch.type = "button";   // NOT a submit button
  swatch.className = "swatch " + color + (color === chosenColor ? " selected" : "");
  swatch.title = color;
  swatch.addEventListener("click", () => {
    chosenColor = color;
    colorChoices.querySelectorAll(".swatch").forEach(s => s.classList.remove("selected"));
    swatch.classList.add("selected");
  });
  colorChoices.appendChild(swatch);
}

// --- Start up ---
save();     // if loadState() just migrated or upgraded, pin the result
render();

// Register the service worker (sw.js) so the app works offline.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
