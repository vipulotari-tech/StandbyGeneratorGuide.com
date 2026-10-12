import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Run immediately after a staging build so duplicated component IDs are caught
// before expensive full-route browser and accessibility suites.
const files = fs.readdirSync('dist', { recursive: true })
  .filter(file => typeof file === 'string' && file.endsWith('index.html'));
let idsChecked = 0;
for (const file of files) {
  const html = fs.readFileSync(path.join('dist', file), 'utf8');
  const ids = new Set();
  // Match an id attribute, not data-id or a partial attribute name.
  for (const tag of html.matchAll(/<[a-z][^>]*>/gi)) {
    for (const match of tag[0].matchAll(/\s+id="([^"]+)"/g)) {
      const id = match[1];
      assert(id.trim(), `Empty HTML id on ${file}`);
      assert(!ids.has(id), `Duplicate HTML id "${id}" on ${file}`);
      ids.add(id);
      idsChecked++;
    }
  }
}
assert(files.length > 0, 'No generated HTML to audit');
console.log(`Unique IDs PASS: ${idsChecked} IDs across ${files.length} generated pages.`);
