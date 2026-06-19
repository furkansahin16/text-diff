const maxLines = 20000;

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

function countLines(value) {
  if (value.length === 0) {
    return 0;
  }

  return value.split("\n").length;
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

    const added = operations.filter((operation) => operation.type === "add").length;
    const removed = operations.filter((operation) => operation.type === "remove").length;
    const unchanged = operations.filter((operation) => operation.type === "same").length;

    summaryEl.textContent = `${added.toLocaleString()} added, ${removed.toLocaleString()} removed, ${unchanged.toLocaleString()} unchanged`;
    setStatus("Comparison complete.", false);
  });
}

function splitLines(value) {
  if (value.length === 0) {
    return [];
  }

  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

function diffLines(leftLines, rightLines) {
  const commonPrefix = [];
  let start = 0;

  while (start < leftLines.length && start < rightLines.length && leftLines[start] === rightLines[start]) {
    commonPrefix.push({ type: "same", left: leftLines[start], right: rightLines[start] });
    start += 1;
  }

  let leftEnd = leftLines.length - 1;
  let rightEnd = rightLines.length - 1;
  const commonSuffix = [];

  while (leftEnd >= start && rightEnd >= start && leftLines[leftEnd] === rightLines[rightEnd]) {
    commonSuffix.push({ type: "same", left: leftLines[leftEnd], right: rightLines[rightEnd] });
    leftEnd -= 1;
    rightEnd -= 1;
  }

  const leftMiddle = leftLines.slice(start, leftEnd + 1);
  const rightMiddle = rightLines.slice(start, rightEnd + 1);
  const middle = diffMiddle(leftMiddle, rightMiddle);

  return commonPrefix.concat(middle, commonSuffix.reverse());
}

function diffMiddle(leftLines, rightLines) {
  const anchors = findAnchors(leftLines, rightLines);

  if (anchors.length === 0) {
    return replaceBlock(leftLines, rightLines);
  }

  const operations = [];
  let leftStart = 0;
  let rightStart = 0;

  for (const anchor of anchors) {
    operations.push(
      ...diffLines(
        leftLines.slice(leftStart, anchor.left),
        rightLines.slice(rightStart, anchor.right),
      ),
    );
    operations.push({ type: "same", left: leftLines[anchor.left], right: rightLines[anchor.right] });
    leftStart = anchor.left + 1;
    rightStart = anchor.right + 1;
  }

  operations.push(...diffLines(leftLines.slice(leftStart), rightLines.slice(rightStart)));
  return operations;
}

function findAnchors(leftLines, rightLines) {
  const leftPositions = collectLinePositions(leftLines);
  const rightPositions = collectLinePositions(rightLines);
  const candidates = [];

  for (const [line, leftIndexes] of leftPositions) {
    const rightIndexes = rightPositions.get(line);
    if (leftIndexes.length === 1 && rightIndexes?.length === 1) {
      candidates.push({ left: leftIndexes[0], right: rightIndexes[0] });
    }
  }

  candidates.sort((a, b) => a.left - b.left || a.right - b.right);
  return longestIncreasingByRight(candidates);
}

function collectLinePositions(lines) {
  const positions = new Map();

  lines.forEach((line, index) => {
    const indexes = positions.get(line);
    if (indexes) {
      indexes.push(index);
    } else {
      positions.set(line, [index]);
    }
  });

  return positions;
}

function longestIncreasingByRight(candidates) {
  const piles = [];
  const previous = new Array(candidates.length).fill(-1);

  candidates.forEach((candidate, index) => {
    let low = 0;
    let high = piles.length;

    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (candidates[piles[middle]].right < candidate.right) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }

    if (low > 0) {
      previous[index] = piles[low - 1];
    }

    piles[low] = index;
  });

  const sequence = [];
  let index = piles[piles.length - 1];

  while (index !== undefined && index !== -1) {
    sequence.push(candidates[index]);
    index = previous[index];
  }

  return sequence.reverse();
}

function replaceBlock(leftLines, rightLines) {
  const operations = [];

  for (const line of leftLines) {
    operations.push({ type: "remove", left: line, right: "" });
  }

  for (const line of rightLines) {
    operations.push({ type: "add", left: "", right: line });
  }

  return operations;
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
