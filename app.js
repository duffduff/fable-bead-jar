// The behavior of the Bead Jar app.
//
// One shared jar. Every bead is awarded FOR a "behavior" (a named,
// colored task), and every bead remembers when it was earned.

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
//   goal:      how many beads fill the jar
//   behaviors: [{ id, name, color }]
//   beads:     [{ id, behaviorId, at }]   at = ISO time, or null if migrated
// }
let state = loadState();
let chosenColor = BEAD_COLORS[0];   // color picked in the new-behavior form
let awardCount = 1;                 // how many beads the next chip click gives

// --- Storage ---

function freshState() {
  return { version: 3, goal: 20, behaviors: [], beads: [] };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.behaviors) && Array.isArray(data.beads)) {
        return data;
      }
    } catch (error) {
      // Broken saved data: fall through and start over.
    }
  }
  return migrateOldData();
}

// Convert saves from earlier versions of the app so no beads are lost.
function migrateOldData() {
  const migrated = freshState();

  // Phase 4-8 format: a list of jars. Each old jar becomes a behavior,
  // and its beads become beads earned for that behavior.
  try {
    const oldJars = JSON.parse(localStorage.getItem(OLD_MULTI_JAR_KEY));
    if (Array.isArray(oldJars) && oldJars.length > 0) {
      let combinedGoal = 0;
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
        combinedGoal += oldJar.goal;
      }
      if (combinedGoal > 0) migrated.goal = combinedGoal;
      return migrated;
    }
  } catch (error) { /* fall through */ }

  // Phase 3 format: a bare count.
  const oldCount = Number(localStorage.getItem(OLD_COUNT_KEY));
  if (oldCount >= 1) {
    migrated.behaviors.push({ id: 1, name: "Good deeds", color: "blue" });
    for (let i = 0; i < Math.min(Math.floor(oldCount), migrated.goal); i++) {
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
  const space = state.goal - state.beads.length;
  if (space <= 0) return;
  const toAdd = Math.min(count, space);   // never overfill the jar

  let nextId = Math.max(0, ...state.beads.map(b => b.id)) + 1;
  const at = new Date().toISOString();
  for (let i = 0; i < toAdd; i++) {
    state.beads.push({ id: nextId++, behaviorId, at });
  }
  save();
  render();

  // Animate the new beads dropping in one after another.
  const newBeads = [...jar.children].slice(-toAdd);
  newBeads.forEach((bead, i) => {
    bead.classList.add("drop");
    bead.style.animationDelay = (i * 0.09) + "s";
  });

  if (state.beads.length === state.goal) {
    setTimeout(celebrate, 400 + toAdd * 90);
  }

  setAwardCount(1);   // reset so the next award is deliberate
}

function setAwardCount(n) {
  awardCount = Math.max(1, Math.min(MAX_AWARD, n));
  countDisplay.textContent = awardCount;
}

function removeBead(beadId) {
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

function render() {
  const full = state.beads.length >= state.goal;

  // The jar: one circle per bead, colored by its behavior.
  jar.innerHTML = "";
  for (const bead of state.beads) {
    const el = document.createElement("div");
    const behavior = behaviorById(bead.behaviorId);
    el.className = "bead " + (behavior ? behavior.color : "blue");
    jar.appendChild(el);
  }

  progress.textContent = state.beads.length + " / " + state.goal;
  jarZone.classList.toggle("full", full);

  // One chip per behavior — clicking it awards a bead.
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
    chip.disabled = full;
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
    when.textContent = bead.at
      ? new Date(bead.at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
      : "before today";

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
save();     // if loadState() just migrated old data, pin the result
render();

// Register the service worker (sw.js) so the app works offline.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
