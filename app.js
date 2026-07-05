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

  // render() rebuilt everything, so find this jar's card again and
  // tag its newest bead with the class that carries the drop animation.
  const card = jarList.querySelector('.jar-card[data-id="' + jarData.id + '"]');
  const newBead = card.querySelector(".jar").lastElementChild;
  if (newBead) newBead.classList.add("drop");

  // Just hit the goal? Throw confetti (after the bead has landed).
  if (jarData.beads === jarData.goal) {
    setTimeout(() => celebrate(card), 400);
  }
}

// Rain confetti pieces down over a jar's card.
function celebrate(card) {
  const colors = ["#d64545", "#3a72c9", "#e0a92e", "#3d9c50", "#8a4fc7"];
  for (let i = 0; i < 40; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti";
    piece.style.left = Math.random() * 100 + "%";
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = Math.random() * 0.4 + "s";
    // Each piece drifts sideways a random amount; the CSS reads this variable.
    piece.style.setProperty("--drift", (Math.random() * 160 - 80) + "px");
    card.appendChild(piece);
    setTimeout(() => piece.remove(), 3000);   // clean up after the show
  }
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
  card.dataset.id = jarData.id;              // name tag: which jar is this card?
  if (jarData.beads >= jarData.goal) {
    card.classList.add("full");              // CSS gives full jars a golden glow
  }

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

// Register the service worker (sw.js) so the app works offline.
// Old browsers without support just skip this — the app still works online.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
