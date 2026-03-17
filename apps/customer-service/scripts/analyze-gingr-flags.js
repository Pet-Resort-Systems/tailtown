#!/usr/bin/env node

const fs = require('fs');
const { parse } = require('csv-parse/sync');

// Parse all CSV files
const files = fs
  .readdirSync('/tmp')
  .filter((f) => f.startsWith('Reservations'));
let allFlags = new Map();

files.forEach((file) => {
  const csv = fs.readFileSync(`/tmp/${file}`, 'utf8');
  const records = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    trim: true,
  });

  records.forEach((r) => {
    if (!r.icons_string) return;

    // Extract all flag icons with their colors and titles
    const flagRegex =
      /<i class="fa fa-flag[^"]*"[^>]*style="color:(#[0-9a-f]{6});?"[^>]*data-original_title="([^"]+)"/gi;
    const flagMatches = [...r.icons_string.matchAll(flagRegex)];

    for (const match of flagMatches) {
      const color = match[1];
      const title = match[2];
      const key = `${color}|${title}`;

      if (!allFlags.has(key)) {
        allFlags.set(key, { color, title, count: 0, examples: [] });
      }
      const flag = allFlags.get(key);
      flag.count++;
      if (flag.examples.length < 3) {
        flag.examples.push(r.a_first);
      }
    }
  });
});

console.log('\n🚩 PLAYGROUP FLAGS FOUND IN GINGR:\n');
console.log('Color    | Title                      | Count | Examples');
console.log(
  '---------|----------------------------|-------|------------------'
);

[...allFlags.values()]
  .sort((a, b) => b.count - a.count)
  .forEach((f) => {
    console.log(
      `${f.color} | ${f.title.padEnd(26)} | ${String(f.count).padStart(
        5
      )} | ${f.examples.join(', ')}`
    );
  });

console.log(`\nTotal unique flag types: ${allFlags.size}`);
