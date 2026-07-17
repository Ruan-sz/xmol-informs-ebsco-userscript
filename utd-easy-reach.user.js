// ==UserScript==
// @name         INFORMS / X-MOL -> EBSCO 一键搜索
// @name:zh-CN   UTD Easy Reach
// @name:zh      UTD Easy Reach
// @name:en      UTD Easy Reach
// @namespace    https://pubsonline.informs.org/
// @version      0.7.1
// @description  Redirect SAGE DOI pages to CNP eReading, and add an EBSCO search button to supported INFORMS and X-MOL article pages.
// @description:zh-CN 将 SAGE DOI 页面即时跳转到中图易阅，并在 INFORMS 与符合条件的 X-MOL 论文页添加 EBSCO 搜索按钮。
// @description:zh 将 SAGE DOI 页面即时跳转到中图易阅，并在 INFORMS 与符合条件的 X-MOL 论文页添加 EBSCO 搜索按钮。
// @description:en Redirect SAGE DOI pages to CNP eReading, and add an EBSCO search button to supported INFORMS and X-MOL article pages.
// @author       Ruan-sz
// @license      MIT
// @homepageURL  https://github.com/Ruan-sz/xmol-informs-ebsco-userscript
// @supportURL   https://github.com/Ruan-sz/xmol-informs-ebsco-userscript/issues
// @updateURL    https://raw.githubusercontent.com/Ruan-sz/xmol-informs-ebsco-userscript/main/utd-easy-reach.user.js
// @downloadURL  https://raw.githubusercontent.com/Ruan-sz/xmol-informs-ebsco-userscript/main/utd-easy-reach.user.js
// @match        https://journals.sagepub.com/doi/abs/*
// @match        *://pubsonline.informs.org/*
// @match        *://research.ebsco.com/*
// @match        *://www.x-mol.com/paper/*
// @match        *://x-mol.com/paper/*
// @run-at       document-start
// @noframes
// @grant        GM_openInTab
// @grant        GM_setClipboard
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// ==/UserScript==

