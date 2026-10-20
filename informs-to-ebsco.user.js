// ==UserScript==
// @name         UTD Easy Reach
// @name:zh-CN   UTD Easy Reach
// @name:zh      UTD Easy Reach
// @name:en      UTD Easy Reach
// @namespace    https://pubsonline.informs.org/
// @version      0.10.0
// @description  Reach SAGE/Wiley POMS, search EBSCO from INFORMS/X-MOL, and name EBSCO PDFs with author, year, INFORMS journal code and title.
// @description:zh-CN 快速访问 SAGE/Wiley POMS，从 INFORMS/X-MOL 检索 EBSCO，并以作者、年份、期刊代码和标题命名 PDF。
// @description:zh 快速访问 SAGE/Wiley POMS，从 INFORMS/X-MOL 检索 EBSCO，并以作者、年份、期刊代码和标题命名 PDF。
// @description:en Reach SAGE/Wiley POMS, search EBSCO from INFORMS/X-MOL, and name EBSCO PDFs with author, year, INFORMS journal code and title.
// @author       Ruan-sz
// @license      MIT
// @homepageURL  https://github.com/Ruan-sz/xmol-informs-ebsco-userscript
// @supportURL   https://github.com/Ruan-sz/xmol-informs-ebsco-userscript/issues
// @updateURL    https://raw.githubusercontent.com/Ruan-sz/xmol-informs-ebsco-userscript/main/utd-easy-reach.user.js
// @downloadURL  https://raw.githubusercontent.com/Ruan-sz/xmol-informs-ebsco-userscript/main/utd-easy-reach.user.js
// @match        https://journals.sagepub.com/doi/*
// @match        https://onlinelibrary.wiley.com/doi/*
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
// @grant        unsafeWindow
// ==/UserScript==

