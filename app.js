// The behavior of the Bead Jar app.
//
// One shared jar. Every bead is awarded FOR a "behavior" (a named,
// colored task), and every bead remembers when it was earned.

// --- Settings ---
const BEAD_COLORS = ["red", "blue", "yellow", "green", "purple"];
const STORAGE_KEY = "bead-jar-v3";
const OLD_MULTI_JAR_KEY = "bead-jar-data";   // Phase 4-8 format
const OLD_COUNT_KEY = "bead-jar-count";      // Phase 3 format

// --- Grab the page elements we need ---
const jar = document.querySelector(".jar");
const jarZone = document.querySelector(".jar-zone");
const progress = document.querySelector("#progress");
const chipsEl = document.querySelector("#behavior-chips");
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

function addBead(behaviorId) {
  if (state.beads.length >= state.goal) return;

  const id = Math.max(0, ...state.beads.map(b => b.id)) + 1;
  state.beads.push({ id, behaviorId, at: new Date().toISOString() });
  save();
  render();

  const newBead = jar.lastElementChild;
  if (newBead) newBead.classList.add("drop");

  if (state.beads.length === state.goal) {
    setTimeout(celebrate, 400);
  }
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
    chip.addEventListener("click", () => addBead(behavior.id));
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

// --- The new-behavior form ---

newBehaviorButton.addEventListener("click", () => {
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
