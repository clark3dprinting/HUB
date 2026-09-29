// Lets every website show inside the hub, and pulls links that try to open a
// new tab back into the hub. Only the hub's own browser tabs are affected.

const HUB_URL = chrome.runtime.getURL("index.html");

chrome.action.onClicked.addListener(() => chrome.tabs.create({ url: HUB_URL }));

async function getHubTabs() {
  return (await chrome.storage.session.get("hubTabs")).hubTabs || [];
}

async function setHubTabs(list) {
  await chrome.storage.session.set({ hubTabs: list });
}

// Sites send "don't show me inside other pages" headers. Removing them only for
// frames inside a hub tab lets them load there, without changing normal browsing.
async function registerHubTab(tabId) {
  const list = await getHubTabs();
  if (!list.includes(tabId)) await setHubTabs([...list, tabId]);
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [tabId],
    addRules: [{
      id: tabId,
      priority: 1,
      action: {
        type: "modifyHeaders",
        // Some sites (like Instagram) send an error page when they can tell they're in a frame.
        requestHeaders: [
          { header: "sec-fetch-dest", operation: "set", value: "document" },
          { header: "sec-fetch-site", operation: "set", value: "none" },
          { header: "sec-fetch-user", operation: "set", value: "?1" },
          { header: "sec-fetch-storage-access", operation: "remove" },
        ],
        responseHeaders: [
          { header: "x-frame-options", operation: "remove" },
          { header: "content-security-policy", operation: "remove" },
        ],
      },
      condition: { tabIds: [tabId], resourceTypes: ["sub_frame"] },
    }],
  });
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg && msg.type === "hub-ready" && sender.tab) {
    registerHubTab(sender.tab.id).then(() => reply({ tabId: sender.tab.id }), () => reply({ tabId: sender.tab.id }));
    return true;
  }
  if (msg && msg.type === "open-tab" && /^https?:\/\//.test(msg.url)) {
    openNormalTab(msg.url);
  }
});

// Tabs the hub opens on purpose (like "Open in a new tab") stay as normal tabs.
const allowed = new Set();
function openNormalTab(url) {
  allowed.add(url);
  chrome.tabs.create({ url });
  setTimeout(() => allowed.delete(url), 5000);
}

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const list = await getHubTabs();
  if (!list.includes(tabId)) return;
  await setHubTabs(list.filter((id) => id !== tabId));
  await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [tabId] });
});

// New tabs opened by a site inside the hub get closed and shown as a hub tab instead.
const waiting = new Map();

function pullIntoHub(tabId, hubTabId, url) {
  chrome.tabs.update(hubTabId, { active: true }).catch(() => {});
  chrome.runtime.sendMessage({ type: "hub-open", tabId: hubTabId, url }).catch(() => {});
  chrome.tabs.remove(tabId).catch(() => {});
}

const isRealUrl = (url) => url && /^https?:/.test(url);

chrome.tabs.onCreated.addListener(async (tab) => {
  const url = tab.pendingUrl || tab.url;
  if (allowed.has(url)) { allowed.delete(url); return; }
  if (tab.openerTabId == null) return;
  if (!(await getHubTabs()).includes(tab.openerTabId)) return;
  if (isRealUrl(url)) pullIntoHub(tab.id, tab.openerTabId, url);
  else if (!url || url === "about:blank") waiting.set(tab.id, tab.openerTabId);
});

chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (!waiting.has(tabId) || !isRealUrl(info.url)) return;
  const hubTabId = waiting.get(tabId);
  waiting.delete(tabId);
  pullIntoHub(tabId, hubTabId, info.url);
});
