import fs from 'node:fs';
import vm from 'node:vm';

const read = path => fs.readFileSync(path, 'utf8');
const index = read('index.html');
const i18n = read('i18n.js');
const portal = read('portal-sso.js');
const maintenanceCss = read('maintenance-dev-hub.css');
const languageCss = read('i18n.css');
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

check(!/<\/(?:svg|span|a|button|div|h[1-6])\s+[^>]+>/i.test(index), 'Closing tags must not contain attributes.');
check(!/class="[^"]*\breveal\b[^"]*"[^>]*style="[^"]*opacity\s*:\s*0/i.test(index), 'Reveal elements must not be hidden inline.');
check(/id="typingTarget"[^>]*data-i18n="hero_title"[^>]*>\s*[^<\s][^<]*<\/h1>/.test(index), 'Home heading needs visible fallback text.');
check(/id="faqTyping"[^>]*data-i18n="faq_title"[^>]*>\s*[^<\s][^<]*<\/h1>/.test(index), 'FAQ heading needs visible fallback text.');
check(/id="btnDownloadHero"[^>]*onclick="openDownloadModal\(event\)"/.test(index), 'Hero download must open the confirmation modal.');
check(!/<\/a>\\+\s*<a/.test(index), 'Stray backslashes must not appear between links.');
check(!/<\/a>\\+n\s*<a/.test(index), 'Literal newline escapes must not appear between links.');
check(!/>\\+n\s*</.test(index), 'Literal newline escapes must not appear between HTML elements.');
check(!/color:#(?:444|555|666|777)\b/i.test(portal), 'Portal dynamic UI contains unreadably dark foreground text.');

const enBlock = i18n.match(/const EN = \{([\s\S]*?)\n  \};/)?.[1] || '';
const enKeys = new Set([...enBlock.matchAll(/(?:^|,)\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/g)].map(match => match[1]));
const usedKeys = new Set([...index.matchAll(/data-i18n(?:-ph|-placeholder|-aria|-title)?="([^"]+)"/g)].map(match => match[1]));
const missingKeys = [...usedKeys].filter(key => !enKeys.has(key));
check(missingKeys.length === 0, `Missing English i18n keys: ${missingKeys.join(', ')}`);

const allCss = `${index}\n${maintenanceCss}\n${languageCss}`;
const declared = new Set([...allCss.matchAll(/(--[A-Za-z0-9_-]+)\s*:/g)].map(match => match[1]));
const used = new Set([...allCss.matchAll(/var\((--[A-Za-z0-9_-]+)/g)].map(match => match[1]));
const undefinedVars = [...used].filter(name => !declared.has(name));
check(undefinedVars.length === 0, `Undefined CSS variables: ${undefinedVars.join(', ')}`);

function luminance(hex) {
  const rgb = hex.match(/[A-Fa-f0-9]{2}/g).map(value => parseInt(value, 16) / 255).map(value => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}
function contrast(foreground, background = '#000000') {
  const a = luminance(foreground.replace('#', '').length === 3 ? '#' + [...foreground.slice(1)].map(c => c + c).join('') : foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
for (const [token, minimum] of [['--soft-text', 7], ['--sub-text', 6], ['--dim-text', 4.5]]) {
  const value = index.match(new RegExp(`${token}:(#[A-Fa-f0-9]{6})`))?.[1];
  check(Boolean(value), `${token} must be a six-digit hex color.`);
  if (value) check(contrast(value) >= minimum, `${token} contrast is below ${minimum}:1.`);
}

for (const file of ['i18n.js', 'portal-sso.js', 'maintenance-dev-hub.js']) {
  try { new vm.Script(read(file), { filename: file }); }
  catch (error) { failures.push(`${file} syntax error: ${error.message}`); }
}
const inlineScripts = [...index.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]).filter(code => code.trim());
inlineScripts.forEach((code, indexValue) => {
  try { new vm.Script(code, { filename: `index-inline-${indexValue + 1}.js` }); }
  catch (error) { failures.push(`Inline script ${indexValue + 1} syntax error: ${error.message}`); }
});

if (failures.length) {
  console.error('UI audit failed:\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log(`UI audit passed: ${usedKeys.size} i18n keys, ${used.size} CSS variables, ${inlineScripts.length} inline scripts.`);
