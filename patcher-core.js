"use strict";

(function initPatcherCore(root) {
  function getAccounts(data) {
    if (Array.isArray(data?.accounts)) {
      return data.accounts;
    }
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  }

  function analyzeAccounts(accounts) {
    const accountIds = new Set();
    const userIds = new Set();
    let patchable = 0;

    for (const account of accounts) {
      const credentials = account?.credentials || {};
      const accountId = trim(credentials.chatgpt_account_id);
      const userId = trim(credentials.chatgpt_user_id);
      if (accountId) accountIds.add(accountId);
      if (userId) userIds.add(userId);
      if (userId && userId !== accountId) patchable += 1;
    }

    return {
      accountCount: accounts.length,
      uniqueAccountIds: accountIds.size,
      uniqueUserIds: userIds.size,
      patchable,
    };
  }

  function emptyAnalysis() {
    return {
      accountCount: 0,
      uniqueAccountIds: 0,
      uniqueUserIds: 0,
      patchable: 0,
    };
  }

  function patchAccounts(accounts, shouldPreserveOriginal = true) {
    let patched = 0;
    let skipped = 0;

    for (const account of accounts) {
      const credentials = account?.credentials;
      if (!credentials || typeof credentials !== "object") {
        skipped += 1;
        continue;
      }

      const originalAccountId = trim(credentials.chatgpt_account_id);
      const userId = trim(credentials.chatgpt_user_id);
      if (!userId || userId === originalAccountId) {
        skipped += 1;
        continue;
      }

      if (shouldPreserveOriginal) {
        account.extra = account.extra && typeof account.extra === "object" ? account.extra : {};
        account.extra.original_chatgpt_account_id = originalAccountId;
        account.extra.identity_patch =
          "chatgpt_account_id set to chatgpt_user_id for sub2api import de-duplication";
      }

      credentials.chatgpt_account_id = userId;
      patched += 1;
    }

    return { patched, skipped };
  }

  function collectCombinedProxies(patched) {
    const proxies = [];
    const seen = new Set();

    for (const entry of patched) {
      const sourceProxies = Array.isArray(entry.data?.proxies) ? entry.data.proxies : [];
      for (const proxy of sourceProxies) {
        const key = JSON.stringify(proxy);
        if (seen.has(key)) continue;
        seen.add(key);
        proxies.push(proxy);
      }
    }

    return proxies;
  }

  function buildOutputName(fileName) {
    const cleanName = fileName.replace(/\.json$/i, "");
    return `${cleanName}_user_identity_import.json`;
  }

  function trim(value) {
    return String(value || "").trim();
  }

  const api = {
    getAccounts,
    analyzeAccounts,
    emptyAnalysis,
    patchAccounts,
    collectCombinedProxies,
    buildOutputName,
    trim,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.Sub2ApiIdentityPatcher = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
