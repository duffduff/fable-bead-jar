// The behavior of the Bead Jar app.

// --- Settings ---
const BEAD_COLORS = ["red", "blue", "yellow", "green", "purple"];
const DEFAULT_GOAL = 20;
const STORAGE_KEY = "bead-jar-data";

// --- Grab the page elements we need ---
const jarList = document.querySelector("#jar-list");
const newJarButton = document.querySelector("#new-jar");

// --- State: a list of jars, each one an object like
//     { id: 1, name: "Reading", color: "blue", goal: 20, beads: 7 }
let jars = loadJars();

// --- Storage ---

function loadJars() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return data;
    } catch (error) {
      // Broken saved data: ignore it and fall through to a fresh start.
    }
  }

  // First visit — or a save from Phase 3, when the app stored a single
  // count. Migrate that old count into the new format so no beads are lost.
  const oldCount = Number(localStorage.getItem("bead-jar-count"));
  return [{
    id: 1,
    name: "My first jar",
    color: "blue",
    goal: DEFAULT_GOAL,
    beads: oldCount >= 1 ? Math.min(Math.floor(oldCount), DEFAULT_GOAL) : 0,
  }];
}

function saveJars() {
  // localStorage only stores strings; JSON.stringify turns our
  // list of objects into one string (and JSON.parse reverses it).
  localStorage.setItem(STORAGE_KEY, JSON.stringify(jars));
}

// --- Actions: change the data, then save and redraw ---

function addBead(jarData) {
  if (jarData.beads >= jarData.goal) return;
  jarData.beads = jarData.beads + 1;
  saveJars();
  render();
}

function removeBead(jarData) {
  if (jarData.beads === 0) return;
  jarData.beads = jarData.beads - 1;
  saveJars();
  render();
}

function createJar() {
  const name = prompt("What is this jar for?", "New jar");
  if (!name) return;   // cancelled or empty

  const goalAnswer = Number(prompt("How many beads to fill it?", DEFAULT_GOAL));
  const goal = goalAnswer >= 1 ? Math.floor(goalAnswer) : DEFAULT_GOAL;

  const nextId = Math.max(0, ...jars.map(j => j.id)) + 1;
  const color = BEAD_COLORS[nextId % BEAD_COLORS.length];

  jars.push({ id: nextId, name: name, color: color, goal: goal, beads: 0 });
  saveJars();
  render();
}

function renameJar(jarData) {
  const name = prompt("New name for this jar:", jarData.name);
  if (!name) return;
  jarData.name = name;
  saveJars();
  render();
}

function deleteJar(jarData) {
  const sure = confirm('Delete "' + jarData.name + '" and its beads?');
  if (!sure) return;
  jars = jars.filter(j => j.id !== jarData.id);
  saveJars();
  render();
}

// --- Rendering: rebuild the screen from the data ---

// Build the card for one jar.
function renderJarCard(jarData) {
  const card = document.createElement("section");
  card.className = "jar-card";

  // The fixed skeleton of a card. Names and counts are filled in below
  // with textContent, never pasted into this HTML string — that way a
  // jar named something like "<b>ha</b>" stays plain text.
  card.innerHTML = `
    <h2 class="jar-name"></h2>
    <div class="jar"></div>
    <div class="controls">
      <button class="remove-bead">&minus;</button>
      <span class="count"></span>
      <button class="add-bead">+</button>
    </div>
    <p class="card-actions">
      <button class="rename">Rename</button>
      <button class="delete">Delete</button>
    </p>
  `;

  card.querySelector(".jar-name").textContent = jarData.name;
  card.querySelector(".count").textContent = jarData.beads + " / " + jarData.goal;

  const jarEl = card.querySelector(".jar");
  for (let i = 0; i < jarData.beads; i++) {
    const bead = document.createElement("div");
    bead.className = "bead " + jarData.color;
    jarEl.appendChild(bead);
  }

  const addButton = card.querySelector(".add-bead");
  const removeButton = card.querySelector(".remove-bead");
  addButton.disabled = jarData.beads >= jarData.goal;
  removeButton.disabled = jarData.beads === 0;

  addButton.addEventListener("click", () => addBead(jarData));
  removeButton.addEventListener("click", () => removeBead(jarData));
  card.querySelector(".rename").addEventListener("click", () => renameJar(jarData));
  card.querySelector(".delete").addEventListener("click", () => deleteJar(jarData));

  return card;
}

// Wipe the list and rebuild every card. The screen is always
// exactly what the data says — they can never disagree.
function render() {
  jarList.innerHTML = "";
  for (const jarData of jars) {
    jarList.appendChild(renderJarCard(jarData));
  }
}

// --- Start up ---
newJarButton.addEventListener("click", createJar);
render();
