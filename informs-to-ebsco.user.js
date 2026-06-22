// ==UserScript==
// @name         INFORMS / X-MOL -> EBSCO 一键搜索
// @namespace    https://pubsonline.informs.org/
// @version      0.6.0
// @description  在 INFORMS 和指定 INFORMS 期刊的 X-MOL 论文页添加 EBSCO 搜索按钮，并在 EBSCO 登录后自动继续跳转到搜索页。
// @author       Codex
// @license      MIT
// @match        *://pubsonline.informs.org/*
// @match        *://research.ebsco.com/*
// @match        *://www.x-mol.com/paper/*
// @match        *://x-mol.com/paper/*
// @run-at       document-end
// @grant        GM_openInTab
// @grant        GM_setClipboard
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// ==/UserScript==

(function () {
  'use strict';

  const SCRIPT_VERSION = '0.6.0';
  const BUTTON_ID = 'codex-ebsco-search-button';
  const CONTAINER_ID = 'codex-ebsco-search-container';
  const PENDING_SEARCH_KEY = 'codex-ebsco-pending-search';
  const PENDING_SEARCH_TTL_MS = 45 * 60 * 1000;

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
    console.log(`[INFORMS/X-MOL->EBSCO ${SCRIPT_VERSION}]`, ...args);
  }

  function getMetaContent(selector) {
    const node = document.querySelector(selector);
    return normalizeText(node?.content || '');
  }

  function isInformsHost() {
    return /(^|\.)pubsonline\.informs\.org$/i.test(location.hostname);
  }

  function isEbscoHost() {
    return /(^|\.)research\.ebsco\.com$/i.test(location.hostname);
  }

  function isXmolHost() {
    return /(^|\.)x-mol\.com$/i.test(location.hostname);
  }

  function getXmolJournalName() {
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
    if (!journalName) {
      return false;
    }

    return INFORMS_JOURNALS.has(normalizeJournalName(journalName));
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

  function getSourceType() {
    if (isLikelyInformsArticle()) {
      return 'informs';
    }

    if (isSupportedXmolInformsPaper()) {
      return 'xmol';
    }

    return null;
  }

  function getTitleFromInforms() {
    const metaTitle =
      getMetaContent('meta[name="citation_title"]') ||
      getMetaContent('meta[name="dc.Title"]') ||
      getMetaContent('meta[property="og:title"]');

    if (metaTitle) {
      return metaTitle;
    }

    const selectors = [
      'h1.citation__title',
      'h1[property="name"]',
      'main h1',
      'article h1',
      'h1',
    ];

    for (const selector of selectors) {
      const text = normalizeText(document.querySelector(selector)?.textContent || '');
      if (text) {
        return text;
      }
    }

    return '';
  }

  function getTitleFromXmol() {
    const selectors = [
      'h1[class*="PaperInfo-module"][class*="__title"] a',
      'h1[class*="PaperInfo-module"][class*="__title"]',
      'h1',
    ];

    for (const selector of selectors) {
      const text = normalizeText(document.querySelector(selector)?.textContent || '');
      if (text) {
        return text;
      }
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
    url.searchParams.set('sqId', `sq:${crypto.randomUUID()}`);

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

  function clearPendingSearch() {
    if (typeof GM_deleteValue === 'function') {
      GM_deleteValue(PENDING_SEARCH_KEY);
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

    Object.assign(button.style, {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      minHeight: '44px',
      padding: '12px 16px',
      border: 'none',
      borderRadius: '6px',
      background: '#0a57cc',
      color: '#ffffff',
      fontSize: '15px',
      fontWeight: '700',
      cursor: 'pointer',
      lineHeight: '1.2',
      letterSpacing: '0.01em',
      transition: 'transform 160ms ease, box-shadow 160ms ease, background 160ms ease',
      boxShadow: '0 6px 16px rgba(10, 87, 204, 0.24)',
    });

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-1px)';
      button.style.boxShadow = '0 10px 22px rgba(10, 87, 204, 0.28)';
      button.style.background = '#084db6';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 6px 16px rgba(10, 87, 204, 0.24)';
      button.style.background = '#0a57cc';
    });

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

    Object.assign(button.style, {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      height: '32px',
      padding: '0 14px',
      border: '1px solid rgb(39, 158, 242)',
      borderRadius: '3px',
      background: '#ffffff',
      color: 'rgb(39, 158, 242)',
      fontSize: '13px',
      fontWeight: '500',
      cursor: 'pointer',
      lineHeight: '1',
      transition: 'all 0.2s ease',
      whiteSpace: 'nowrap',
    });

    button.addEventListener('mouseenter', () => {
      button.style.background = 'rgb(39, 158, 242)';
      button.style.color = '#ffffff';
      button.style.borderColor = 'rgb(39, 158, 242)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.background = '#ffffff';
      button.style.color = 'rgb(39, 158, 242)';
      button.style.borderColor = 'rgb(39, 158, 242)';
    });

    return button;
  }

  function createContainerForSource(sourceType) {
    const container = document.createElement('div');
    container.id = CONTAINER_ID;

    if (sourceType === 'xmol') {
      Object.assign(container.style, {
        display: 'inline-flex',
        alignItems: 'center',
      });
      container.appendChild(createXmolButton());
      return container;
    }

    Object.assign(container.style, {
      width: '100%',
      margin: '14px 0 18px',
    });
    container.appendChild(createInformsButton());
    return container;
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
      };
    }

    const citationBlock = document.querySelector('.citation');
    if (citationBlock?.parentElement) {
      return {
        parent: citationBlock.parentElement,
        before: citationBlock.nextSibling,
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
      };
    }

    const actionButtons = document.querySelector('div[class*="page-module"][class*="__actionButtons"]');
    if (actionButtons) {
      return {
        parent: actionButtons,
        before: null,
      };
    }

    const actionLinks = document.querySelector('div[class*="page-module"][class*="__actionLinks"]');
    if (actionLinks?.parentElement) {
      return {
        parent: actionLinks.parentElement,
        before: actionLinks,
      };
    }

    return null;
  }

  function findInsertionTarget(sourceType) {
    if (sourceType === 'xmol') {
      return findXmolInsertionTarget();
    }

    return findInformsInsertionTarget();
  }

  function mountButton() {
    if (document.getElementById(CONTAINER_ID)) {
      return true;
    }

    const sourceType = getSourceType();
    if (!sourceType) {
      return false;
    }

    const target = findInsertionTarget(sourceType);
    if (!target) {
      return false;
    }

    target.parent.insertBefore(createContainerForSource(sourceType), target.before || null);
    return true;
  }

  function startSourceMountLoop() {
    const tryMount = () => {
      if (!getSourceType()) {
        return;
      }
      mountButton();
    };

    tryMount();

    const observer = new MutationObserver(() => {
      tryMount();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    const intervalId = window.setInterval(tryMount, 1200);

    window.setTimeout(() => {
      observer.disconnect();
      window.clearInterval(intervalId);
      tryMount();
    }, 30000);
  }

  function initSourcePage() {
    if (!document.body || !getSourceType()) {
      return;
    }

    log('开始挂载来源页按钮', location.href);
    startSourceMountLoop();
  }

  function initEbscoPage() {
    if (!document.body || !isEbscoHost()) {
      return;
    }

    maybeContinuePendingSearch();
    window.setTimeout(maybeContinuePendingSearch, 1500);
    window.setTimeout(maybeContinuePendingSearch, 4000);
  }

  function init() {
    if (getSourceType()) {
      initSourcePage();
      return;
    }

    if (isEbscoHost()) {
      initEbscoPage();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  window.addEventListener('load', init, { once: true });
})();
