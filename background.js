// JARVIS - Sovereign Steward Background Service Worker
// Manages memory persistence, context bridging, and session continuity

const JARVIS_VERSION = '1.0.0';
const MEMORY_KEY = 'jarvis_memory';
const CONTEXT_KEY = 'jarvis_context';
const SESSION_KEY = 'jarvis_session';

// Initialize JARVIS on install
chrome.runtime.onInstalled.addListener((details) => {
  console.log(`[JARVIS] Sovereign Steward v${JARVIS_VERSION} installed`);
  if (details.reason === 'install') {
    initializeMemoryStore();
  }
});

async function initializeMemoryStore() {
  const defaultMemory = {
    version: JARVIS_VERSION,
    createdAt: new Date().toISOString(),
    sessions: [],
    contexts: [],
    protocols: {
      rehydration: true,
      multiTab: true,
      contextBridge: true
    },
    user: {
      preferences: {},
      patterns: []
    }
  };
  await chrome.storage.local.set({ [MEMORY_KEY]: defaultMemory });
  console.log('[JARVIS] Memory store initialized');
}

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'SAVE_CONTEXT':
      saveContext(message.data).then(sendResponse);
      return true;
    case 'GET_CONTEXT':
      getContext().then(sendResponse);
      return true;
    case 'SAVE_MEMORY':
      saveMemory(message.data).then(sendResponse);
      return true;
    case 'GET_MEMORY':
      getMemory().then(sendResponse);
      return true;
    case 'GET_SESSION':
      getSession().then(sendResponse);
      return true;
    case 'REHYDRATE':
      rehydrate().then(sendResponse);
      return true;
  }
});

async function saveContext(data) {
  try {
    const result = await chrome.storage.local.get(CONTEXT_KEY);
    const contexts = result[CONTEXT_KEY] || [];
    contexts.push({
      ...data,
      timestamp: new Date().toISOString(),
      url: data.url || ''
    });
    // Keep last 100 contexts
    if (contexts.length > 100) contexts.splice(0, contexts.length - 100);
    await chrome.storage.local.set({ [CONTEXT_KEY]: contexts });
    return { success: true, count: contexts.length };
  } catch (err) {
    console.error('[JARVIS] Save context error:', err);
    return { success: false, error: err.message };
  }
}

async function getContext() {
  const result = await chrome.storage.local.get(CONTEXT_KEY);
  return result[CONTEXT_KEY] || [];
}

async function saveMemory(data) {
  try {
    const result = await chrome.storage.local.get(MEMORY_KEY);
    const memory = result[MEMORY_KEY] || {};
    memory.lastUpdated = new Date().toISOString();
    if (data.key && data.value) {
      memory[data.key] = data.value;
    }
    await chrome.storage.local.set({ [MEMORY_KEY]: memory });
    return { success: true };
  } catch (err) {
    console.error('[JARVIS] Save memory error:', err);
    return { success: false, error: err.message };
  }
}

async function getMemory() {
  const result = await chrome.storage.local.get(MEMORY_KEY);
  return result[MEMORY_KEY] || {};
}

async function getSession() {
  const result = await chrome.storage.local.get(SESSION_KEY);
  return result[SESSION_KEY] || { active: false };
}

async function rehydrate() {
  const [memory, contexts] = await Promise.all([
    getMemory(),
    getContext()
  ]);
  const session = {
    active: true,
    startedAt: new Date().toISOString(),
    memoryCount: Object.keys(memory).length,
    contextCount: contexts.length
  };
  await chrome.storage.local.set({ [SESSION_KEY]: session });
  console.log('[JARVIS] Rehydration complete', session);
  return { memory, contexts, session };
}

// Auto-capture tab context changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (tab.url.includes('perplexity.ai')) {
      saveContext({
        type: 'page_visit',
        url: tab.url,
        title: tab.title
      });
    }
  }
});

console.log(`[JARVIS] Sovereign Steward v${JARVIS_VERSION} background ready`);
