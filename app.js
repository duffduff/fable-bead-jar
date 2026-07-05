// The behavior of the Bead Jar app.

// --- Settings ---
const GOAL = 20;
const BEAD_COLORS = ["red", "blue", "yellow", "green", "purple"];

// --- Grab the page elements we need ---
const jar = document.querySelector(".jar");
const counter = document.querySelector("#counter");
const addButton = document.querySelector("#add-bead");
const removeButton = document.querySelector("#remove-bead");

// --- State: the one number this whole app is about ---
let count = 0;

// --- Functions ---

// Keep the counter text and buttons in sync with the count.
function updateControls() {
  counter.textContent = count + " / " + GOAL;
  addButton.disabled = count >= GOAL;
  removeButton.disabled = count === 0;
}

function addBead() {
  if (count >= GOAL) return;   // jar is full, do nothing
  count = count + 1;

  // Create a new bead element with a random color and drop it in the jar.
  const bead = document.createElement("div");
  const color = BEAD_COLORS[Math.floor(Math.random() * BEAD_COLORS.length)];
  bead.className = "bead " + color;
  jar.appendChild(bead);

  updateControls();
}

function removeBead() {
  if (count === 0) return;     // jar is empty, do nothing
  count = count - 1;
  jar.lastElementChild.remove();
  updateControls();
}

// --- Wire the buttons to the functions ---
addButton.addEventListener("click", addBead);
removeButton.addEventListener("click", removeBead);

// Set the controls to their correct starting state.
updateControls();
