export const maxLines = 20000;

export function countLines(value) {
  if (value.length === 0) {
    return 0;
  }

  return value.split("\n").length;
}

export function splitLines(value) {
  if (value.length === 0) {
    return [];
  }

  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

export function diffLines(leftLines, rightLines) {
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

export function summarizeDiff(operations) {
  return operations.reduce(
    (summary, operation) => {
      summary[operation.type] += 1;
      return summary;
    },
    { add: 0, remove: 0, same: 0 },
  );
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
