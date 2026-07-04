const statusCard = document.querySelector("#statusCard");
const statusText = document.querySelector("#statusText");
const statusNote = document.querySelector("#statusNote");
const form = document.querySelector("#statusForm");
const usernameInput = document.querySelector("#username");
const toggleButton = document.querySelector("#toggleButton");
const formMessage = document.querySelector("#formMessage");
const historyList = document.querySelector("#historyList");
const historyCount = document.querySelector("#historyCount");
const emptyState = document.querySelector("#emptyState");

let currentStatus = null;
let isSubmitting = false;

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Unknown time";

  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function updateButtonState() {
  const hasName = usernameInput.value.trim().length > 0;
  toggleButton.disabled = currentStatus === null || !hasName || isSubmitting;

  if (isSubmitting) {
    toggleButton.textContent = "Updating…";
  } else if (currentStatus === null) {
    toggleButton.textContent = "Loading…";
  } else {
    toggleButton.textContent = currentStatus ? "Close Library" : "Open Library";
  }
}

function render(data) {
  currentStatus = data.isOpen;
  statusCard.classList.toggle("is-open", data.isOpen);
  statusCard.classList.toggle("is-closed", !data.isOpen);
  statusCard.setAttribute("aria-busy", "false");
  statusText.textContent = data.isOpen ? "OPEN" : "CLOSED";
  statusNote.textContent = data.isOpen
    ? "Come in — the library is ready for visitors."
    : "The library is not currently available to visitors.";

  toggleButton.classList.toggle("open-action", !data.isOpen);
  toggleButton.classList.toggle("close-action", data.isOpen);
  updateButtonState();

  historyList.replaceChildren();
  emptyState.hidden = data.history.length > 0;
  historyCount.textContent = data.history.length
    ? `${data.history.length} ${data.history.length === 1 ? "change" : "changes"}`
    : "";

  data.history.forEach((entry) => {
    const item = document.createElement("li");
    item.className = "history-item";

    const icon = document.createElement("span");
    icon.className = `history-icon ${entry.action}`;
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = entry.action === "opened" ? "↑" : "↓";

    const description = document.createElement("p");
    const name = document.createElement("strong");
    name.textContent = entry.username;
    description.append(name, ` ${entry.action} the library`);

    const time = document.createElement("span");
    time.className = "history-time";
    time.textContent = formatTimestamp(entry.timestamp);
    description.append(time);

    item.append(icon, description);
    historyList.append(item);
  });
}

async function loadStatus() {
  try {
    const response = await fetch("/api/status");
    if (!response.ok) throw new Error("Could not load the current status.");
    render(await response.json());
  } catch (error) {
    statusText.textContent = "UNAVAILABLE";
    statusNote.textContent = "We couldn't reach the server. Please refresh the page.";
    formMessage.textContent = error.message;
  }
}

usernameInput.addEventListener("input", () => {
  formMessage.textContent = "";
  updateButtonState();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = usernameInput.value.trim();

  if (!username) {
    formMessage.textContent = "Please enter your name.";
    usernameInput.focus();
    return;
  }

  isSubmitting = true;
  formMessage.textContent = "";
  updateButtonState();

  try {
    const response = await fetch("/api/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not update the status.");

    usernameInput.value = "";
    render(data);
  } catch (error) {
    formMessage.textContent = error.message;
  } finally {
    isSubmitting = false;
    updateButtonState();
  }
});

loadStatus();
