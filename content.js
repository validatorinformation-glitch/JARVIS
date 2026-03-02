// JARVIS Content Script - Runs on Perplexity.ai pages
// Captures conversation context and enables memory persistence

(function() {
  'use strict';
  console.log('[JARVIS] Content script loaded on:', window.location.href);

  // Track conversation changes
  let lastContent = '';
  let observer = null;

  function capturePageContext() {
    const title = document.title || '';
    const url = window.location.href;
    const threadId = url.match(/\/search\/([a-zA-Z0-9-]+)/) || url.match(/\/([a-f0-9-]{36})/);
    
    // Get conversation content
    const messages = document.querySelectorAll('[class*="prose"], [class*="message"], [class*="answer"]');
    let content = '';
    messages.forEach(msg => {
      content += msg.textContent.trim() + '\n';
    });

    return {
      title,
      url,
      threadId: threadId ? threadId[1] : null,
      contentLength: content.length,
      contentPreview: content.substring(0, 500),
      capturedAt: new Date().toISOString()
    };
  }

  function saveCurrentContext() {
    const context = capturePageContext();
    if (context.contentPreview && context.contentPreview !== lastContent) {
      lastContent = context.contentPreview;
      chrome.runtime.sendMessage({
        type: 'SAVE_CONTEXT',
        data: context
      }, (response) => {
        if (response && response.success) {
          console.log('[JARVIS] Context saved, total:', response.count);
        }
      });
    }
  }

  // Observe DOM changes for new messages
  function startObserver() {
    const targetNode = document.body;
    if (!targetNode) return;

    observer = new MutationObserver((mutations) => {
      let hasRelevantChange = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1 && (
              node.matches && (node.matches('[class*="prose"]') || node.matches('[class*="message"]'))
            )) {
              hasRelevantChange = true;
              break;
            }
          }
        }
        if (hasRelevantChange) break;
      }
      if (hasRelevantChange) {
        setTimeout(saveCurrentContext, 1000);
      }
    });

    observer.observe(targetNode, {
      childList: true,
      subtree: true
    });
  }

  // Add JARVIS indicator to page
  function addJarvisIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'jarvis-indicator';
    indicator.innerHTML = '&#x1f6e1; JARVIS Active';
    indicator.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      background: rgba(30, 58, 138, 0.9);
      color: #60a5fa;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-family: monospace;
      z-index: 99999;
      border: 1px solid #3b82f6;
      cursor: pointer;
      transition: opacity 0.3s;
    `;
    indicator.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'REHYDRATE' }, (data) => {
        console.log('[JARVIS] Rehydration data:', data);
        alert(`JARVIS Status:\nMemories: ${data.session.memoryCount}\nContexts: ${data.session.contextCount}\nSession: Active`);
      });
    });
    document.body.appendChild(indicator);
  }

  // Initialize
  function init() {
    addJarvisIndicator();
    startObserver();
    saveCurrentContext();
    // Periodic save every 30 seconds
    setInterval(saveCurrentContext, 30000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
