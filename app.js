// The behavior of the Bead Jar app: turning the data in state.js into a
// page, and turning taps back into changes.
//
// Beads are money now. You earn them for reasons (each worth a set
// number) and spend them on rewards (each with a price). The jar shows
// what's left to spend, and a running total shows everything ever
// earned — so a big purchase empties the jar without erasing the effort.

import {
  BEAD_COLORS, COMMON_REASONS,
  loadState, saveState, readOldData, buildFresh, buildFromOld,
  addBehavior, addReward, archiveReward, awardBeads, redeemReward, reverseEntry,
  balance, lifetimeEarned, rewardsEnjoyed, entriesFor, jarBeads,
  activeBehaviors, rewardsFor, behaviorById,
} from "./state.js";

const MAX_AWARD = 20;                       // most beads one tap can give
const PRICE_NOTICE_KEY = "bead-jar-price-check";   // a note to self, not household data

// --- Grab the page elements we need ---
const setupSection = document.querySelector("#setup");
const setupNote = document.querySelector("#setup-note");
const setupForm = document.querySelector("#setup-form");
const setupName = document.querySelector("#setup-name");
const setupColors = document.querySelector("#setup-colors");

const appSection = document.querySelector("#app");
const ownerEl = document.querySelector("#jar-owner");
const jar = document.querySelector(".jar");
const jarZone = document.querySelector(".jar-zone");
const progress = document.querySelector("#progress");
const totalsEl = document.querySelector("#totals");
const priceNotice = document.querySelector("#price-notice");
const dismissNotice = document.querySelector("#dismiss-notice");

const rewardListEl = document.querySelector("#reward-list");
const newRewardButton = document.querySelector("#new-reward");
const rewardForm = document.querySelector("#reward-form");
const rewardNameInput = document.querySelector("#reward-name");
const rewardPriceInput = document.querySelector("#reward-price");
const cancelRewardButton = document.querySelector("#cancel-reward");

const chipsEl = document.querySelector("#behavior-chips");
const customToggle = document.querySelector("#custom-toggle");
const countMinus = document.querySelector("#count-minus");
const countPlus = document.querySelector("#count-plus");
const countDisplay = document.querySelector("#count-display");

const suggestionsEl = document.querySelector("#suggestions");
const newBehaviorButton = document.querySelector("#new-behavior");
const behaviorForm = document.querySelector("#behavior-form");
const nameInput = document.querySelector("#behavior-name");
const valueInput = document.querySelector("#behavior-value");
const colorChoices = document.querySelector("#color-choices");
const cancelButton = document.querySelector("#cancel-behavior");

const logEl = document.querySelector("#log");

// --- What the app is currently looking at ---
let state = loadState();
let whoseJar = null;          // Phase 14 adds more people to switch between
let chosenColor = BEAD_COLORS[0];
let setupColor = BEAD_COLORS[0];
let customAmount = 1;

// --- Saving ---
// Only ever called after something actually changed. The old app saved on
// startup too, which meant a failed load instantly overwrote the real data.
function commit() {
  saveState(state);
  render();
}

// --- Setup: the one screen you see before there's a jar ---

function showSetup() {
  const old = readOldData();
  setupNote.textContent = old
    ? "You already have beads saved. Tell us whose jar this is and they'll " +
      "all move across — nothing is lost."
    : "Beads get earned for doing good things, and spent on rewards.";

  for (const color of BEAD_COLORS) {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "swatch " + color + (color === setupColor ? " selected" : "");
    swatch.title = color;
    swatch.addEventListener("click", () => {
      setupColor = color;
      setupColors.querySelectorAll(".swatch").forEach((s) => s.classList.remove("selected"));
      swatch.classList.add("selected");
    });
    setupColors.appendChild(swatch);
  }

  setupSection.hidden = false;
  setupName.focus();
}

setupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = setupName.value.trim();
  if (!name) return;

  const old = readOldData();
  if (old) {
    state = buildFromOld(old, { name, color: setupColor });
    // The old numbers were targets to cross; they're prices now, which is
    // a different thing. Ask for a look once the jar is on screen.
    if (old.rewards.length > 0) localStorage.setItem(PRICE_NOTICE_KEY, "1");
  } else {
    state = buildFresh({ name, color: setupColor });
  }

  setupSection.hidden = true;
  whoseJar = state.profiles[0].id;
  appSection.hidden = false;
  commit();
});

// --- Actions ---

function amountFor(behavior) {
  return customToggle.checked ? customAmount : behavior.value;
}

function giveBeads(behavior) {
  const amount = amountFor(behavior);
  awardBeads(state, { profileId: whoseJar, behaviorId: behavior.id, amount });
  commit();

  // Animate the beads that just landed, one after another.
  const landed = [...jar.children].slice(-amount);
  landed.forEach((bead, i) => {
    bead.classList.add("drop");
    bead.style.animationDelay = i * 0.09 + "s";
  });
}

