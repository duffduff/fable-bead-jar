// The behavior of the Bead Jar app.

// --- Settings ---
const GOAL = 20;
const BEAD_COLORS = ["red", "blue", "yellow", "green", "purple"];
const STORAGE_KEY = "bead-jar-count";   // the name of our slot in localStorage

// --- Grab the page elements we need ---
const jar = document.querySelector(".jar");
const counter = document.querySelector("#counter");
const addButton = document.querySelector("#add-bead");
const removeButton = document.querySelector("#remove-bead");

// --- State: the one number this whole app is about ---
let count = 0;

// --- Functions ---

// Build one bead element with a random color.
function makeBead() {
  const bead = document.createElement("div");
  const color = BEAD_COLORS[Math.floor(Math.random() * BEAD_COLORS.length)];
  bead.className = "bead " + color;
  return bead;
}

// Remember the count so it survives closing the page.
function saveCount() {
  localStorage.setItem(STORAGE_KEY, count);
}

// Keep the counter text and buttons in sync with the count.
function updateControls() {
  counter.textContent = count + " / " + GOAL;
  addButton.disabled = count >= GOAL;
  removeButton.disabled = count === 0;
}

function addBead() {
  if (count >= GOAL) return;   // jar is full, do nothing
  count = count + 1;
  jar.appendChild(makeBead());
  saveCount();
  updateControls();
}

function removeBead() {
  if (count === 0) return;     // jar is empty, do nothing
  count = count - 1;
  jar.lastElementChild.remove();
  saveCount();
  updateControls();
}

// --- Wire the buttons to the functions ---
addButton.addEventListener("click", addBead);
removeButton.addEventListener("click", removeBead);

// --- Start up: restore the saved count, if there is one ---
// localStorage only stores strings, so we convert back to a number.
// Number(null) is 0 and Number("garbage") is NaN, so bad values fail
// the `>= 1` check and we just start fresh at zero.
const saved = Number(localStorage.getItem(STORAGE_KEY));
if (saved >= 1) {
  count = Math.min(Math.floor(saved), GOAL);
  for (let i = 0; i < count; i++) {
    jar.appendChild(makeBead());
  }
}
updateControls();
