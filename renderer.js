/* global localStorage */
(function () {
  'use strict';

  /**
   * Tabs state
   */
  const tabs = [];
  let activeTabId = null;
  let nextTabId = 1;

  /** DOM elements */
  const tabsContainer = document.getElementById('tabs');
  const newTabButton = document.getElementById('new-tab-button');
  const settingsButton = document.getElementById('settings-button');
  const addressBar = document.getElementById('address-bar');
  const goButton = document.getElementById('go-button');
  const backButton = document.getElementById('back-button');
  const forwardButton = document.getElementById('forward-button');
  const reloadButton = document.getElementById('reload-button');
  const homeButton = document.getElementById('home-button');
  const webviewsContainer = document.getElementById('webviews');
  const progressBar = document.getElementById('progress-bar');
  const progressFill = document.getElementById('progress-fill');

  const settingsModal = document.getElementById('settings-modal');
  const closeSettings = document.getElementById('close-settings');
  const themeSelect = document.getElementById('theme-select');

  /** Progress bar management */
  function showProgressBar() {
    progressBar.classList.remove('hidden');
    progressFill.style.width = '0%';
  }

  function updateProgress(progress) {
    // Progress is between 0 and 1
    const percentage = Math.min(Math.max(progress * 100, 0), 100);
    progressFill.style.width = percentage + '%';
  }

  function hideProgressBar() {
    progressFill.style.width = '100%';
    setTimeout(() => {
      progressBar.classList.add('hidden');
      progressFill.style.width = '0%';
    }, 200);
  }

  /** Theme management */
  const THEME_KEY = 'sigmaTheme';

  function getSystemPrefersDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function applyTheme(theme) {
    const html = document.documentElement;
    if (theme === 'system') {
      html.setAttribute('data-theme', getSystemPrefersDark() ? 'dark' : 'light');
    } else {
      html.setAttribute('data-theme', theme);
    }
    
    // Apply theme to all webviews
    applyThemeToWebviews(theme);
  }

  function applyThemeToWebviews(theme) {
    const actualTheme = theme === 'system' ? (getSystemPrefersDark() ? 'dark' : 'light') : theme;
    
    tabs.forEach(tab => {
      if (tab.webview && !tab.isNewTab) {
        injectThemeCSS(tab.webview, actualTheme);
      }
    });
  }

  function injectThemeCSS(webview, theme) {
    try {
      const css = theme === 'dark' ? `
        html, body { 
          filter: invert(1) hue-rotate(180deg) !important; 
        }
        img, video, canvas, svg { 
          filter: invert(1) hue-rotate(180deg) !important; 
        }
      ` : '';
      
      webview.executeJavaScript(`
        (function() {
          let style = document.getElementById('sigma-theme-style');
          if (!style) {
            style = document.createElement('style');
            style.id = 'sigma-theme-style';
            document.head.appendChild(style);
          }
          style.textContent = \`${css}\`;
        })();
      `);
    } catch (e) {
      // Webview might not be ready yet
    }
  }

  function loadTheme() {
    const saved = localStorage.getItem(THEME_KEY) || 'light';
    themeSelect.value = saved;
    applyTheme(saved);
  }

  function saveTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
  }

  /** URL helpers */
  function isLikelyUrl(text) {
    // Very small heuristic: contains a dot or starts with scheme
    return /^(https?:\/\/|file:\/\/)/i.test(text) || /\./.test(text);
  }

  function normalizeUrl(input) {
    const trimmed = input.trim();
    if (trimmed === '') return 'https://www.google.com';
    if (trimmed === 'sigma:history') return 'sigma:history';
    if (trimmed === 'sigma:newtab' || trimmed === 'about:newtab') return 'sigma:newtab';
    if (isLikelyUrl(trimmed)) {
      if (/^(https?:\/\/|file:\/\/)/i.test(trimmed)) return trimmed;
      return 'https://' + trimmed;
    }
    const q = encodeURIComponent(trimmed);
    return 'https://www.google.com/search?q=' + q;
  }

  /** New Tab Page */
  function createNewTabPage() {
    const newTabDiv = document.createElement('div');
    newTabDiv.className = 'newtab';
    newTabDiv.innerHTML = `
      <div class="newtab-brand">Sigma</div>
      <form id="newtab-search-form" class="newtab-search">
        <input id="newtab-search-input" type="text" placeholder="Search the web or type a URL" />
        <button type="submit">Search</button>
      </form>
    `;
    // Handle search form submission
    const form = newTabDiv.querySelector('#newtab-search-form');
    const input = newTabDiv.querySelector('#newtab-search-input');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = input.value.trim();
      if (query) {
        navigateActiveTabTo(query);
      }
    });
    return newTabDiv;
  }

  function createHistoryTabPage() {
    const historyDiv = document.createElement('div');
    historyDiv.className = 'newtab';
    historyDiv.innerHTML = `
      <div class="newtab-brand">History</div>
      <div class="history-controls" style="margin-bottom: 20px; display: flex; gap: 10px; align-items: center; justify-content: center; flex-wrap: wrap;">
        <button id="select-all-history" class="history-btn" style="padding: 8px 16px; background: var(--accent); color: white; border: none; border-radius: 4px; cursor: pointer;">Select All</button>
        <button id="deselect-all-history" class="history-btn" style="padding: 8px 16px; background: var(--border); color: var(--fg); border: none; border-radius: 4px; cursor: pointer;">Deselect All</button>
        <button id="delete-selected-history" class="history-btn" style="padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;" disabled>Delete Selected</button>
        <button id="clear-all-history" class="history-btn" style="padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Clear All History</button>
      </div>
      <ul id="history-list-tab" style="max-height:400px;overflow:auto;width:min(600px,80vw);padding-left:0;"></ul>
    `;

    const historyListTab = historyDiv.querySelector('#history-list-tab');
    renderHistoryTab(historyListTab);

    // Wire up management controls
    setupHistoryManagementControls(historyDiv);

    return historyDiv;
  }

  function renderHistoryTab(listElem) {
    if (!listElem) return;
    const history = getHistory();
    listElem.innerHTML = '';
    if (history.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'No history yet.';
      li.style.listStyle = 'none';
      li.style.textAlign = 'center';
      li.style.padding = '20px';
      li.style.color = 'var(--muted-fg)';
      listElem.appendChild(li);
      return;
    }

    history.forEach(entry => {
      const li = document.createElement('li');
      li.style.listStyle = 'none';
      li.style.marginBottom = '12px';
      li.style.padding = '12px';
      li.style.border = '1px solid var(--border-color, #ddd)';
      li.style.borderRadius = '6px';
      li.style.display = 'flex';
      li.style.alignItems = 'flex-start';
      li.style.gap = '12px';
      li.style.transition = 'all 0.2s ease';
      li.className = 'history-entry';

      // Checkbox for selection
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'history-checkbox';
      checkbox.dataset.url = entry.url;
      checkbox.style.marginTop = '2px';
      checkbox.style.cursor = 'pointer';

      // Content container
      const contentDiv = document.createElement('div');
      contentDiv.style.flex = '1';
      contentDiv.style.minWidth = '0';

      const titleDiv = document.createElement('div');
      titleDiv.style.fontWeight = 'bold';
      titleDiv.style.marginBottom = '4px';
      titleDiv.style.wordBreak = 'break-word';
      titleDiv.textContent = entry.title;

      const urlDiv = document.createElement('div');
      urlDiv.style.fontSize = '0.9em';
      urlDiv.style.color = 'var(--text-secondary, #666)';
      urlDiv.style.wordBreak = 'break-all';
      urlDiv.textContent = entry.url;

      const timestampDiv = document.createElement('div');
      timestampDiv.style.fontSize = '0.8em';
      timestampDiv.style.color = 'var(--muted-fg)';
      timestampDiv.style.marginTop = '4px';
      timestampDiv.textContent = new Date(entry.timestamp).toLocaleString();

      contentDiv.appendChild(titleDiv);
      contentDiv.appendChild(urlDiv);
      contentDiv.appendChild(timestampDiv);

      // Make content clickable
      const clickableArea = document.createElement('a');
      clickableArea.href = '#';
      clickableArea.style.textDecoration = 'none';
      clickableArea.style.color = 'inherit';
      clickableArea.style.display = 'block';
      clickableArea.style.flex = '1';
      clickableArea.appendChild(contentDiv);

      clickableArea.addEventListener('click', (e) => {
        e.preventDefault();
        createTab(entry.url);
      });

      // Checkbox change handler
      checkbox.addEventListener('change', updateHistorySelectionState);

      li.appendChild(checkbox);
      li.appendChild(clickableArea);
      listElem.appendChild(li);
    });
  }

  /** Tabs */
  function createTab(startUrl) {
    const tabId = nextTabId++;

    // Set initial title based on URL for non-special pages
    let initialTitle = 'New Tab';
    if (startUrl && !startUrl.startsWith('about:') && !startUrl.startsWith('sigma:')) {
      try {
        const urlObj = new URL(startUrl);
        initialTitle = urlObj.hostname || 'Loading...';
      } catch {
        initialTitle = 'Loading...';
      }
    }

    const tab = {
      id: tabId,
      title: initialTitle,
      url: startUrl || 'about:newtab',
      webview: null,
      tabElement: null,
      closeButton: null,
      isNewTab: startUrl === 'about:newtab',
      isHistoryTab: startUrl === 'sigma:history',
      newTabElement: null
    };

    // Create tab button
    const li = document.createElement('li');
    li.className = 'tab';
    li.dataset.tabId = String(tabId);
    const titleSpan = document.createElement('span');
    titleSpan.className = 'tab-title';
    titleSpan.textContent = tab.isHistoryTab ? 'History' : tab.title;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'tab-close';
    closeBtn.textContent = '×';
    li.appendChild(titleSpan);
    li.appendChild(closeBtn);
    tabsContainer.appendChild(li);

    if (tab.isNewTab) {
      // Create new tab page content
      const newTabElement = createNewTabPage();
      newTabElement.style.display = 'none';
      webviewsContainer.appendChild(newTabElement);
      tab.newTabElement = newTabElement;
    } else if (tab.isHistoryTab) {
      // Create history tab page content
      const historyTabElement = createHistoryTabPage();
      historyTabElement.style.display = 'none';
      webviewsContainer.appendChild(historyTabElement);
      tab.newTabElement = historyTabElement;
    } else {
      // Create webview for actual websites
      const webview = document.createElement('webview');
      webview.className = 'webview';
      webview.setAttribute('allowpopups', '');
      webview.setAttribute('preload', './webview-preload.js');
      webview.setAttribute('partition', 'persist:sigma-session');
      webview.setAttribute('webpreferences', 'contextIsolation=yes,nodeIntegration=no,enableRemoteModule=no');
      webview.setAttribute('useragent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Sigma/1.0.0');

      // Set initial visibility - visible if this will be the active tab, hidden otherwise
      const willBeActive = activeTabId === null || activeTabId === tabId;
      webview.style.display = willBeActive ? 'flex' : 'none';

      webviewsContainer.appendChild(webview);
      tab.webview = webview;

      // Set src after adding to DOM and setting visibility to ensure proper loading
      webview.src = tab.url;
      
      // Immediately update tab title with hostname
      if (tab.url && !tab.url.startsWith('about:') && !tab.url.startsWith('sigma:')) {
        try {
          const urlObj = new URL(tab.url);
          const hostname = urlObj.hostname || 'Loading...';
          const titleSpan = tab.tabElement.querySelector('.tab-title');
          if (titleSpan) titleSpan.textContent = hostname;
          tab.title = hostname;
          if (tab.id === activeTabId) {
            document.title = hostname + ' - Sigma';
          }
        } catch {}
      }
      
      // Theme will be applied in dom-ready event
    }

    tab.tabElement = li;
    tab.closeButton = closeBtn;
    tabs.push(tab);

    // Wire events
    li.addEventListener('click', (e) => {
      if (e.target === closeBtn) return; // close is handled separately
      setActiveTab(tabId);
    });
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(tabId);
    });

    if (tab.webview) {
      // Track webview ready state
      tab.webview._isReady = false;

      webview.addEventListener('dom-ready', () => {
        tab.webview._isReady = true;
        // Apply theme once DOM is ready
        const currentTheme = localStorage.getItem(THEME_KEY) || 'light';
        const actualTheme = currentTheme === 'system' ? (getSystemPrefersDark() ? 'dark' : 'light') : currentTheme;
        injectThemeCSS(webview, actualTheme);
      });

      webview.addEventListener('did-start-loading', () => {
        li.classList.add('loading');
        if (tab.id === activeTabId) {
          showProgressBar();
        }
      });
      webview.addEventListener('did-stop-loading', () => {
        li.classList.remove('loading');
        if (tab.id === activeTabId) {
          hideProgressBar();
        }
        // Update title from hostname if page has no title
        if (!tab.title || tab.title === 'Loading...') {
          try {
            const urlObj = new URL(tab.url);
            const hostname = urlObj.hostname || 'New Tab';
            titleSpan.textContent = hostname;
            tab.title = hostname;
            if (tab.id === activeTabId) {
              document.title = hostname + ' - Sigma';
            }
          } catch {}
        }
      });
      webview.addEventListener('page-title-updated', (ev) => {
        // Only update title if we got a non-empty title from the page
        if (ev.title) {
          const newTitle = ev.title;
          tab.title = newTitle;
          titleSpan.textContent = newTitle;
          if (tab.id === activeTabId) {
            document.title = newTitle + ' - Sigma';
          }
          // Update history with the actual page title
          addToHistory(tab.url, newTitle);
        }
      });

      // Also update title when page starts loading
      webview.addEventListener('did-start-loading', () => {
        if (!tab.title || tab.title === 'New Tab') {
          try {
            const urlObj = new URL(tab.url);
            const hostname = urlObj.hostname || 'Loading...';
            titleSpan.textContent = hostname;
            tab.title = hostname;
            if (tab.id === activeTabId) {
              document.title = hostname + ' - Sigma';
            }
          } catch {}
        }
        li.classList.add('loading');
      });
      webview.addEventListener('did-navigate', (ev) => {
        tab.url = ev.url;
        if (tab.id === activeTabId) {
          addressBar.value = ev.url;
          // Update initial title based on URL while page loads
          try {
            const urlObj = new URL(ev.url);
            const hostname = urlObj.hostname || 'Loading...';
            titleSpan.textContent = hostname;
            tab.title = hostname;
            document.title = hostname + ' - Sigma';
          } catch {}
        }
        updateNavButtons();
        // Add to history when navigating
        addToHistory(ev.url);
      });
      webview.addEventListener('did-navigate-in-page', (ev) => {
        tab.url = ev.url;
        if (tab.id === activeTabId) {
          addressBar.value = ev.url;
        }
        updateNavButtons();
        // Add to history when navigating within page
        addToHistory(ev.url);
      });
    }

    if (activeTabId === null) {
      setActiveTab(tabId);
    } else {
      // Auto-switch to new tab
      setActiveTab(tabId);
    }

    return tabId;
  }

  function setActiveTab(tabId) {
    if (activeTabId === tabId) return;
    activeTabId = tabId;
    for (const t of tabs) {
      const isActive = t.id === tabId;
      t.tabElement.classList.toggle('active', isActive);
      if (t.isNewTab || t.isHistoryTab) {
        if (t.newTabElement) {
          t.newTabElement.style.display = isActive ? 'flex' : 'none';
        }
        if (isActive) {
          addressBar.value = t.isHistoryTab ? 'sigma:history' : '';
          document.title = t.isHistoryTab ? 'History - Sigma' : 'New Tab - Sigma';
          updateNavButtons();
        }
      } else if (t.webview) {
        // Handle webview visibility more carefully
        if (isActive) {
          t.webview.style.display = 'flex';
          // Focus the webview when it becomes active
          setTimeout(() => {
            if (t.webview && t.webview._isReady) {
              try {
                t.webview.focus();
              } catch (e) {
                // Ignore focus errors
              }
            }
          }, 100);
          addressBar.value = t.url;
          document.title = `${t.title} - Sigma`;
          updateNavButtons();
        } else {
          // Only hide webview if it's ready to avoid interrupting initial load
          if (t.webview._isReady) {
            t.webview.style.display = 'none';
          }
        }
      }
    }
  }

  function getActiveTab() {
    return tabs.find((t) => t.id === activeTabId) || null;
  }

  function closeTab(tabId) {
    const index = tabs.findIndex((t) => t.id === tabId);
    if (index === -1) return;
    const [tab] = tabs.splice(index, 1);
    tab.tabElement.remove();

    // Clean up tab content elements
    if (tab.newTabElement) {
      tab.newTabElement.remove();
    }
    if (tab.webview) {
      tab.webview.remove();
    }

    if (activeTabId === tabId) {
      const next = tabs[index] || tabs[index - 1] || null;
      if (next) setActiveTab(next.id);
      else if (tabs.length === 0) {
        // Close the app when all tabs are closed
        window.close();
      } else {
        createTab('about:newtab');
      }
    }
  }

  /** Navigation */
  function navigateActiveTabTo(input) {
    const tab = getActiveTab();
    if (!tab) return;
    const url = normalizeUrl(input);
    
    // Save current URL to navigation stack before navigating
    if (tab.url && tab.url !== 'about:blank' && !tab.url.startsWith('sigma:')) {
      if (!tab._navStack) tab._navStack = [];
      tab._navStack.push(tab.url);
    }
    
    if (url === 'sigma:history') {
      // Convert current tab to history if it's a new tab, otherwise create new history tab
      if (tab.isNewTab) {
        convertToHistoryTab(tab);
      } else {
        createTab('sigma:history');
      }
      return;
    }
    if (url === 'sigma:newtab') {
      createTab('sigma:newtab');
      return;
    }
    if (tab.isNewTab || tab.isHistoryTab) {
      // Convert new tab or history tab to regular webview
      convertNewTabToWebview(tab, url);
    } else {
      tab.webview.loadURL(url);
    }
    // Note: addToHistory is handled by did-navigate event listeners
  }

  // History logic
  const HISTORY_KEY = 'sigmaHistory';
  function getHistory() {
    try {
      const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      // Normalize history format for backward compatibility
      return history.map(entry => {
        if (typeof entry === 'string') {
          // Convert old string format to new object format
          return {
            url: entry,
            title: entry,
            timestamp: Date.now()
          };
        }
        return entry;
      });
    } catch {
      return [];
    }
  }
  function addToHistory(url, title = null) {
    if (!url || url.startsWith('about:') || url.startsWith('sigma:')) return;
    let history = getHistory();

    // Create history entry object
    const historyEntry = {
      url: url,
      title: title || url,
      timestamp: Date.now()
    };

    // Avoid consecutive duplicates (check by URL)
    const lastEntry = history[0];
    const isDuplicate = lastEntry && (
      (typeof lastEntry === 'string' && lastEntry === url) ||
      (typeof lastEntry === 'object' && lastEntry.url === url)
    );

    if (!isDuplicate) {
      history.unshift(historyEntry);
      if (history.length > 100) history = history.slice(0, 100);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } else if (lastEntry && typeof lastEntry === 'object' && title && lastEntry.title !== title) {
      // Update the title of the last entry if we have a better title
      lastEntry.title = title;
      lastEntry.timestamp = Date.now();
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }
  }

  // History management functions
  function clearAllHistory() {
    localStorage.removeItem(HISTORY_KEY);
    // Update all history displays
    refreshAllHistoryDisplays();
  }

  function deleteSelectedHistory(selectedUrls) {
    if (!selectedUrls || selectedUrls.length === 0) return;

    let history = getHistory();
    // Filter out selected entries
    history = history.filter(entry => !selectedUrls.includes(entry.url));

    // Save updated history
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));

    // Update all history displays
    refreshAllHistoryDisplays();
  }

  function refreshAllHistoryDisplays() {
    // Refresh history tab if it exists
    const historyListTab = document.getElementById('history-list-tab');
    if (historyListTab) {
      renderHistoryTab(historyListTab);
    }

    // Refresh history modal if it exists
    const historyList = document.getElementById('history-list');
    if (historyList) {
      renderHistory();
    }
  }

  function updateHistorySelectionState() {
    const checkboxes = document.querySelectorAll('.history-checkbox');
    const selectedCheckboxes = document.querySelectorAll('.history-checkbox:checked');
    const deleteSelectedBtn = document.getElementById('delete-selected-history');
    const selectAllBtn = document.getElementById('select-all-history');
    const deselectAllBtn = document.getElementById('deselect-all-history');

    if (deleteSelectedBtn) {
      deleteSelectedBtn.disabled = selectedCheckboxes.length === 0;
      deleteSelectedBtn.textContent = selectedCheckboxes.length > 0
        ? `Delete Selected (${selectedCheckboxes.length})`
        : 'Delete Selected';
    }

    if (selectAllBtn) {
      selectAllBtn.disabled = selectedCheckboxes.length === checkboxes.length;
    }

    if (deselectAllBtn) {
      deselectAllBtn.disabled = selectedCheckboxes.length === 0;
    }

    // Update visual feedback for selected entries
    checkboxes.forEach(checkbox => {
      const historyEntry = checkbox.closest('.history-entry');
      if (historyEntry) {
        if (checkbox.checked) {
          historyEntry.style.backgroundColor = 'var(--accent-bg, rgba(59, 130, 246, 0.1))';
          historyEntry.style.borderColor = 'var(--accent)';
        } else {
          historyEntry.style.backgroundColor = '';
          historyEntry.style.borderColor = 'var(--border-color, #ddd)';
        }
      }
    });
  }

  function setupHistoryManagementControls(historyDiv) {
    const selectAllBtn = historyDiv.querySelector('#select-all-history');
    const deselectAllBtn = historyDiv.querySelector('#deselect-all-history');
    const deleteSelectedBtn = historyDiv.querySelector('#delete-selected-history');
    const clearAllBtn = historyDiv.querySelector('#clear-all-history');

    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        const checkboxes = historyDiv.querySelectorAll('.history-checkbox');
        checkboxes.forEach(checkbox => {
          checkbox.checked = true;
        });
        updateHistorySelectionState();
      });
    }

    if (deselectAllBtn) {
      deselectAllBtn.addEventListener('click', () => {
        const checkboxes = historyDiv.querySelectorAll('.history-checkbox');
        checkboxes.forEach(checkbox => {
          checkbox.checked = false;
        });
        updateHistorySelectionState();
      });
    }

    if (deleteSelectedBtn) {
      deleteSelectedBtn.addEventListener('click', () => {
        const selectedCheckboxes = historyDiv.querySelectorAll('.history-checkbox:checked');
        if (selectedCheckboxes.length === 0) return;

        const selectedUrls = Array.from(selectedCheckboxes).map(cb => cb.dataset.url);
        showDeleteSelectedConfirmation(selectedUrls);
      });
    }

    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
        showClearAllHistoryConfirmation();
      });
    }
  }

  function showClearAllHistoryConfirmation() {
    const history = getHistory();
    if (history.length === 0) {
      alert('No history to clear.');
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to clear all browsing history?\n\n` +
      `This will permanently delete ${history.length} history entries.\n\n` +
      `This action cannot be undone.`
    );

    if (confirmed) {
      clearAllHistory();
    }
  }

  function showDeleteSelectedConfirmation(selectedUrls) {
    if (!selectedUrls || selectedUrls.length === 0) return;

    const confirmed = confirm(
      `Are you sure you want to delete ${selectedUrls.length} selected history entries?\n\n` +
      `This action cannot be undone.`
    );

    if (confirmed) {
      deleteSelectedHistory(selectedUrls);
    }
  }
  function renderHistory() {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;
    const history = getHistory();
    historyList.innerHTML = '';
    if (history.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'No history yet.';
      li.style.listStyle = 'none';
      historyList.appendChild(li);
      return;
    }
    history.forEach(entry => {
      const li = document.createElement('li');
      li.style.listStyle = 'none';
      li.style.marginBottom = '12px';
      li.style.padding = '8px';
      li.style.border = '1px solid var(--border-color, #ddd)';
      li.style.borderRadius = '4px';

      const titleDiv = document.createElement('div');
      titleDiv.style.fontWeight = 'bold';
      titleDiv.style.marginBottom = '4px';
      titleDiv.textContent = entry.title;

      const urlDiv = document.createElement('div');
      urlDiv.style.fontSize = '0.9em';
      urlDiv.style.color = 'var(--text-secondary, #666)';
      urlDiv.textContent = entry.url;

      const clickableArea = document.createElement('a');
      clickableArea.href = '#';
      clickableArea.style.textDecoration = 'none';
      clickableArea.style.color = 'inherit';
      clickableArea.style.display = 'block';
      clickableArea.appendChild(titleDiv);
      clickableArea.appendChild(urlDiv);

      clickableArea.addEventListener('click', (e) => {
        e.preventDefault();
        createTab(entry.url);
        closeHistoryModal();
        closeSettingsModal();
      });

      li.appendChild(clickableArea);
      historyList.appendChild(li);
    });
  }

  // Show/Hide History modal
  function openHistoryModal() {
    renderHistory();
    document.getElementById('history-modal').classList.remove('hidden');
  }
  function closeHistoryModal() {
    document.getElementById('history-modal').classList.add('hidden');
  }

  function convertToHistoryTab(tab) {
    // Clean up existing elements
    if (tab.webview) {
      tab.webview.remove();
      tab.webview = null;
    }
    if (tab.newTabElement) {
      tab.newTabElement.remove();
      tab.newTabElement = null;
    }
    
    // Update tab properties
    tab.isNewTab = false;
    tab.isHistoryTab = true;
    tab.url = 'sigma:history';
    tab.title = 'History';
    
    // Update tab title
    const titleSpan = tab.tabElement.querySelector('.tab-title');
    if (titleSpan) titleSpan.textContent = 'History';
    
    // Create history page element
    const historyTabElement = createHistoryTabPage();
    webviewsContainer.appendChild(historyTabElement);
    tab.newTabElement = historyTabElement;

    // Update UI - let setActiveTab handle the display
    addressBar.value = 'sigma:history';
    document.title = 'History - Sigma';
    updateNavButtons();
  }

  function convertNewTabToWebview(tab, url) {
    // Remove new tab element
    if (tab.newTabElement) {
      tab.newTabElement.remove();
      tab.newTabElement = null;
    }
    
    // Create webview
    const webview = document.createElement('webview');
    webview.className = 'webview';
    webview.setAttribute('allowpopups', '');
    webview.setAttribute('preload', './webview-preload.js');
    webview.setAttribute('partition', 'persist:sigma-session');
    webview.setAttribute('webpreferences', 'contextIsolation=yes,nodeIntegration=no,enableRemoteModule=no');
    webview.setAttribute('useragent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Sigma/1.0.0');

    // Set visible since this is converting the active tab
    webview.style.display = 'flex';
    webviewsContainer.appendChild(webview);

    // Set src after adding to DOM and setting visibility
    webview.src = url;
    
    // Theme will be applied in dom-ready event
    
    // Update tab properties
    tab.webview = webview;
    tab.isNewTab = false;
    tab.isHistoryTab = false;
    tab.url = url;
    
    // Wire webview events
    webview._isReady = false;

    webview.addEventListener('dom-ready', () => {
      webview._isReady = true;
      // Apply theme once DOM is ready
      const currentTheme = localStorage.getItem(THEME_KEY) || 'light';
      const actualTheme = currentTheme === 'system' ? (getSystemPrefersDark() ? 'dark' : 'light') : currentTheme;
      injectThemeCSS(webview, actualTheme);
    });

    webview.addEventListener('did-start-loading', () => {
      tab.tabElement.classList.add('loading');
      if (tab.id === activeTabId) {
        showProgressBar();
      }
    });
    webview.addEventListener('did-stop-loading', () => {
      tab.tabElement.classList.remove('loading');
      if (tab.id === activeTabId) {
        hideProgressBar();
      }
    });
    webview.addEventListener('page-title-updated', (ev) => {
      const newTitle = ev.title || 'Tab';
      tab.title = newTitle;
      const titleSpan = tab.tabElement.querySelector('.tab-title');
      if (titleSpan) titleSpan.textContent = newTitle;
      if (tab.id === activeTabId) {
        document.title = newTitle + ' - Sigma';
      }
      // Update history with the actual page title
      if (ev.title) {
        addToHistory(tab.url, newTitle);
      }
    });
    webview.addEventListener('did-navigate', (ev) => {
      tab.url = ev.url;
      if (tab.id === activeTabId) {
        addressBar.value = ev.url;
      }
      updateNavButtons();
      // Add to history when navigating
      addToHistory(ev.url);
    });
    webview.addEventListener('did-navigate-in-page', (ev) => {
      tab.url = ev.url;
      if (tab.id === activeTabId) {
        addressBar.value = ev.url;
      }
      updateNavButtons();
      // Add to history when navigating within page
      addToHistory(ev.url);
    });

    // Note: Display will be set by setActiveTab
  }

  function updateNavButtons() {
    const tab = getActiveTab();
    if (!tab) {
      backButton.disabled = true;
      forwardButton.disabled = true;
      return;
    }

    // Handle navigation stack
    const hasStackHistory = tab._navStack && tab._navStack.length > 0;
    const hasForwardStack = tab._forwardStack && tab._forwardStack.length > 0;
    
    try {
      if (tab.isNewTab || tab.isHistoryTab) {
        // For new tab or history tab, only use stack navigation
        backButton.disabled = !hasStackHistory;
        forwardButton.disabled = !hasForwardStack;
      } else if (tab.webview) {
        // For regular pages, check both webview and stack
        const canWebviewGoBack = tab.webview.canGoBack();
        const canWebviewGoForward = tab.webview.canGoForward();
        
        backButton.disabled = !hasStackHistory && !canWebviewGoBack;
        forwardButton.disabled = !hasForwardStack && !canWebviewGoForward;
      }
    } catch (_) {
      // Fallback to just stack navigation if webview methods fail
      backButton.disabled = !hasStackHistory;
      forwardButton.disabled = !hasForwardStack;
    }
  }

  /** Settings modal */
  function openSettings() {
    settingsModal.classList.remove('hidden');
  }
  function closeSettingsModal() {
    settingsModal.classList.add('hidden');
  }

  /** Wire UI events */
  newTabButton.addEventListener('click', () => createTab('about:newtab'));
  tabsContainer.addEventListener('dblclick', () => createTab('about:newtab'));

  goButton.addEventListener('click', () => navigateActiveTabTo(addressBar.value));
  addressBar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') navigateActiveTabTo(addressBar.value);
  });

  backButton.addEventListener('click', () => {
    const tab = getActiveTab();
    if (tab && tab.webview) tab.webview.goBack();
  });
  forwardButton.addEventListener('click', () => {
    const tab = getActiveTab();
    if (tab && tab.webview) tab.webview.goForward();
  });
  reloadButton.addEventListener('click', () => {
    const tab = getActiveTab();
    if (tab && tab.webview) tab.webview.reload();
  });
  homeButton.addEventListener('click', () => {
    const tab = getActiveTab();
    if (!tab) return;
    // If already on the new tab page, do nothing
    if (tab.isNewTab) {
      setActiveTab(tab.id);
      addressBar.value = '';
      return;
    }
    // Remove webview if present
    if (tab.webview) {
      tab.webview.remove();
      tab.webview = null;
    }
    // Remove history tab element if present
    if (tab.isHistoryTab && tab.newTabElement) {
      tab.newTabElement.remove();
      tab.newTabElement = null;
    }
    // Set as new tab
    tab.isNewTab = true;
    tab.isHistoryTab = false;
    tab.url = 'sigma:newtab';
    tab.title = 'New Tab';
    const titleSpan = tab.tabElement.querySelector('.tab-title');
    if (titleSpan) titleSpan.textContent = 'New Tab';
    // Create new tab page element
    const newTabElement = createNewTabPage();
    newTabElement.style.display = 'flex';
    webviewsContainer.appendChild(newTabElement);
    tab.newTabElement = newTabElement;
    addressBar.value = '';
    setActiveTab(tab.id);
  });


  settingsButton.addEventListener('click', openSettings);
  closeSettings.addEventListener('click', closeSettingsModal);
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeSettingsModal();
  });

  // History modal events
  const openHistoryBtn = document.getElementById('open-history');
  if (openHistoryBtn) {
    openHistoryBtn.addEventListener('click', () => {
      // Close settings modal
      closeSettingsModal();
      // Open history in new tab
      createTab('sigma:history');
    });
  }
  const closeHistoryBtn = document.getElementById('close-history');
  if (closeHistoryBtn) closeHistoryBtn.addEventListener('click', closeHistoryModal);
  const historyModal = document.getElementById('history-modal');
  if (historyModal) historyModal.addEventListener('click', (e) => {
    if (e.target === historyModal) closeHistoryModal();
  });

  themeSelect.addEventListener('change', () => saveTheme(themeSelect.value));
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const saved = localStorage.getItem(THEME_KEY) || 'light';
    if (saved === 'system') applyTheme('system');
  });


  // Handle 'new-tab' event from main process (context menu)
  if (window.sigmaAPI && window.sigmaAPI.onNewTab) {
    window.sigmaAPI.onNewTab((url) => {
      // Create a new tab but ensure it's treated as a regular tab, not a newtab page
      const tabId = nextTabId++;
      const urlObj = new URL(url);
      const initialTitle = urlObj.hostname || 'Loading...';

      // Create the tab object with a webview right away
      const tab = {
        id: tabId,
        title: initialTitle,
        url: url,
        isNewTab: false,
        isHistoryTab: false,
        webview: null,
        tabElement: null,
        closeButton: null
      };

      // Create tab button
      const li = document.createElement('li');
      li.className = 'tab';
      li.dataset.tabId = String(tabId);
      const titleSpan = document.createElement('span');
      titleSpan.className = 'tab-title';
      titleSpan.textContent = initialTitle;
      const closeBtn = document.createElement('button');
      closeBtn.className = 'tab-close';
      closeBtn.textContent = '×';
      li.appendChild(titleSpan);
      li.appendChild(closeBtn);
      tabsContainer.appendChild(li);

      // Create and set up webview
      const webview = document.createElement('webview');
      webview.className = 'webview';
      webview.setAttribute('allowpopups', '');
      webview.setAttribute('preload', './webview-preload.js');
      webview.setAttribute('partition', 'persist:sigma-session');
      webview.setAttribute('webpreferences', 'contextIsolation=yes,nodeIntegration=no,enableRemoteModule=no');
      webview.setAttribute('useragent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Sigma/1.0.0');

      // This will become the active tab, so make it visible
      webview.style.display = 'flex';
      webviewsContainer.appendChild(webview);
      tab.webview = webview;

      // Set src after adding to DOM and setting visibility
      webview.src = url;
      
      // Theme will be applied in dom-ready event
      
      // Wire up all webview events
      webview._isReady = false;

      webview.addEventListener('dom-ready', () => {
        webview._isReady = true;
        // Apply theme once DOM is ready
        const currentTheme = localStorage.getItem(THEME_KEY) || 'light';
        const actualTheme = currentTheme === 'system' ? (getSystemPrefersDark() ? 'dark' : 'light') : currentTheme;
        injectThemeCSS(webview, actualTheme);
      });

      webview.addEventListener('did-start-loading', () => {
        li.classList.add('loading');
        if (tab.id === activeTabId) {
          showProgressBar();
        }
      });

      webview.addEventListener('did-stop-loading', () => {
        li.classList.remove('loading');
        if (tab.id === activeTabId) {
          hideProgressBar();
        }
        // Update title from hostname if page has no title
        if (!tab.title || tab.title === 'Loading...') {
          try {
            const urlObj = new URL(tab.url);
            const hostname = urlObj.hostname || 'New Tab';
            titleSpan.textContent = hostname;
            tab.title = hostname;
            if (tab.id === activeTabId) {
              document.title = hostname + ' - Sigma';
            }
          } catch {}
        }
      });

      webview.addEventListener('page-title-updated', (ev) => {
        if (ev.title) {
          const newTitle = ev.title;
          tab.title = newTitle;
          titleSpan.textContent = newTitle;
          if (tab.id === activeTabId) {
            document.title = newTitle + ' - Sigma';
          }
          // Update history with the actual page title
          addToHistory(tab.url, newTitle);
        }
      });

      webview.addEventListener('did-navigate', (ev) => {
        tab.url = ev.url;
        if (tab.id === activeTabId) {
          addressBar.value = ev.url;
          // Update initial title based on URL while page loads
          try {
            const urlObj = new URL(ev.url);
            const hostname = urlObj.hostname || 'Loading...';
            titleSpan.textContent = hostname;
            tab.title = hostname;
            document.title = hostname + ' - Sigma';
          } catch {}
        }
        updateNavButtons();
        // Add to history when navigating
        addToHistory(ev.url);
      });

      webview.addEventListener('did-navigate-in-page', (ev) => {
        tab.url = ev.url;
        if (tab.id === activeTabId) {
          addressBar.value = ev.url;
        }
        updateNavButtons();
        // Add to history when navigating within page
        addToHistory(ev.url);
      });

      // Store references and wire up tab events
      tab.tabElement = li;
      tab.closeButton = closeBtn;
      tabs.push(tab);

      li.addEventListener('click', (e) => {
        if (e.target === closeBtn) return;
        setActiveTab(tabId);
      });
      
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeTab(tabId);
      });

      // Note: Display will be set by setActiveTab

      // Activate the new tab
      setActiveTab(tabId);

      // Note: addToHistory is handled by did-navigate event listeners

      return tabId;
    });
  }

  // Optionally handle 'copy-link' event (context menu)
  if (window.sigmaAPI && window.sigmaAPI.onCopyLink) {
    window.sigmaAPI.onCopyLink((url) => {
      navigator.clipboard.writeText(url);
    });
  }

  // Keyboard shortcuts

  // Listen for global shortcut actions from main process
  if (window.sigmaAPI && window.sigmaAPI.onShortcut) {
    window.sigmaAPI.onShortcut((action) => {
      switch (action) {
        case 'new-tab':
          createTab('about:newtab');
          break;
        case 'back': {
          const tab = getActiveTab();
          if (tab && tab.webview) tab.webview.goBack();
          break;
        }
        case 'forward': {
          const tab = getActiveTab();
          if (tab && tab.webview) tab.webview.goForward();
          break;
        }
        case 'close-tab': {
          const tab = getActiveTab();
          if (tab) closeTab(tab.id);
          break;
        }
        case 'history': {
          const tab = getActiveTab();
          if (tab && tab.isNewTab) {
            // Convert current tab to history if it's a new tab
            convertToHistoryTab(tab);
          } else {
            // Create new history tab
            createTab('sigma:history');
          }
          break;
        }
        case 'reload': {
          const tab = getActiveTab();
          if (tab && tab.webview) tab.webview.reload();
          break;
        }
      }
    });
  }

  // Always keep tab focus for shortcuts to work reliably
  function ensureTabFocus() {
    const tab = getActiveTab();
    if (!tab) return;
    if (tab.webview) {
      tab.webview.focus();
    } else if (tab.newTabElement) {
      tab.newTabElement.focus();
    }
  }
  // Refocus tab after tab change, navigation, or shortcut
  [tabsContainer, addressBar, goButton, backButton, forwardButton, reloadButton, homeButton].forEach(el => {
    if (el) el.addEventListener('click', ensureTabFocus);
  });
  // Also refocus after tab is created or activated
  const origSetActiveTab = setActiveTab;
  setActiveTab = function(tabId) {
    origSetActiveTab(tabId);
    ensureTabFocus();
  };

  // Initialize
  loadTheme();
  createTab('about:newtab');
})();


