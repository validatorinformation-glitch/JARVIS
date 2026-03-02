// JARVIS Popup Controller
document.addEventListener('DOMContentLoaded', () => {
  const memoryCount = document.getElementById('memory-count');
  const contextCount = document.getElementById('context-count');
  const sessionStatus = document.getElementById('session-status');
  const statusText = document.getElementById('status-text');
  const statusDot = document.querySelector('.status-dot');

  // Load current stats
  async function loadStats() {
    try {
      const memory = await sendMessage({ type: 'GET_MEMORY' });
      const contexts = await sendMessage({ type: 'GET_CONTEXT' });
      const session = await sendMessage({ type: 'GET_SESSION' });

      memoryCount.textContent = Object.keys(memory || {}).length;
      contextCount.textContent = (contexts || []).length;
      sessionStatus.textContent = session.active ? 'Active' : 'Idle';
      statusText.textContent = 'Online';
      statusDot.classList.add('active');
    } catch (err) {
      statusText.textContent = 'Error';
      console.error('[JARVIS Popup]', err);
    }
  }

  function sendMessage(msg) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(msg, resolve);
    });
  }

  // Rehydrate button
  document.getElementById('btn-rehydrate').addEventListener('click', async () => {
    const btn = document.getElementById('btn-rehydrate');
    btn.textContent = 'Rehydrating...';
    btn.disabled = true;
    const result = await sendMessage({ type: 'REHYDRATE' });
    if (result) {
      memoryCount.textContent = result.session.memoryCount;
      contextCount.textContent = result.session.contextCount;
      sessionStatus.textContent = 'Active';
      statusText.textContent = 'Rehydrated';
    }
    btn.textContent = 'Rehydrate';
    btn.disabled = false;
  });

  // Export button
  document.getElementById('btn-export').addEventListener('click', async () => {
    const memory = await sendMessage({ type: 'GET_MEMORY' });
    const contexts = await sendMessage({ type: 'GET_CONTEXT' });
    const exportData = {
      exportedAt: new Date().toISOString(),
      memory,
      contexts
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jarvis-memory-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Clear button
  document.getElementById('btn-clear').addEventListener('click', async () => {
    if (confirm('Clear all JARVIS memory and context data?')) {
      await chrome.storage.local.clear();
      memoryCount.textContent = '0';
      contextCount.textContent = '0';
      sessionStatus.textContent = 'Cleared';
      statusText.textContent = 'Reset';
    }
  });

  loadStats();
});
