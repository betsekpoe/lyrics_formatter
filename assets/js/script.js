const inputText = document.getElementById("inputText");
const outputText = document.getElementById("outputText");
const formatBtn = document.getElementById("formatBtn");
const clearBtn = document.getElementById("clearBtn");
const copyBtn = document.getElementById("copyBtn");
const preservePatternsToggle = document.getElementById("preservePatternsToggle");
const groupSizeMode = document.getElementById("groupSizeMode");
const customGroupSize = document.getElementById("customGroupSize");
const statusText = document.getElementById("statusText");
const replaceFind = document.getElementById("replaceFind");
const replaceWith = document.getElementById("replaceWith");
const replaceBtn = document.getElementById("replaceBtn");
const replaceScope = document.getElementById("replaceScope");
const replaceStatus = document.getElementById("replaceStatus");
const symbolPreset = document.getElementById("symbolPreset");
const mapperContext = document.getElementById("mapperContext");
const previewMapperBtn = document.getElementById("previewMapperBtn");
const applyMapperBtn = document.getElementById("applyMapperBtn");
const mapperStatus = document.getElementById("mapperStatus");
const SESSION_STORAGE_KEY = "lyricsFormatter.session.v1";

let activeReplaceTarget = inputText;

const SYMBOL_PRESETS = {
  english: [],
  akanSymbolsSetOne: [
    ["Ɛ", "!"],
    ["ɛ", "1"],
    ["Ɔ", "$"],
    ["ɔ", "4"],
  ],
  akanSymbolsSetTwo: [
    ["Ɛ", "{"],
    ["ɛ", "["],
    ["Ɔ", "}"],
    ["ɔ", "]"],
  ],
};

// Lines matching any of these patterns are dropped before grouping.
const EXCLUDED_LINE_PATTERNS = [
  /^chorus\b/i,
  /^refrain\b/i,
  /^slide\b/i,
  /^verse\s*\d*\b/i,
  /^pre-?chorus\b/i,
  /^bridge\b/i,
  /^tag\b/i,
  /^ending\b/i,
  /^intro\b/i,
  /^outro\b/i,
  /^interlude\b/i,];

function stripLeadingStanzaNumber(line) {
  // Remove numbering prefixes like "1 ", "2.", "3)" only when used as leading tokens.
  return line.replace(/^\d+[\])}.:-]?\s+/, "");
}

function shouldExcludeLine(line) {
  const normalized = line.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  let compact = normalized.replace(/[.:\-,;!?\s]+$/g, "");

  // Allow section markers wrapped in one or more bracket pairs, e.g. [chorus], (verse 2), {bridge}.
  while (/^[\[\({].*[\]\)}]$/.test(compact)) {
    compact = compact.slice(1, -1).trim().replace(/[.:\-,;!?\s]+$/g, "");
  }

  return EXCLUDED_LINE_PATTERNS.some((pattern) => pattern.test(compact));
}

function formatIntoPairs(rawText) {
  const normalized = rawText.replace(/\r\n?/g, "\n");
  const preservePatterns = preservePatternsToggle?.checked ?? true;
  const selectedMode = groupSizeMode?.value ?? "2";

  let groupSize = 2;
  if (selectedMode === "3") {
    groupSize = 3;
  } else if (selectedMode === "custom") {
    const customValue = Number.parseInt(customGroupSize?.value ?? "2", 10);
    if (Number.isFinite(customValue)) {
      groupSize = Math.min(Math.max(customValue, 2), 12);
    }
  }

  const contentLines = normalized
    .split("\n")
    .map((line) => line.trim())
    .map((line) => stripLeadingStanzaNumber(line))
    .filter((line) => preservePatterns || !shouldExcludeLine(line));

  const groups = [];

  for (let i = 0; i < contentLines.length; i += groupSize) {
    groups.push(contentLines.slice(i, i + groupSize).join("\n"));
  }

  return groups.join("\n\n");
}

function refreshOutput() {
  outputText.value = formatIntoPairs(inputText.value);
  saveSessionState();
}

function showStatus(message, isSuccess = false) {
  statusText.textContent = message;
  statusText.classList.toggle("success", isSuccess);
}

function setReplaceStatus(message) {
  replaceStatus.textContent = message;
}

function setMapperStatus(message) {
  mapperStatus.textContent = message;
}

function saveSessionState() {
  const sessionState = {
    input: inputText.value,
    output: outputText.value,
    preservePatterns: preservePatternsToggle?.checked ?? false,
    groupSizeMode: groupSizeMode?.value ?? "2",
    customGroupSize: customGroupSize?.value ?? "4",
  };

  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionState));
  } catch (error) {
    // Ignore storage failures (private mode or quota issues).
  }
}

function restoreSessionState() {
  try {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!saved) {
      return false;
    }

    const parsed = JSON.parse(saved);
    if (typeof parsed.input === "string") {
      inputText.value = parsed.input;
    }
    if (typeof parsed.output === "string") {
      outputText.value = parsed.output;
    }
    if (preservePatternsToggle && typeof parsed.preservePatterns === "boolean") {
      preservePatternsToggle.checked = parsed.preservePatterns;
    }
    if (groupSizeMode && typeof parsed.groupSizeMode === "string") {
      groupSizeMode.value = parsed.groupSizeMode;
    }
    if (customGroupSize && typeof parsed.customGroupSize === "string") {
      customGroupSize.value = parsed.customGroupSize;
    }
    updateGroupingUi();

    return true;
  } catch (error) {
    return false;
  }
}

function updateGroupingUi() {
  if (!groupSizeMode || !customGroupSize) {
    return;
  }

  const isCustom = groupSizeMode.value === "custom";
  customGroupSize.classList.toggle("hidden", !isCustom);
}

