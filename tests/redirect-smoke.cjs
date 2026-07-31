const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const userscript = fs.readFileSync(
  path.join(__dirname, '..', 'utd-easy-reach.user.js'),
  'utf8'
);

function getRedirects(sourceUrl) {
  const parsedUrl = new URL(sourceUrl);
  const redirects = [];

  vm.runInNewContext(userscript, {
    console: { log() {} },
    location: {
      href: parsedUrl.href,
      hostname: parsedUrl.hostname,
      pathname: parsedUrl.pathname,
      replace(targetUrl) {
        redirects.push(targetUrl);
      },
    },
  });

  return redirects;
}

const target = 'https://sage.cnpereading.com/doi/10.1111/poms.12519';
const redirectCases = [
  'https://journals.sagepub.com/doi/10.1111/poms.12519',
  'https://journals.sagepub.com/doi/abs/10.1111/poms.12519',
  'https://journals.sagepub.com/doi/full/10.1111/poms.12519',
  'https://journals.sagepub.com/doi/pdf/10.1111/poms.12519',
  'https://journals.sagepub.com/doi/epdf/10.1111/poms.12519',
  'https://onlinelibrary.wiley.com/doi/10.1111/poms.12519',
  'https://onlinelibrary.wiley.com/doi/abs/10.1111/poms.12519',
];

for (const sourceUrl of redirectCases) {
  assert.deepEqual(getRedirects(sourceUrl), [target], sourceUrl);
}

assert.deepEqual(
  getRedirects('https://onlinelibrary.wiley.com/doi/abs/10.1111/joor.12345'),
  [],
  'Non-POMS Wiley articles must not be redirected'
);

console.log(`redirect smoke tests passed (${redirectCases.length + 1} cases)`);
