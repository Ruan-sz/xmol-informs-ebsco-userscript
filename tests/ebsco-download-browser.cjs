const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const userscript = fs.readFileSync(path.join(__dirname, '..', 'utd-easy-reach.user.js'), 'utf8');
const originalFilename = 'EBSCO-FullText-10_20_2026.pdf';
const title = 'Black-Box Attack-Based Security Evaluation Framework for Credit Card Fraud Detection Models.';
const expected = title.replace(/\.$/, '') + '.pdf';
const pdfBytes = '%PDF-1.4\n% Filename regression test\n%%EOF\n';

// These selectors and modal fields are from the supplied EBSCO viewer snapshot.
const fixture = `<!doctype html><html><head><title>EBSCO</title>
  <meta name="citation_title" content="">
  <meta name="citation_author" content="">
  <meta name="citation_author" content="Other, Author">
  <meta name="citation_publication_date" content="">
  <meta name="citation_journal_title" content="">
  <meta name="citation_doi" content="">
  </head><body><div class="nuc-bulk-download-modal" role="dialog">
  <h3 data-auto="modal-header-metadata-title"></h3>
  <div class="nuc-modal-header-with-metadata__meta-data-contributors">
    <span class="delimited-list__item"><span dir="auto"></span></span>
  </div>
  <p class="nuc-modal-header-with-metadata__meta-data-publication-year"></p>
  <div data-auto="fulltext-tab" aria-selected="true"></div>
  <input name="fullText" type="radio" value="pdf" checked>
  <button data-auto="bulk-download-modal-download-button">Download</button>
  </div><script>
    document.addEventListener('click', (event) => {
      if (!event.target.closest('[data-auto="bulk-download-modal-download-button"]')) return;
      const settings = window.testSettings;
      if (settings.closeModal) document.querySelector('[role="dialog"]').remove();
      if (settings.nextPath) history.pushState({}, '', settings.nextPath);
      setTimeout(() => {
        const anchor = document.createElement('a');
        anchor.href = URL.createObjectURL(new Blob([settings.bytes], { type: 'application/pdf' }));
        if (settings.mode === 'attribute' || settings.mode === 'dispatch') {
          anchor.setAttribute('download', settings.filename);
        } else if (settings.mode === 'markup') {
          const template = document.createElement('template');
          template.innerHTML = '<a download="' + settings.filename + '"></a>';
          anchor.setAttributeNode(template.content.firstChild.attributes.getNamedItem('download').cloneNode());
        } else {
          anchor.download = settings.filename;
        }
        if (settings.mode === 'dispatch') anchor.dispatchEvent(new MouseEvent('click'));
        else anchor.click();
      }, 0);
    });
  </script></body></html>`;

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  let count = 0;
  try {
    const context = await browser.newContext({ acceptDownloads: true });
    await context.addInitScript({ content: userscript });
    await context.route('**/*', (route) => route.fulfill({ contentType: 'text/html', body: fixture }));
    const page = await context.newPage();

    async function check(label, settings, expectedFilename) {
      const source = settings.source || 'https://research.ebsco.com/c/test/viewer/pdf/record-one';
      await page.goto(source);
      await page.evaluate((config) => {
        document.querySelector('meta[name="citation_title"]').content = config.title || '';
        for (const [field, key] of [
          ['citation_author', 'author'], ['citation_publication_date', 'date'],
          ['citation_journal_title', 'journal'], ['citation_doi', 'doi'],
        ]) {
          document.querySelector('meta[name="' + field + '"]').content = config[key] || '';
        }
        document.title = config.pageTitle || 'EBSCO';
        document.querySelector('[data-auto="modal-header-metadata-title"]').textContent = config.modalTitle || '';
        document.querySelector('.delimited-list__item [dir="auto"]').textContent = config.modalAuthor || '';
        document.querySelector('[class*="__meta-data-publication-year"]').textContent = config.modalYear || '';
        window.testSettings = config;
      }, { filename: originalFilename, bytes: pdfBytes, title, ...settings });

      const downloadEvent = page.waitForEvent('download');
      await page.locator('[data-auto="bulk-download-modal-download-button"]').click();
      const download = await downloadEvent;
      assert.equal(download.suggestedFilename(), expectedFilename, label);
      const stream = await download.createReadStream();
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      assert.equal(Buffer.concat(chunks).toString('utf8'), pdfBytes, `${label}: PDF content changed`);
      await download.delete();
      count += 1;
      console.log(`PASS ${label}`);
    }

    await check('provided title, detached property assignment', {}, expected);
    await check('detached setAttribute', { mode: 'attribute' }, expected);
    await check('detached dispatchEvent', { mode: 'dispatch' }, expected);
    await check('markup-created attribute and programmatic click', { mode: 'markup' }, expected);
    await check('invalid Windows characters', { title: 'A: B/C\\D|E?F*G"H<I>.' }, 'A B C D E F G H I.pdf');
    await check('reserved Windows name', { title: 'CON' }, '_CON.pdf');
    await check('reserved Windows stem with extension', { title: 'LPT1.notes' }, '_LPT1.notes.pdf');
    await check('existing PDF extension', { title: 'A Paper.pdf' }, 'A Paper.pdf');
    await check('missing title preserves original name', { title: '' }, originalFilename);
    await check('HTML download unaffected', { filename: 'EBSCO-FullText-10_20_2026.html' }, 'EBSCO-FullText-10_20_2026.html');
    await check('archive unaffected', { filename: 'EBSCO-FullText-10_20_2026.zip' }, 'EBSCO-FullText-10_20_2026.zip');
    await check('audio unaffected', { filename: 'reading.mp3' }, 'reading.mp3');
    await check('custom PDF name unaffected', { filename: 'custom-name.pdf' }, 'custom-name.pdf');
    await check('metadata title preferred over browser title', { pageTitle: 'Wrong paper - EBSCO' }, expected);
    await check('browser title fallback', { title: '', pageTitle: 'Fallback Article. - EBSCO' }, 'Fallback Article.pdf');
    await check('download dialog title survives closing', {
      title: 'Stale Metadata', modalTitle: title, closeModal: true,
    }, expected);
    await check('results query is not an article title', {
      source: 'https://research.ebsco.com/c/test/search/results?q=research',
      title: '', pageTitle: 'My Query - EBSCO',
    }, originalFilename);
    await check('single-result dialog on results page', {
      source: 'https://research.ebsco.com/c/test/search/results?q=research',
      title: '', modalTitle: title, closeModal: true,
    }, expected);
    await check('pending title discarded after navigation', {
      modalTitle: title, closeModal: true, nextPath: '/c/test/search/results',
    }, originalFilename);
    await check('other websites unaffected', { source: 'https://example.com/article' }, originalFilename);
    await check('long Unicode title', { title: '\u8bba\u6587'.repeat(160) }, '\u8bba\u6587'.repeat(36) + '\u8bba.pdf');

    const citation = { author: 'Xiao, Jin', date: '20230901', journal: 'INFORMS Journal on Computing' };
    const citationExpected = 'Xiao2023ijoc. ' + expected;
    await check('provided EBSCO citation metadata', citation, citationExpected);
    await check('requested author-year-journal format', {
      author: 'Akkas, Arzum', date: '2019-04-01', journal: 'Management Science', title: 'Drivers of Retail Performance.',
    }, 'Akkas2019mnsc. Drivers of Retail Performance.pdf');
    await check('given-name-first author', { ...citation, author: 'Jin Xiao' }, citationExpected);
    await check('compound surname', { ...citation, author: 'Ludwig van der Waals' }, 'vanderWaals2023ijoc. ' + expected);
    await check('EBSCO journal publisher suffix', { ...citation, journal: 'Management Science (INFORMS)' }, 'Xiao2023mnsc. ' + expected);
    await check('journal ampersand variant', {
      ...citation, journal: 'Manufacturing and Service Operations Management',
    }, 'Xiao2023msom. ' + expected);
    await check('INFORMS DOI journal fallback', {
      ...citation, journal: '', doi: '10.1287/ijoc.2023.1297',
    }, citationExpected);
    await check('unknown journal omits code', { ...citation, journal: 'Another Journal' }, 'Xiao2023. ' + expected);
    await check('missing year omits year', { ...citation, date: '' }, 'Xiaoijoc. ' + expected);
    await check('missing author omits author', { ...citation, author: '' }, '2023ijoc. ' + expected);
    await check('citation snapshot survives modal closing', { ...citation, modalTitle: title, closeModal: true }, citationExpected);
    await check('results dialog author and year', {
      source: 'https://research.ebsco.com/c/test/search/results?q=research',
      title: '', modalTitle: title, modalAuthor: 'Xiao, Jin', modalYear: '2023', closeModal: true,
    }, 'Xiao2023. ' + expected);
    await check('different record modal ignores stale page metadata', {
      ...citation, title: 'Stale Metadata', modalTitle: title, modalAuthor: 'New, Author', modalYear: '2020', closeModal: true,
    }, 'New2020. ' + expected);

    const journalCodes = [
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
    ];
    for (const [journal, code] of journalCodes) {
      await check(`journal URL code: ${code}`, { ...citation, journal }, `Xiao2023${code}. ` + expected);
    }

    // One tab, two records: the second download must not reuse the first title.
    await page.goto('https://research.ebsco.com/c/test/viewer/pdf/record-one');
    for (const record of [
      { title: 'First Paper', author: 'First, Jane', date: '2019', journal: 'Management Science', code: 'mnsc' },
      { title: 'Second Paper', author: 'Second, Jane', date: '2020', journal: 'Operations Research', code: 'opre' },
    ]) {
      await page.evaluate((config) => {
        history.pushState({}, '', config.pathname);
        document.querySelector('meta[name="citation_title"]').content = config.title;
        document.querySelector('meta[name="citation_author"]').content = config.author;
        document.querySelector('meta[name="citation_publication_date"]').content = config.date;
        document.querySelector('meta[name="citation_journal_title"]').content = config.journal;
        window.testSettings = config;
      }, {
        ...record,
        pathname: `/c/test/viewer/pdf/${record.title === 'First Paper' ? 'one' : 'two'}`,
        filename: originalFilename, bytes: pdfBytes,
      });
      const downloadEvent = page.waitForEvent('download');
      await page.locator('button').click();
      const download = await downloadEvent;
      assert.equal(download.suggestedFilename(), `${record.author.split(',')[0]}${record.date}${record.code}. ${record.title}.pdf`);
      await download.delete();
    }
    count += 1;
    console.log('PASS same-tab article navigation');
    await context.close();
    console.log(`EBSCO browser download tests passed (${count} cases)`);
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