(function () {
  'use strict';

  const SCRIPT_VERSION = '0.7.1';
  const BUTTON_ID = 'codex-ebsco-search-button';
  const CONTAINER_ID = 'codex-ebsco-search-container';
  const PENDING_SEARCH_KEY = 'codex-ebsco-pending-search';
  const PENDING_SEARCH_TTL_MS = 45 * 60 * 1000;
  const SOURCE_WATCH_TIMEOUT_MS = 2 * 60 * 1000;

  const CONFIG = {
    ebscoBaseUrl: 'https://research.ebsco.com/c/5fvlii/search/results',
    db: 'a9h,bth,puh,eric,cmedm,nfh,bwh,lxh,8gh,trh,hev,nlebk,e63sww',
    expanders: 'concept',
    limiters: 'FT:Y',
    searchMode: 'boolean',
    searchSegment: 'all-results',
    autocorrect: 'y',
    skipResultsFetch: 'true',
    useExactPhrase: false,
  };

  const INFORMS_JOURNALS = new Set([
    'Decision Analysis',
    'Information Systems Research',
    'INFORMS Journal on Applied Analytics',
    'INFORMS Journal on Computing',
    'INFORMS Journal on Data Science',
    'INFORMS Journal on Optimization',
    'INFORMS Transactions on Education',
    'Management Science',
    'Manufacturing & Service Operations Management',
    'Marketing Science',
    'Mathematics of Operations Research',
    'Operations Research',
    'Organization Science',
    'Service Science',
    'Stochastic Systems',
    'Strategy Science',
    'Transportation Science',
  ].map((name) => normalizeJournalName(name)));

  function normalizeText(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  function normalizeJournalName(text) {
    return normalizeText(text).toLowerCase();
  }

  function log(...args) {
    console.log(`[UTD Easy Reach ${SCRIPT_VERSION}]`, ...args);
  }

  function isHost(hostname) {
    return location.hostname.toLowerCase() === hostname;
  }

  function isInformsHost() {
    return isHost('pubsonline.informs.org');
  }

  function isEbscoHost() {
    return isHost('research.ebsco.com');
  }

  function isXmolHost() {
    return isHost('x-mol.com') || isHost('www.x-mol.com');
  }

  function getSageMirrorUrl() {
    if (!isHost('journals.sagepub.com')) {
      return '';
    }

    const prefix = '/doi/abs/';
    if (!location.pathname.toLowerCase().startsWith(prefix)) {
      return '';
    }

    const doiPath = location.pathname.slice(prefix.length).replace(/^\/+/, '');
    if (!doiPath) {
      return '';
    }

    return `https://sage.cnpereading.com/doi/${doiPath}`;
  }

  // Run this before touching the DOM so SAGE pages do not wait for rendering.
  const sageMirrorUrl = getSageMirrorUrl();
  if (sageMirrorUrl) {
    location.replace(sageMirrorUrl);
    return;
  }

  function getMetaContent(selector) {
    const node = document.querySelector(selector);
    return normalizeText(node?.content || '');
  }

  function getXmolJournalName() {
    const metaJournal =
      getMetaContent('meta[name="citation_journal_title"]') ||
      getMetaContent('meta[name="dc.Source"]');
    if (metaJournal) {
      return metaJournal;
    }

    const selectors = [
      'div[class*="PaperInfo-module"][class*="__meta"] a[class*="__journal"]',
      'a[class*="PaperInfo-module"][class*="__journal"]',
      'a[href*="/paper/journal/"]',
    ];

    for (const selector of selectors) {
      const text = normalizeText(document.querySelector(selector)?.textContent || '');
      if (text) {
        return text;
      }
    }

    const description = getMetaContent('meta[name="description"]');
    if (description.includes(',')) {
      return normalizeText(description.split(',')[0]);
    }

    return '';
  }

  function isSupportedXmolInformsPaper() {
    if (!isXmolHost() || !/\/paper\//i.test(location.pathname)) {
      return false;
    }

    const journalName = getXmolJournalName();
    return Boolean(journalName && INFORMS_JOURNALS.has(normalizeJournalName(journalName)));
  }

  function isLikelyInformsArticle() {
    if (!isInformsHost()) {
      return false;
    }

    if (/\/doi\//i.test(location.pathname)) {
      return true;
    }

    return Boolean(
      document.querySelector('meta[name="citation_title"], h1.citation__title, .hlFld-Abstract')
    );
  }

  function isPotentialSourcePage() {
    return (
      (isInformsHost() && /\/doi\//i.test(location.pathname)) ||
      (isXmolHost() && /\/paper\//i.test(location.pathname))
    );
  }

  function getSourceType() {
    if (isLikelyInformsArticle()) {
      return 'informs';
    }

    if (isSupportedXmolInformsPaper()) {
      return 'xmol';
    }

    return null;
  }

  function findInformsTitleNode() {
    const selectors = [
      'h1.citation__title',
      'h1[property="name"]',
      'main h1',
      'article h1',
      'h1',
    ];

    for (const selector of selectors) {
      const node = document.querySelector(selector);
      if (normalizeText(node?.textContent || '')) {
        return node;
      }
    }

    return null;
  }

  function getTitleFromInforms() {
    const metaTitle =
      getMetaContent('meta[name="citation_title"]') ||
      getMetaContent('meta[name="dc.Title"]') ||
      getMetaContent('meta[property="og:title"]');

    return metaTitle || normalizeText(findInformsTitleNode()?.textContent || '');
  }

  function findXmolTitleNode() {
    const selectors = [
      'h1[class*="PaperInfo-module"][class*="__title"] a',
      'h1[class*="PaperInfo-module"][class*="__title"]',
      'h1',
    ];

    for (const selector of selectors) {
      const node = document.querySelector(selector);
      if (normalizeText(node?.textContent || '')) {
        return node;
      }
    }

    return null;
  }

  function getTitleFromXmol() {
    const visibleTitle = normalizeText(findXmolTitleNode()?.textContent || '');
    if (visibleTitle) {
      return visibleTitle;
    }

    const ogTitle = getMetaContent('meta[property="og:title"]');
    if (ogTitle) {
      return ogTitle;
    }

    const fallbackTitle = normalizeText(document.title);
    if (!fallbackTitle) {
      return '';
    }

    for (const splitter of [' - X-MOL', ' | X-MOL', ' - ']) {
      if (fallbackTitle.includes(splitter)) {
        return normalizeText(fallbackTitle.split(splitter)[0]);
      }
    }

    return fallbackTitle;
  }

  function getArticleTitle() {
    const sourceType = getSourceType();
    if (sourceType === 'informs') {
      return getTitleFromInforms();
    }

    if (sourceType === 'xmol') {
      return getTitleFromXmol();
    }

    return '';
  }

  function createSearchId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function buildSearchUrl(title) {
    const query = CONFIG.useExactPhrase ? `"${title}"` : title;
    const url = new URL(CONFIG.ebscoBaseUrl);

    url.searchParams.set('q', query);
    url.searchParams.set('autocorrect', CONFIG.autocorrect);
    url.searchParams.set('db', CONFIG.db);
    url.searchParams.set('expanders', CONFIG.expanders);
    url.searchParams.set('limiters', CONFIG.limiters);
    url.searchParams.set('searchMode', CONFIG.searchMode);
    url.searchParams.set('searchSegment', CONFIG.searchSegment);
    url.searchParams.set('skipResultsFetch', CONFIG.skipResultsFetch);
    url.searchParams.set('sqId', `sq:${createSearchId()}`);

    return url.toString();
  }

  function setPendingSearch(payload) {
    if (typeof GM_setValue !== 'function') {
      return;
    }

    GM_setValue(
      PENDING_SEARCH_KEY,
      JSON.stringify({
        ...payload,
        savedAt: Date.now(),
      })
    );
  }

  function clearPendingSearch() {
    if (typeof GM_deleteValue === 'function') {
      GM_deleteValue(PENDING_SEARCH_KEY);
    }
  }

  function getPendingSearch() {
    if (typeof GM_getValue !== 'function') {
      return null;
    }

    const raw = GM_getValue(PENDING_SEARCH_KEY, '');
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw);
      if (!parsed?.url || !parsed?.savedAt) {
        return null;
      }

      if (Date.now() - parsed.savedAt > PENDING_SEARCH_TTL_MS) {
        clearPendingSearch();
        return null;
      }

      return parsed;
    } catch (error) {
      log('读取待续跳搜索失败', error);
      clearPendingSearch();
      return null;
    }
  }

  function isEbscoLoginLikePage() {
    const url = location.href.toLowerCase();
    if (/(login|signin|sign-in|authenticate|auth)/.test(url)) {
      return true;
    }

    if (document.querySelector('input[type="password"], form[action*="login"], form[action*="signin"]')) {
      return true;
    }

    const pageText = normalizeText(document.body?.innerText?.slice(0, 1200) || '').toLowerCase();
    return pageText.includes('sign in') || pageText.includes('log in');
  }

  function isResolvedEbscoSearch(pending) {
    try {
      const currentUrl = new URL(location.href);
      const targetUrl = new URL(pending.url);

      return (
        currentUrl.origin === targetUrl.origin &&
        currentUrl.pathname === targetUrl.pathname &&
        currentUrl.searchParams.get('q') === targetUrl.searchParams.get('q') &&
        !isEbscoLoginLikePage()
      );
    } catch (error) {
      log('比较 EBSCO 链接失败', error);
      return false;
    }
  }

  function maybeContinuePendingSearch() {
    if (!isEbscoHost()) {
      return;
    }

    const pending = getPendingSearch();
    if (!pending) {
      return;
    }

    if (isResolvedEbscoSearch(pending)) {
      log('已到达目标 EBSCO 搜索页，清除待续跳记录');
      clearPendingSearch();
      return;
    }

    if (isEbscoLoginLikePage()) {
      log('当前在 EBSCO 登录页，等待登录完成后再续跳');
      return;
    }

    log('检测到待续跳搜索，自动前往目标 EBSCO 搜索页');
    location.replace(pending.url);
  }

  function flashButton(message, isError = false) {
    const button = document.getElementById(BUTTON_ID);
    if (!button) {
      return;
    }

    const originalText = button.dataset.originalText || button.textContent;
    const originalBackground = button.dataset.originalBackground || button.style.background;
    button.textContent = message;
    button.style.background = isError ? '#9f1d2e' : '#0f5bd8';
    button.style.color = '#ffffff';

    window.setTimeout(() => {
      button.textContent = originalText;
      button.style.background = originalBackground;
      button.style.color = button.dataset.originalColor || '#ffffff';
    }, 1800);
  }

  async function copyToClipboard(text) {
    try {
      if (typeof GM_setClipboard === 'function') {
        GM_setClipboard(text, 'text');
        return true;
      }
    } catch (error) {
      log('GM_setClipboard 失败，尝试 navigator.clipboard', error);
    }

    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      log('navigator.clipboard 失败，尝试 execCommand', error);
    }

    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', 'readonly');
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const copied = document.execCommand('copy');
      textarea.remove();
      if (!copied) {
        throw new Error('execCommand copy returned false');
      }
      return true;
    } catch (error) {
      log('execCommand 复制失败', error);
      return false;
    }
  }

  function openUrl(url) {
    if (typeof GM_openInTab === 'function') {
      GM_openInTab(url, { active: true, insert: true, setParent: true });
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function handleClick() {
    const title = getArticleTitle();
    if (!title) {
      flashButton('未找到标题', true);
      return;
    }

    const searchUrl = buildSearchUrl(title);
    setPendingSearch({
      title,
      url: searchUrl,
      source: getSourceType(),
    });

    const copied = await copyToClipboard(title);
    openUrl(searchUrl);
    flashButton(copied ? '已打开' : '已跳转');
  }

  function addHoverStyle(button, normal, hover) {
    button.addEventListener('mouseenter', () => Object.assign(button.style, hover));
    button.addEventListener('mouseleave', () => Object.assign(button.style, normal));
  }

  function createInformsButton() {
    const button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.textContent = 'EBSCO 搜索';
    button.dataset.originalText = button.textContent;
    button.dataset.originalBackground = '#0a57cc';
    button.dataset.originalColor = '#ffffff';
    button.title = `复制当前论文标题，并在 EBSCO 中搜索（脚本 ${SCRIPT_VERSION}）`;
    button.addEventListener('click', handleClick);

    const normalStyle = {
      transform: 'translateY(0)',
      boxShadow: '0 6px 16px rgba(10, 87, 204, 0.24)',
      background: '#0a57cc',
    };
    const hoverStyle = {
      transform: 'translateY(-1px)',
      boxShadow: '0 10px 22px rgba(10, 87, 204, 0.28)',
      background: '#084db6',
    };

    Object.assign(button.style, {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 'auto',
      minWidth: '142px',
      minHeight: '44px',
      padding: '12px 16px',
      border: 'none',
      borderRadius: '6px',
      color: '#ffffff',
      fontSize: '15px',
      fontWeight: '700',
      cursor: 'pointer',
      lineHeight: '1.2',
      letterSpacing: '0.01em',
      transition: 'transform 160ms ease, box-shadow 160ms ease, background 160ms ease',
      ...normalStyle,
    });

    addHoverStyle(button, normalStyle, hoverStyle);
    return button;
  }

  function createXmolButton() {
    const button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.textContent = 'EBSCO 搜索';
    button.dataset.originalText = button.textContent;
    button.dataset.originalBackground = '#ffffff';
    button.dataset.originalColor = 'rgb(39, 158, 242)';
    button.title = `复制当前论文标题，并在 EBSCO 中搜索（脚本 ${SCRIPT_VERSION}）`;
    button.addEventListener('click', handleClick);

    const normalStyle = {
      background: '#ffffff',
      color: 'rgb(39, 158, 242)',
      borderColor: 'rgb(39, 158, 242)',
    };
    const hoverStyle = {
      background: 'rgb(39, 158, 242)',
      color: '#ffffff',
      borderColor: 'rgb(39, 158, 242)',
    };

    Object.assign(button.style, {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      height: '32px',
      padding: '0 14px',
      border: '1px solid rgb(39, 158, 242)',
      borderRadius: '3px',
      fontSize: '13px',
      fontWeight: '500',
      cursor: 'pointer',
      lineHeight: '1',
      transition: 'all 0.2s ease',
      whiteSpace: 'nowrap',
      ...normalStyle,
    });

    addHoverStyle(button, normalStyle, hoverStyle);
    return button;
  }

  function createContainerForSource(sourceType) {
    const container = document.createElement('div');
    container.id = CONTAINER_ID;
    container.dataset.sourceType = sourceType;
    container.style.boxSizing = 'border-box';
    container.appendChild(sourceType === 'xmol' ? createXmolButton() : createInformsButton());
    return container;
  }

  function applyPlacementStyle(container, sourceType, target) {
    const button = container.querySelector(`#${BUTTON_ID}`);
    if (!button) {
      return;
    }

    if (sourceType === 'xmol') {
      Object.assign(container.style, {
        display: 'inline-flex',
        alignItems: 'center',
        width: 'auto',
        margin: target.isFallback ? '8px 8px 8px 0' : '0 8px 0 0',
      });
      return;
    }

    const inSidebar = target.placement === 'sidebar';
    Object.assign(container.style, {
      display: inSidebar ? 'block' : 'inline-block',
      width: inSidebar ? '100%' : 'auto',
      margin: inSidebar ? '14px 0 18px' : '10px 0 16px',
    });
    button.style.width = inSidebar ? '100%' : 'auto';
  }

  function findInformsInsertionTarget() {
    const sidebarSection =
      document.querySelector('.article-coolBar__section.article-coolBar--sections') ||
      document.querySelector('#sectionMenu')?.closest('.article-coolBar__section') ||
      document.querySelector('.stickybar.article-coolBar .article-coolBar__section');

    if (sidebarSection?.parentElement) {
      return {
        parent: sidebarSection.parentElement,
        before: sidebarSection,
        rank: 40,
        placement: 'sidebar',
      };
    }

    const abstractBlock =
      document.querySelector('.hlFld-Abstract') ||
      document.querySelector('.article__body .sectionInfo')?.parentElement ||
      document.querySelector('.article__body');

    if (abstractBlock?.parentElement) {
      return {
        parent: abstractBlock.parentElement,
        before: abstractBlock,
        rank: 30,
        placement: 'content',
      };
    }

    const citationBlock = document.querySelector('.citation');
    if (citationBlock?.parentElement) {
      return {
        parent: citationBlock.parentElement,
        before: citationBlock.nextSibling,
        rank: 20,
        placement: 'content',
      };
    }

    const titleNode = findInformsTitleNode();
    if (titleNode?.parentElement) {
      return {
        parent: titleNode.parentElement,
        before: titleNode.nextSibling,
        rank: 10,
        placement: 'content',
        isFallback: true,
      };
    }

    return null;
  }

  function findXmolInsertionTarget() {
    const favoriteGroup = document.querySelector('div[class*="PaperFavoriteButton-module"][class*="__buttonGroup"]');
    if (favoriteGroup?.parentElement) {
      return {
        parent: favoriteGroup.parentElement,
        before: favoriteGroup,
        rank: 40,
        placement: 'actions',
      };
    }

    const actionButtons = document.querySelector('div[class*="page-module"][class*="__actionButtons"]');
    if (actionButtons) {
      return {
        parent: actionButtons,
        before: null,
        rank: 30,
        placement: 'actions',
      };
    }

    const actionLinks = document.querySelector('div[class*="page-module"][class*="__actionLinks"]');
    if (actionLinks?.parentElement) {
      return {
        parent: actionLinks.parentElement,
        before: actionLinks,
        rank: 20,
        placement: 'actions',
      };
    }

    const titleNode = findXmolTitleNode();
    if (titleNode?.parentElement) {
      return {
        parent: titleNode.parentElement,
        before: titleNode.nextSibling,
        rank: 10,
        placement: 'title',
        isFallback: true,
      };
    }

    return null;
  }

  function findInsertionTarget(sourceType) {
    return sourceType === 'xmol' ? findXmolInsertionTarget() : findInformsInsertionTarget();
  }

  function mountOrMoveButton() {
    const sourceType = getSourceType();
    if (!sourceType || !getArticleTitle()) {
      return false;
    }

    const target = findInsertionTarget(sourceType);
    if (!target?.parent?.isConnected) {
      return false;
    }

    let container = document.getElementById(CONTAINER_ID);
    if (!container) {
      container = createContainerForSource(sourceType);
    }

    const currentRank = Number(container.dataset.mountRank || 0);
    const shouldMove =
      !container.isConnected ||
      target.rank > currentRank ||
      (target.rank === currentRank && container.parentElement !== target.parent);

    if (shouldMove) {
      target.parent.insertBefore(container, target.before || null);
      container.dataset.mountRank = String(target.rank);
      applyPlacementStyle(container, sourceType, target);
      log(target.isFallback ? '标题已出现，提前显示按钮' : '按钮已放到首选位置');
    }

    return container.isConnected;
  }

  function startSourceWatcher() {
    let scheduled = false;
    let stopped = false;

    const tryMount = () => {
      scheduled = false;
      if (!stopped && isPotentialSourcePage()) {
        mountOrMoveButton();
      }
    };

    const scheduleMount = () => {
      if (scheduled || stopped) {
        return;
      }

      scheduled = true;
      window.requestAnimationFrame(tryMount);
    };

    const observer = new MutationObserver(scheduleMount);
    observer.observe(document, { childList: true, subtree: true });

    const intervalId = window.setInterval(tryMount, 500);
    const stop = () => {
      if (stopped) {
        return;
      }

      tryMount();
      stopped = true;
      observer.disconnect();
      window.clearInterval(intervalId);
    };

    tryMount();
    window.setTimeout(stop, SOURCE_WATCH_TIMEOUT_MS);
    window.addEventListener(
      'load',
      () => {
        tryMount();
        window.setTimeout(stop, 15000);
      },
      { once: true }
    );
  }

  function initEbscoPage() {
    if (!isEbscoHost()) {
      return;
    }

    maybeContinuePendingSearch();
    window.setTimeout(maybeContinuePendingSearch, 1500);
    window.setTimeout(maybeContinuePendingSearch, 4000);
  }

  if (isPotentialSourcePage()) {
    log('从 document-start 开始观察论文页结构', location.href);
    startSourceWatcher();
  } else if (isEbscoHost()) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initEbscoPage, { once: true });
    } else {
      initEbscoPage();
    }
  }
})();