(function () {
  'use strict';

  const SCRIPT_VERSION = '0.10.0';
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

  const INFORMS_JOURNALS = new Map([
    ['Decision Analysis', 'deca'],
    ['Information Systems Research', 'isre'],
    ['INFORMS Journal on Applied Analytics', 'ijaa'],
    ['INFORMS Journal on Computing', 'ijoc'],
    ['INFORMS Journal on Data Science', 'ijds'],
    ['INFORMS Journal on Optimization', 'ijoo'],
    ['INFORMS Transactions on Education', 'ited'],
    ['Management Science', 'mnsc'],
    ['Manufacturing & Service Operations Management', 'msom'],
    ['Marketing Science', 'mksc'],
    ['Mathematics of Operations Research', 'moor'],
    ['Operations Research', 'opre'],
    ['Organization Science', 'orsc'],
    ['Service Science', 'serv'],
    ['Stochastic Systems', 'stsy'],
    ['Strategy Science', 'stsc'],
    ['Transportation Science', 'trsc'],
  ].map(([name, code]) => [normalizeJournalName(name), code]));

  function normalizeText(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  function normalizeJournalName(text) {
    return normalizeText(text)
      .normalize('NFKC')
      .toLowerCase()
      .replace(/\s*\(informs\)\s*$/i, '')
      .replace(/\s+and\s+/g, ' & ')
      .replace(/\s*&\s*/g, ' & ');
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

  function extractDoiFromPath() {
    const match = location.pathname.match(
      /^\/doi\/(?:(?:abs|full|pdf|epdf)\/)?(10\.\d{4,9}\/.+)$/i
    );
    if (!match) {
      return '';
    }

    const encodedDoi = match[1].replace(/\/+$/, '');
    try {
      return decodeURIComponent(encodedDoi);
    } catch (error) {
      log('DOI 路径解码失败', error);
      return '';
    }
  }

  function getCnpEreadingUrl() {
    const isSageArticle = isHost('journals.sagepub.com');
    const isWileyArticle = isHost('onlinelibrary.wiley.com');
    if (!isSageArticle && !isWileyArticle) {
      return '';
    }

    const doi = extractDoiFromPath();
    if (!doi || (isWileyArticle && !/^10\.1111\/poms\./i.test(doi))) {
      return '';
    }

    return `https://sage.cnpereading.com/doi/${encodeURI(doi)}`;
  }

  // Run this before touching the DOM so publisher pages do not wait for rendering.
  const cnpEreadingUrl = getCnpEreadingUrl();
  if (cnpEreadingUrl) {
    location.replace(cnpEreadingUrl);
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

  function buildPdfFilename(title, citation = {}) {
    const paperTitle = normalizeText(title).replace(/\.pdf$/i, '').replace(/[. ]+$/g, '');
    if (!paperTitle) {
      return '';
    }

    const prefix = `${citation.author || ''}${citation.year || ''}${citation.journalCode || ''}`;
    let stem = (prefix ? `${prefix}. ${paperTitle}` : paperTitle)
      .normalize('NFC')
      .replace(/[<>:"/\\|?*\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[. ]+$/g, '');

    if (!stem) {
      return '';
    }

    // Windows reserves these stems even when they have an extension.
    if (/^(?:con|prn|aux|nul|com[1-9\u00b9\u00b2\u00b3]|lpt[1-9\u00b9\u00b2\u00b3])(?:\.|$)/i.test(stem)) {
      stem = `_${stem}`;
    }

    const encoder = new TextEncoder();
    let shortened = '';
    let byteLength = 0;
    for (const character of stem) {
      const bytes = encoder.encode(character).length;
      if (shortened.length + character.length > 180 || byteLength + bytes > 220) {
        break;
      }
      shortened += character;
      byteLength += bytes;
    }

    shortened = shortened.replace(/[. ]+$/g, '');
    return shortened ? `${shortened}.pdf` : '';
  }

  function getEbscoArticleTitle(modal) {
    const modalTitle = normalizeText(
      modal?.querySelector('[data-auto="modal-header-metadata-title"]')?.textContent || ''
    );
    if (modalTitle) {
      return modalTitle;
    }

    // A results page title may describe a query or several papers.
    if (!/\/(?:viewer\/(?:pdf|html)|search\/details)\/[^/]+/i.test(location.pathname)) {
      return '';
    }

    const title =
      getMetaContent('meta[name="citation_title"]') ||
      getMetaContent('meta[name="dc.Title"]') ||
      normalizeText(document.title).replace(/\s+[-|]\s+EBSCO(?:host)?(?: Research Databases)?\s*$/i, '');

    return /^EBSCO(?:host)?$/i.test(title) ? '' : title;
  }

  function getAuthorSurname(name) {
    const author = normalizeText(name);
    if (author.includes(',')) {
      return author.split(',')[0].replace(/\s+/g, '');
    }

    const parts = author.split(' ').filter(Boolean);
    if (parts.length > 1 && /^(?:jr\.?|sr\.?|ii|iii|iv)$/i.test(parts[parts.length - 1])) {
      parts.pop();
    }
    let start = parts.length - 1;
    while (start > 0 && /^(?:al|bin|da|das|de|del|della|den|der|di|dos|du|ibn|la|le|ten|ter|van|von)$/i.test(parts[start - 1])) {
      start -= 1;
    }
    return parts.slice(Math.max(0, start)).join('');
  }

  function getPublicationYear(value) {
    const date = normalizeText(value);
    return date.match(/^((?:19|20)\d{2})\d{4}$/)?.[1] ||
      date.match(/\b((?:19|20)\d{2})\b/)?.[1] || '';
  }

  function getEbscoArticleCitation(modal) {
    const title = getEbscoArticleTitle(modal);
    const modalTitle = normalizeText(
      modal?.querySelector('[data-auto="modal-header-metadata-title"]')?.textContent || ''
    );
    const metaTitle = getMetaContent('meta[name="citation_title"]') || getMetaContent('meta[name="dc.Title"]');
    const comparableTitle = (value) => normalizeText(value).replace(/[. ]+$/g, '').toLowerCase();
    const isSingleRecord = /\/(?:viewer\/(?:pdf|html)|search\/details)\/[^/]+/i.test(location.pathname);
    // A results-page dialog can belong to a different record than the page metadata.
    const usePageMetadata = isSingleRecord &&
      (!modalTitle || comparableTitle(modalTitle) === comparableTitle(metaTitle));

    const modalAuthor = normalizeText(
      modal?.querySelector('[class*="__meta-data-contributors"] .delimited-list__item [dir="auto"]')?.textContent || ''
    );
    const author = getAuthorSurname(
      (usePageMetadata ? getMetaContent('meta[name="citation_author"]') : '') || modalAuthor
    );
    const modalDate = normalizeText(
      modal?.querySelector('[class*="__meta-data-publication-year"]')?.textContent || ''
    );
    const dates = [modalDate];
    if (usePageMetadata) {
      dates.push(
        getMetaContent('meta[name="citation_publication_date"]'),
        getMetaContent('meta[name="citation_date"]'),
        getMetaContent('meta[name="dc.Date"]')
      );
    }
    const year = dates.map(getPublicationYear).find(Boolean) || '';

    const journal = usePageMetadata ? getMetaContent('meta[name="citation_journal_title"]') : '';
    const doi = usePageMetadata ? getMetaContent('meta[name="citation_doi"]') : '';
    const doiCode = doi.match(/^(?:https?:\/\/(?:dx\.)?doi\.org\/)?10\.1287\/([a-z]+)[./-]/i)?.[1]?.toLowerCase();
    const journalCode = INFORMS_JOURNALS.get(normalizeJournalName(journal)) ||
      ([...INFORMS_JOURNALS.values()].includes(doiCode) ? doiCode : '');

    return { title, author, year, journalCode };
  }

  function installEbscoPdfRenamer() {
    const pageWindow = typeof unsafeWindow === 'undefined' ? window : unsafeWindow;
    const prototype = pageWindow.HTMLAnchorElement?.prototype;
    if (!prototype) {
      return;
    }

    const marker = pageWindow.Symbol.for('utd-easy-reach.ebsco-pdf-renamer');
    if (prototype[marker]) {
      return;
    }

    const nativeDownload = Object.getOwnPropertyDescriptor(prototype, 'download');
    const nativeSetAttribute = prototype.setAttribute;
    const nativeClick = prototype.click;
    let pendingDownload = null;

    const getPageKey = () => `${location.origin}${location.pathname}`;
    const getFilename = (requestedName) => {
      if (!/^EBSCO[-_ ]FullText(?:[-_ ].*)?\.pdf$/i.test(String(requestedName))) {
        return requestedName;
      }

      try {
        const modal = document.querySelector('.nuc-bulk-download-modal[role="dialog"]');
        const pendingCitation =
          pendingDownload?.pageKey === getPageKey() &&
          Date.now() - pendingDownload.savedAt < 60000
            ? pendingDownload.citation
            : null;
        const citation = pendingCitation || getEbscoArticleCitation(modal);
        const filename = buildPdfFilename(citation.title, citation);
        if (filename) {
          pendingDownload = null;
          return filename;
        }
      } catch (error) {
        log('无法按论文标题命名，保留 EBSCO 原文件名', error);
      }

      return requestedName;
    };

    const exportCallback = (callback) =>
      typeof exportFunction === 'function' ? exportFunction(callback, pageWindow) : callback;

    try {
      if (nativeDownload?.set) {
        Object.defineProperty(prototype, 'download', {
          ...nativeDownload,
          set: exportCallback(function (name) {
            return nativeDownload.set.call(this, getFilename(name));
          }),
        });
      }

      // EBSCO may prepare a detached anchor and click it before it reaches the DOM.
      Object.defineProperty(prototype, 'setAttribute', {
        configurable: true,
        writable: true,
        value: exportCallback(function (name, value) {
          const nextValue = String(name).toLowerCase() === 'download' ? getFilename(value) : value;
          return nativeSetAttribute.call(this, name, nextValue);
        }),
      });
      Object.defineProperty(prototype, 'click', {
        configurable: true,
        writable: true,
        value: exportCallback(function (...args) {
          const name = this.getAttribute('download');
          if (name) {
            nativeSetAttribute.call(this, 'download', getFilename(name));
          }
          return nativeClick.apply(this, args);
        }),
      });
      Object.defineProperty(prototype, marker, { value: true });
    } catch (error) {
      log('安装 EBSCO PDF 命名处理失败', error);
    }

    document.addEventListener('click', (event) => {
      const target = event.target?.closest?.('button, a');
      if (target?.matches('[data-auto="bulk-download-modal-download-button"]')) {
        pendingDownload = null;
        const modal = target.closest('[role="dialog"]');
        const fullTextTab = modal?.querySelector('[data-auto="fulltext-tab"][aria-selected="true"]');
        const selectedPdf = modal?.querySelector('input[name="fullText"][value="pdf"]:checked');
        const citation = fullTextTab && selectedPdf ? getEbscoArticleCitation(modal) : null;
        if (citation?.title) {
          pendingDownload = { citation, pageKey: getPageKey(), savedAt: Date.now() };
        }
      }

      if (target?.matches('a[download]')) {
        const name = target.getAttribute('download');
        nativeSetAttribute.call(target, 'download', getFilename(name));
      }
    }, true);
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
    installEbscoPdfRenamer();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initEbscoPage, { once: true });
    } else {
      initEbscoPage();
    }
  }
})();
