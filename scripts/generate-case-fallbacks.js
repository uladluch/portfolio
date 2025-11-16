const fs = require('fs');
const path = require('path');

const casesDir = path.join(__dirname, '..', 'cases');
const outputPath = path.join(__dirname, '..', 'assets', 'js', 'case-fallbacks.js');

const entries = {};
fs.readdirSync(casesDir)
  .filter((file) => file.endsWith('.html'))
  .sort()
  .forEach((file) => {
    const fullPath = path.join(casesDir, file);
    entries[`cases/${file}`] = fs.readFileSync(fullPath, 'utf8');
  });

fs.writeFileSync(outputPath, `window.__CASE_FALLBACKS = ${JSON.stringify(entries)};\n`);
console.log(`Generated ${outputPath}`);
