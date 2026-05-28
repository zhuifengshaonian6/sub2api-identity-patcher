"use strict";

const fileInput = document.getElementById("fileInput");
const chooseButton = document.getElementById("chooseButton");
const dropzone = document.getElementById("dropzone");
const preserveOriginal = document.getElementById("preserveOriginal");
const downloadCombined = document.getElementById("downloadCombined");
const patchButton = document.getElementById("patchButton");
const clearButton = document.getElementById("clearButton");
const summary = document.getElementById("summary");
const fileCount = document.getElementById("fileCount");
const accountCount = document.getElementById("accountCount");
const patchedCount = document.getElementById("patchedCount");
const resultList = document.getElementById("resultList");
const statusText = document.getElementById("status");
const {
  getAccounts,
  analyzeAccounts,
  emptyAnalysis,
  patchAccounts,
  collectCombinedProxies,
  buildOutputName,
} = globalThis.Sub2ApiIdentityPatcher;

let selectedFiles = [];
let parsedResults = [];

chooseButton.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => setFiles(Array.from(fileInput.files || [])));
clearButton.addEventListener("click", clearFiles);
patchButton.addEventListener("click", patchAndDownload);

["dragenter", "dragover"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add("is-dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove("is-dragging");
  });
});

dropzone.addEventListener("drop", (event) => {
  const files = Array.from(event.dataTransfer?.files || []).filter((file) => {
    return file.name.toLowerCase().endsWith(".json") || file.type === "application/json";
  });
  setFiles(files);
});

async function setFiles(files) {
  selectedFiles = files;
  parsedResults = [];
  setStatus(files.length ? "正在读取 JSON..." : "");

  for (const file of files) {
    parsedResults.push(await parseFile(file));
  }

  renderSummary();
  setStatus(files.length ? "准备好了，可以修复并下载。" : "");
}

async function parseFile(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const accounts = getAccounts(data);
    const analysis = analyzeAccounts(accounts);
    return { file, data, accounts, analysis, error: null };
  } catch (error) {
    return {
      file,
      data: null,
      accounts: [],
      analysis: emptyAnalysis(),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function renderSummary() {
  const validResults = parsedResults.filter((result) => !result.error);
  const totals = validResults.reduce(
    (acc, result) => {
      acc.accounts += result.analysis.accountCount;
      acc.patchable += result.analysis.patchable;
      return acc;
    },
    { accounts: 0, patchable: 0 },
  );

  fileCount.textContent = String(parsedResults.length);
  accountCount.textContent = String(totals.accounts);
  patchedCount.textContent = String(totals.patchable);
  summary.hidden = parsedResults.length === 0;
  clearButton.disabled = parsedResults.length === 0;
  patchButton.disabled = validResults.length === 0 || totals.patchable === 0;

  resultList.replaceChildren(...parsedResults.map(renderResultItem));
}

function renderResultItem(result) {
  const item = document.createElement("li");
  const title = document.createElement("div");
  const meta = document.createElement("div");

  title.className = "result-title";
  title.textContent = result.file.name;
  meta.className = "result-meta";

  if (result.error) {
    meta.classList.add("result-error");
    meta.textContent = `无法解析: ${result.error}`;
  } else if (!result.accounts.length) {
    meta.classList.add("result-error");
    meta.textContent = "没有找到 accounts 数组";
  } else {
    const info = result.analysis;
    meta.textContent = [
      `${info.accountCount} 个账号`,
      `account_id 唯一 ${info.uniqueAccountIds}`,
      `user_id 唯一 ${info.uniqueUserIds}`,
      `可修复 ${info.patchable}`,
    ].join(" | ");
  }

  item.append(title, meta);
  return item;
}

function patchAndDownload() {
  const validResults = parsedResults.filter((result) => !result.error && result.accounts.length);
  if (!validResults.length) return;

  const patched = validResults.map((result) => {
    const cloned = structuredClone(result.data);
    const accounts = getAccounts(cloned);
    const patchStats = patchAccounts(accounts, preserveOriginal.checked);
    return {
      name: buildOutputName(result.file.name),
      data: cloned,
      stats: patchStats,
    };
  });

  if (downloadCombined.checked && patched.length > 1) {
    const combined = {
      exported_at: new Date().toISOString(),
      patched_by: "sub2api-identity-patcher",
      files: patched.map((entry) => ({
        name: entry.name,
        account_count: getAccounts(entry.data).length,
        patched_count: entry.stats.patched,
      })),
      proxies: collectCombinedProxies(patched),
      accounts: patched.flatMap((entry) => getAccounts(entry.data)),
    };
    downloadJson("sub2api_user_identity_import_combined.json", combined);
  } else {
    for (const entry of patched) {
      downloadJson(entry.name, entry.data);
    }
  }

  const totalPatched = patched.reduce((sum, entry) => sum + entry.stats.patched, 0);
  setStatus(`完成：已修复 ${totalPatched} 条账号。`);
}

function downloadJson(fileName, data) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function clearFiles() {
  selectedFiles = [];
  parsedResults = [];
  fileInput.value = "";
  renderSummary();
  setStatus("");
}

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.classList.toggle("error", isError);
}