function targetLabel(target) {
  return target === outputText ? "Output" : "Input";
}

function setActiveReplaceTarget(target) {
  activeReplaceTarget = target;
  if (replaceScope) {
    replaceScope.textContent = `Target: ${targetLabel(target)}`;
  }
}

function getOutputTextRange() {
  const start = outputText.selectionStart ?? 0;
  const end = outputText.selectionEnd ?? 0;
  return { start, end };
}

function getMapperSourceText() {
  if (mapperContext.value === "all") {
    return {
      text: outputText.value,
      start: 0,
      end: outputText.value.length,
      isSelection: false,
    };
  }

  const { start, end } = getOutputTextRange();
  if (start === end) {
    return { text: "", start, end, isSelection: true };
  }

  return {
    text: outputText.value.slice(start, end),
    start,
    end,
    isSelection: true,
  };
}

function mapWithPreset(text, presetName) {
  const pairs = SYMBOL_PRESETS[presetName] ?? [];
  if (!pairs.length) {
    return text;
  }

  let result = text;
  for (const [from, to] of pairs) {
    result = result.split(from).join(to);
  }
  return result;
}

function buildMappedPreview() {
  const source = getMapperSourceText();
  if (!source.text) {
    return { ...source, mapped: "" };
  }

  const mapped = mapWithPreset(source.text, symbolPreset.value);
  return { ...source, mapped };
}

function buildMappedTextForTarget() {
  const result = buildMappedPreview();
  if (!result.text) {
    return { ...result, mappedFullText: "" };
  }

  const current = outputText.value;
  const mappedFullText =
    current.slice(0, result.start) + result.mapped + current.slice(result.end);
  return { ...result, mappedFullText };
}

function previewMapper() {
  const result = buildMappedTextForTarget();

  if (!result.text) {
    if (result.isSelection) {
      setMapperStatus("Select text in Output first or switch context to Entire output box.");
      return;
    }
    setMapperStatus("Nothing to preview.");
    return;
  }

  outputText.value = result.mappedFullText;

  setMapperStatus("Preview shown in Output.");
}

function applyMapper() {
  const result = buildMappedTextForTarget();

  if (!result.text) {
    setMapperStatus("Nothing to apply.");
    return;
  }

  if (result.mapped === result.text) {
    setMapperStatus("Applied symbol mapping");
    return;
  }

  outputText.value = result.mappedFullText;
  setMapperStatus("Applied symbol mapping.");
  saveSessionState();
}

function captureSelection(target) {
  setActiveReplaceTarget(target);

  const start = target.selectionStart;
  const end = target.selectionEnd;
  if (start === end) {
    return;
  }

  replaceFind.value = target.value.slice(start, end);
  // setReplaceStatus("Selection captured.");
}

function replaceAllInTarget() {
  const findValue = replaceFind.value;
  if (!findValue) {
    setReplaceStatus("Add text in Find first.");
    return;
  }

  const current = activeReplaceTarget.value;
  if (!current.includes(findValue)) {
    setReplaceStatus(`No matches found in ${targetLabel(activeReplaceTarget)}.`);
    return;
  }

  const replacement = replaceWith.value;
  const parts = current.split(findValue);
  const occurrences = Math.max(parts.length - 1, 0);
  activeReplaceTarget.value = parts.join(replacement);

  if (activeReplaceTarget === inputText) {
    refreshOutput();
    return;
  }

  setReplaceStatus("All Text replaced.");
  saveSessionState();
}

inputText.addEventListener("input", () => {
  refreshOutput();
  showStatus("");
});

preservePatternsToggle?.addEventListener("change", () => {
  refreshOutput();
  showStatus("Formatting option updated.", true);
});

groupSizeMode?.addEventListener("change", () => {
  updateGroupingUi();
  refreshOutput();
  showStatus("Grouping mode updated.", true);
});

customGroupSize?.addEventListener("input", () => {
  if (groupSizeMode?.value !== "custom") {
    return;
  }
  refreshOutput();
  showStatus("Custom group size updated.", true);
});

inputText.addEventListener("focus", () => setActiveReplaceTarget(inputText));
outputText.addEventListener("focus", () => setActiveReplaceTarget(outputText));

inputText.addEventListener("select", () => captureSelection(inputText));
outputText.addEventListener("select", () => captureSelection(outputText));

formatBtn.addEventListener("click", () => {
  refreshOutput();
  showStatus("Formatted.", true);
});

clearBtn.addEventListener("click", () => {
  inputText.value = "";
  outputText.value = "";
  showStatus("Cleared.", true);
  setMapperStatus("");
  inputText.focus();
  saveSessionState();
});

copyBtn.addEventListener("click", async () => {
  if (!outputText.value) {
    showStatus("Nothing to copy yet.");
    return;
  }

  try {
    await navigator.clipboard.writeText(outputText.value);
    showStatus("Output copied to clipboard.", true);
  } catch (error) {
    outputText.select();
    document.execCommand("copy");
    showStatus("Output copied.", true);
  }
});

replaceBtn.addEventListener("click", () => {
  replaceAllInTarget();
});

previewMapperBtn?.addEventListener("click", () => {
  previewMapper();
});

applyMapperBtn?.addEventListener("click", () => {
  applyMapper();
});

symbolPreset?.addEventListener("change", () => {
  setMapperStatus(`Preset: ${symbolPreset.options[symbolPreset.selectedIndex].text}.`);
});

outputText.addEventListener("input", () => {
  saveSessionState();
});

if (preservePatternsToggle) {
  preservePatternsToggle.checked = false;
}

updateGroupingUi();

if (!restoreSessionState()) {
  refreshOutput();
} else {
  saveSessionState();
}