function buyReward(reward) {
  const left = balance(state, whoseJar);

  // Never blocked, only warned: two people approving at once could always
  // overdraw anyway, so the app is honest about it rather than pretending.
  if (reward.price > left) {
    const after = left - reward.price;
    const ok = confirm(
      `"${reward.name}" costs ${reward.price} beads and there are only ` +
      `${left}. That leaves ${after}. Go ahead anyway?`
    );
    if (!ok) return;
  }

  redeemReward(state, { profileId: whoseJar, rewardId: reward.id });
  commit();
  celebrate();
}

function setCustomAmount(n) {
  customAmount = Math.max(1, Math.min(MAX_AWARD, n));
  countDisplay.textContent = customAmount;
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
    piece.style.setProperty("--drift", Math.random() * 160 - 80 + "px");
    jarZone.appendChild(piece);
    setTimeout(() => piece.remove(), 3000);
  }
}

// --- Rendering: rebuild the screen from the data ---

function formatWhen(iso) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function plural(n, word) {
  return n + " " + word + (Math.abs(n) === 1 ? "" : "s");
}

function render() {
  const profile = state.profiles.find((p) => p.id === whoseJar);
  const left = balance(state, whoseJar);

  ownerEl.textContent = profile ? profile.name + "'s jar" : "";

  // The jar: one circle per bead still unspent. jarBeads() hands them back
  // newest first; the jar stacks from the bottom, so oldest goes in first.
  jar.innerHTML = "";
  for (const color of jarBeads(state, whoseJar).reverse()) {
    const bead = document.createElement("div");
    bead.className = "bead " + color;
    jar.appendChild(bead);
  }

  progress.textContent = left < 0
    ? "owing " + plural(-left, "bead")
    : plural(left, "bead") + " to spend";
  progress.classList.toggle("in-the-red", left < 0);

  const enjoyed = rewardsEnjoyed(state, whoseJar);
  totalsEl.textContent =
    "🏆 " + plural(lifetimeEarned(state, whoseJar), "bead") + " earned all-time" +
    (enjoyed > 0 ? "   🎁 " + plural(enjoyed, "reward") + " enjoyed" : "");

  priceNotice.hidden = localStorage.getItem(PRICE_NOTICE_KEY) !== "1";

  renderRewards(left);
  renderChips();
  renderHistory();
}

function renderRewards(left) {
  rewardListEl.innerHTML = "";

  const rewards = rewardsFor(state, whoseJar);
  if (rewards.length === 0) {
    const li = document.createElement("li");
    li.className = "hint";
    li.textContent = "No rewards yet — add something worth saving for.";
    rewardListEl.appendChild(li);
    return;
  }

  // What they can buy right now goes first, so the list doesn't open as a
  // wall of things they can't have. Cheapest first within each group.
  const affordable = rewards.filter((r) => r.price <= left).sort((a, b) => a.price - b.price);
  const saving = rewards.filter((r) => r.price > left).sort((a, b) => a.price - b.price);

  for (const reward of [...affordable, ...saving]) {
    const canAfford = reward.price <= left;
    const li = document.createElement("li");
    li.className = "reward" + (canAfford ? " affordable" : "");

    const title = document.createElement("div");
    title.className = "reward-title";

    const name = document.createElement("span");
    name.className = "reward-name";
    name.textContent = "🎁 " + reward.name;

    const price = document.createElement("span");
    price.className = "reward-price";
    price.textContent = reward.price;

    const remove = document.createElement("button");
    remove.className = "log-remove";
    remove.textContent = "×";
    remove.title = "Remove this reward";
    remove.addEventListener("click", () => {
      archiveReward(state, reward.id);
      commit();
    });

    title.append(name, price, remove);
    li.appendChild(title);

    if (canAfford) {
      const buy = document.createElement("button");
      buy.className = "exchange";
      buy.textContent = "Exchange";
      buy.addEventListener("click", () => buyReward(reward));
      li.appendChild(buy);
    } else {
      const status = document.createElement("p");
      status.className = "reward-status";
      // The true shortfall, debt included: owing 5 with a price of 10
      // means 15 more beads, not 10.
      status.textContent = plural(reward.price - left, "bead") + " to go";
      li.appendChild(status);

      const bar = document.createElement("div");
      bar.className = "bar";
      const fill = document.createElement("div");
      fill.className = "bar-fill";
      // The bar itself can't run backwards, so debt just reads as empty.
      fill.style.width = Math.max(0, (left / reward.price) * 100) + "%";
      bar.appendChild(fill);
      li.appendChild(bar);
    }

    rewardListEl.appendChild(li);
  }
}

