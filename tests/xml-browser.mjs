import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('http://127.0.0.1:5173/');
  const available = await page.evaluate(async () => {
    try { return typeof (await import('/xml.js')).formatXml === 'function'; } catch { return false; }
  });
  assert.equal(available, true, 'XML formatter module must exist');
  const checks = await page.evaluate(async () => {
    const { formatXml } = await import('/xml.js');
    const simple = formatXml('<root><item id="1">hello</item><empty/></root>');
    const mixed = '<p>Hello <b>world</b>!</p>';
    const preserved = '<root xml:space="preserve">  <item/>\n </root>';
    return {
      simple,
      stable: formatXml(simple) === simple,
      mixed: formatXml(mixed),
      preserved: formatXml(preserved),
      special: formatXml('<?xml version="1.0"?><root><!-- note --><![CDATA[a < b]]></root>'),
      namespaces: formatXml('<r xmlns:x="urn:test"><x:a x:id="2">a &amp; b</x:a></r>'),
      invalid: ['', '<a><b></a>', '<a/><b/>'].every(value => { try { formatXml(value); return false; } catch { return true; } })
    };
  });
  assert.match(checks.simple, /<root>\r\n\t<item id="1">hello<\/item>\r\n\t<empty\/>\r\n<\/root>/);
  assert.equal(checks.stable, true);
  assert.equal(checks.mixed, '<p>Hello <b>world</b>!</p>');
  assert.equal(checks.preserved, '<root xml:space="preserve">  <item/>\n </root>');
  assert.ok(checks.special.startsWith('<?xml version="1.0"?>'));
  assert.ok(checks.special.includes('<!-- note --><![CDATA[a < b]]>'));
  assert.ok(checks.namespaces.includes('a &amp; b'));
  assert.equal(checks.invalid, true);
  await page.getByRole('link', { name: 'XML 格式化', exact: true }).click();
  await page.getByLabel('XML 内容', { exact: true }).fill('<root><item id="1">hello</item><empty/></root>');
  await page.locator('#xml-form button').click();
  assert.match(await page.locator('#xml-input').inputValue(), /\n\t<item/);
  assert.match(await page.locator('#xml-line-numbers').textContent(), /^1\n2\n3/);
  assert.equal(await page.locator('#xml-status').textContent(), '');
  await page.screenshot({ path: 'artifacts/xml-desktop.png', fullPage: true });
  await page.locator('#xml-input').fill('<a><b></a>');
  await page.locator('#xml-form button').click();
  assert.equal(await page.locator('#xml-input').inputValue(), '<a><b></a>');
  assert.equal(await page.locator('#xml-input').getAttribute('aria-invalid'), 'true');
  for (const width of [320, 390, 886]) {
    await page.setViewportSize({ width, height: 884 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}`);
  }
  await page.getByRole('link', { name: 'JSON 格式化', exact: true }).click();
  await page.getByRole('link', { name: 'XML 格式化', exact: true }).click();
  assert.equal(await page.locator('#xml-input').inputValue(), '<a><b></a>');
  console.log('XML tests passed: formatting, mixed content, whitespace, comments, CDATA, namespaces, errors, line numbers, navigation and mobile.');
} finally { await browser.close(); }
