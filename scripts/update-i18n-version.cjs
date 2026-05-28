#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const i18nDir = path.resolve(__dirname, '..', 'assets', 'i18n');
const files = fs.readdirSync(i18nDir).filter(f => f.endsWith('.json'));
let updated = 0;
for (const file of files) {
  const full = path.join(i18nDir, file);
  try {
    const raw = fs.readFileSync(full, 'utf8');
    const data = JSON.parse(raw);
    if (data && data.updatesPage && data.updatesPage.hero && typeof data.updatesPage.hero.intro === 'string') {
      const intro = data.updatesPage.hero.intro;
      if (intro.includes('12.0.0')) {
        data.updatesPage.hero.intro = intro.replace(/12\.0\.0/g, '12.1.0');
        fs.writeFileSync(full, JSON.stringify(data, null, 2) + '\n', 'utf8');
        console.log('updated', file);
        updated++;
      }
    }
  } catch (err) {
    console.error('failed', file, err && err.message);
  }
}
console.log('done. files updated:', updated);