function renderChips() {
  chipsEl.innerHTML = "";
  const behaviors = activeBehaviors(state);

  if (behaviors.length === 0) {
    const hint = document.createElement("p");
    hint.className = "hint";
    hint.textContent = "Add a reason to start earning beads.";
    chipsEl.appendChild(hint);
    return;
  }

  for (const behavior of behaviors) {
    const chip = document.createElement("button");
    chip.className = "chip " + behavior.color;
    chip.textContent = behavior.name + " +" + amountFor(behavior);
    chip.addEventListener("click", () => giveBeads(behavior));
    chipsEl.appendChild(chip);
  }
}

function renderHistory() {
  logEl.innerHTML = "";
  const entries = entriesFor(state, whoseJar);

  if (entries.length === 0) {
    const li = document.createElement("li");
    li.className = "hint";
    li.textContent = "Nothing yet.";
    logEl.appendChild(li);
    return;
  }

  for (const entry of entries) {
    const li = document.createElement("li");
    const behavior = behaviorById(state, entry.behaviorId);

    const dot = document.createElement("span");
    const name = document.createElement("span");
    name.className = "log-name";

    if (entry.type === "earn") {
      dot.className = "dot " + (behavior ? behavior.color : "blue");
      name.textContent = behavior ? behavior.name : "(unknown)";
    } else if (entry.type === "spend") {
      dot.className = "dot gift";
      dot.textContent = "🎁";
      name.textContent = entry.rewardName || "a reward";
    } else {
      dot.className = "dot adjust";
      name.textContent = "Undone";
    }

    const amount = document.createElement("span");
    amount.className = "log-amount " + (entry.amount < 0 ? "minus" : "plus");
    amount.textContent = (entry.amount > 0 ? "+" : "") + entry.amount;

    const when = document.createElement("time");
    when.textContent = entry.at ? formatWhen(entry.at) : "before today";

    li.append(dot, name, amount, when);

    // An undo can't itself be undone — otherwise you could ping-pong
    // forever and the history would say nothing useful. Nor can something
    // that's already been undone, so the button goes away rather than
    // sitting there doing nothing.
    const alreadyUndone = state.ledger.some((e) => e.id === "reverse:" + entry.id);
    if (entry.type !== "adjust" && !alreadyUndone) {
      const undo = document.createElement("button");
      undo.className = "log-remove";
      undo.textContent = "×";
      undo.title = "Undo this";
      undo.addEventListener("click", () => {
        reverseEntry(state, entry.id);
        commit();
      });
      li.appendChild(undo);
    }

    logEl.appendChild(li);
  }
}

// --- The custom-amount stepper ---

customToggle.addEventListener("change", render);
countMinus.addEventListener("click", () => setCustomAmount(customAmount - 1));
countPlus.addEventListener("click", () => setCustomAmount(customAmount + 1));

// --- The new-reward form ---

newRewardButton.addEventListener("click", () => {
  rewardForm.hidden = false;
  rewardNameInput.focus();
});

cancelRewardButton.addEventListener("click", () => {
  rewardForm.hidden = true;
});

rewardForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = rewardNameInput.value.trim();
  const price = Math.floor(Number(rewardPriceInput.value));
  if (!name || !(price >= 1)) return;

  addReward(state, { name, price });
  rewardNameInput.value = "";
  rewardPriceInput.value = "";
  rewardForm.hidden = true;
  commit();
});

// --- The new-reason form ---

// Offer common reasons that haven't been added yet; tapping one fills the
// name box, and you can still edit it before creating.
function renderSuggestions() {
  suggestionsEl.innerHTML = "";
  const existing = state.behaviors.map((b) => b.name.toLowerCase());

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
  const value = Math.floor(Number(valueInput.value));
  if (!name || !(value >= 1)) return;

  addBehavior(state, { name, color: chosenColor, value });
  nameInput.value = "";
  valueInput.value = "1";
  behaviorForm.hidden = true;
  commit();
});

// Build the five colour swatches once.
for (const color of BEAD_COLORS) {
  const swatch = document.createElement("button");
  swatch.type = "button";
  swatch.className = "swatch " + color + (color === chosenColor ? " selected" : "");
  swatch.title = color;
  swatch.addEventListener("click", () => {
    chosenColor = color;
    colorChoices.querySelectorAll(".swatch").forEach((s) => s.classList.remove("selected"));
    swatch.classList.add("selected");
  });
  colorChoices.appendChild(swatch);
}

dismissNotice.addEventListener("click", () => {
  localStorage.removeItem(PRICE_NOTICE_KEY);
  priceNotice.hidden = true;
});

// --- Start up ---

if (state && state.profiles.length > 0) {
  whoseJar = state.profiles[0].id;
  appSection.hidden = false;
  render();
} else {
  showSetup();
}

// Register the service worker (sw.js) so the app works offline.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
