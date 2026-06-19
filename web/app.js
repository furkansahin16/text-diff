import { countLines, diffLines, maxLines, splitLines, summarizeDiff } from "./diff.js";

const leftText = document.querySelector("#leftText");
const rightText = document.querySelector("#rightText");
const leftCount = document.querySelector("#leftCount");
const rightCount = document.querySelector("#rightCount");
const compareButton = document.querySelector("#compareButton");
const clearButton = document.querySelector("#clearButton");
const statusEl = document.querySelector("#status");
const summaryEl = document.querySelector("#summary");
const diffResult = document.querySelector("#diffResult");
const themeToggle = document.querySelector("#themeToggle");

const savedTheme = localStorage.getItem("theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
setTheme(savedTheme || (prefersDark ? "dark" : "light"));
renderEmptyState();
updateCounts();

leftText.addEventListener("input", updateCounts);
rightText.addEventListener("input", updateCounts);
compareButton.addEventListener("click", compareTexts);
clearButton.addEventListener("click", clearAll);
themeToggle.addEventListener("click", () => {
  const current = document.documentElement.dataset.theme || "light";
  setTheme(current === "dark" ? "light" : "dark");
});

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("theme", theme);
  themeToggle.textContent = theme === "dark" ? "Light" : "Dark";
}

function updateCounts() {
  const leftLines = countLines(leftText.value);
  const rightLines = countLines(rightText.value);
  leftCount.textContent = formatLines(leftLines);
  rightCount.textContent = formatLines(rightLines);

  if (leftLines > maxLines || rightLines > maxLines) {
    setStatus(`Limit exceeded. Each side supports up to ${maxLines.toLocaleString()} lines.`, true);
    compareButton.disabled = true;
  } else {
    setStatus(`Supports up to ${maxLines.toLocaleString()} lines per side.`, false);
    compareButton.disabled = false;
  }
}

function formatLines(count) {
  return `${count.toLocaleString()} ${count === 1 ? "line" : "lines"}`;
}

function compareTexts() {
  const leftLines = splitLines(leftText.value);
  const rightLines = splitLines(rightText.value);

  if (leftLines.length > maxLines || rightLines.length > maxLines) {
    setStatus(`Limit exceeded. Each side supports up to ${maxLines.toLocaleString()} lines.`, true);
    return;
  }

  if (leftLines.length === 0 && rightLines.length === 0) {
    renderEmptyState();
    summaryEl.textContent = "No input";
    return;
  }

  setStatus("Comparing...", false);

  window.requestAnimationFrame(() => {
    const operations = diffLines(leftLines, rightLines);
    renderDiff(operations);
    const summary = summarizeDiff(operations);

    summaryEl.textContent = `${summary.add.toLocaleString()} added, ${summary.remove.toLocaleString()} removed, ${summary.same.toLocaleString()} unchanged`;
    setStatus("Comparison complete.", false);
  });
}

function renderDiff(operations) {
  diffResult.textContent = "";
  const fragment = document.createDocumentFragment();
  let leftLine = 1;
  let rightLine = 1;

  for (const operation of operations) {
    const row = document.createElement("div");
    row.className = "diff-row";

    const leftNumber = operation.type === "add" ? "" : leftLine;
    const rightNumber = operation.type === "remove" ? "" : rightLine;

    row.append(
      createCell(leftNumber, operation.left, operation.type === "remove" ? "removed" : ""),
      createCell(rightNumber, operation.right, operation.type === "add" ? "added" : ""),
    );

    if (operation.type !== "add") {
      leftLine += 1;
    }

    if (operation.type !== "remove") {
      rightLine += 1;
    }

    fragment.append(row);
  }

  diffResult.append(fragment);
}

function createCell(lineNumber, text, modifier) {
  const cell = document.createElement("div");
  cell.className = `diff-cell ${modifier}`.trim();

  const number = document.createElement("div");
  number.className = "line-number";
  number.textContent = lineNumber;

  const content = document.createElement("div");
  content.className = "line-text";
  content.textContent = text;

  cell.append(number, content);
  return cell;
}

function clearAll() {
  leftText.value = "";
  rightText.value = "";
  updateCounts();
  renderEmptyState();
  summaryEl.textContent = "No comparison yet";
}

function renderEmptyState() {
  diffResult.textContent = "";
  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.textContent = "Paste text into both panels, then compare.";
  diffResult.append(empty);
}

function setStatus(message, isError) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}
