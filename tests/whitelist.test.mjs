import assert from "node:assert/strict";

function normalizeUrlPattern(pattern) {
  return pattern.trim().replace(/\/+$/, "");
}

function patternMatchesValue(pattern, value) {
  if (pattern.includes("*")) {
    const escaped = pattern
      .split("*")
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join(".*");
    return new RegExp(`^${escaped}`).test(value);
  }

  return value === pattern || value.startsWith(`${pattern}/`) || value.startsWith(`${pattern}?`);
}

function isWhitelisted(url, patterns) {
  return patterns.some((pattern) => {
    const normalized = normalizeUrlPattern(pattern);
    if (!normalized) {
      return false;
    }

    if (/^[a-z][a-z\d+.-]*:\/\//i.test(normalized)) {
      return patternMatchesValue(normalized, url);
    }

    const pageUrl = new URL(url);
    const hostPath = `${pageUrl.hostname}${pageUrl.pathname}${pageUrl.search}${pageUrl.hash}`;
    const bareHostPath = hostPath.replace(/^www\./, "");

    return patternMatchesValue(normalized, hostPath) || patternMatchesValue(normalized, bareHostPath);
  });
}

const defaults = [
  "https://ankiuser.net/study",
  "https://www.openevidence.com/*",
  "uptodate.com/*",
  "nejm.org/*",
  "https://accessmedicine.mhmedical.com/*",
  "https://www.clinicalkey.com/*",
  "pubmed.ncbi.nlm.nih.gov/*",
  "pmc.ncbi.nlm.nih.gov/*",
  "ncbi.nlm.nih.gov/*",
  "cochranelibrary.com/*",
  "jamanetwork.com/*",
  "thelancet.com/*",
  "bmj.com/*",
  "file:///*"
];

assert.equal(isWhitelisted("https://ankiuser.net/study/deck/1", defaults), true);
assert.equal(isWhitelisted("https://www.openevidence.com/ask?query=mpn", defaults), true);
assert.equal(isWhitelisted("http://uptodate.com/contents/mpn", defaults), true);
assert.equal(isWhitelisted("https://www.uptodate.com/contents/mpn", defaults), true);
assert.equal(isWhitelisted("https://pubmed.ncbi.nlm.nih.gov/12345678/", defaults), true);
assert.equal(isWhitelisted("https://pmc.ncbi.nlm.nih.gov/articles/PMC123/", defaults), true);
assert.equal(isWhitelisted("https://www.ncbi.nlm.nih.gov/books/NBK1/", defaults), true);
assert.equal(isWhitelisted("https://www.cochranelibrary.com/cdsr/doi/10.1002/example", defaults), true);
assert.equal(isWhitelisted("https://jamanetwork.com/journals/jama/fullarticle/1", defaults), true);
assert.equal(isWhitelisted("https://www.thelancet.com/journals/lancet/article/x", defaults), true);
assert.equal(isWhitelisted("https://www.bmj.com/content/1/bmj.x", defaults), true);
assert.equal(isWhitelisted("https://notbmj.com/content/1", defaults), false);
assert.equal(isWhitelisted("https://nejm.org/doi/full/10.1056/example", defaults), true);
assert.equal(isWhitelisted("https://www.nejm.org/doi/full/10.1056/example", defaults), true);
assert.equal(isWhitelisted("file:///Users/htlin/Documents/example.pdf", defaults), true);
assert.equal(isWhitelisted("https://example.com/doi/full/10.1056/example", defaults), false);
