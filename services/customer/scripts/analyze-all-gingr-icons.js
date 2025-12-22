#!/usr/bin/env node

const fs = require("fs");
const { parse } = require("csv-parse/sync");

const files = fs
  .readdirSync("/tmp")
  .filter((f) => f.startsWith("Reservations"));
let allIcons = new Map();

files.forEach((file) => {
  const csv = fs.readFileSync(`/tmp/${file}`, "utf8");
  const records = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    trim: true,
  });

  records.forEach((r) => {
    if (!r.icons_string) return;

    // Extract ALL icon types with their properties
    const iconRegex =
      /<i class="(fa[rs]?) (fa-[^"]+)"[^>]*style="color:(#[0-9a-f]{6});?"[^>]*data-original_title="([^"]+)"[^>]*data-content="([^"]*)"/gi;
    const iconMatches = [...r.icons_string.matchAll(iconRegex)];

    for (const match of iconMatches) {
      const iconFamily = match[1]; // fa, far, fas
      const iconClass = match[2]; // fa-flag, fa-allergies, etc.
      const color = match[3];
      const title = match[4];
      const content = match[5];
      const key = `${iconClass}|${color}|${title}`;

      if (!allIcons.has(key)) {
        allIcons.set(key, {
          iconFamily,
          iconClass,
          color,
          title,
          content,
          category: extractCategory(r.icons_string, title),
          count: 0,
          examples: [],
        });
      }
      const icon = allIcons.get(key);
      icon.count++;
      if (icon.examples.length < 3) {
        icon.examples.push(r.a_first);
      }
    }
  });
});

function extractCategory(iconString, title) {
  const match = iconString.match(
    new RegExp(`data-original_title="${title}"[^>]*title="[^(]+ \\(([^)]+)\\)"`)
  );
  return match ? match[1] : "Unknown";
}

console.log("\n🏷️  ALL GINGR ICONS ANALYSIS\n");
console.log("=".repeat(120));

// Group by category
const byCategory = new Map();
[...allIcons.values()].forEach((icon) => {
  if (!byCategory.has(icon.category)) {
    byCategory.set(icon.category, []);
  }
  byCategory.get(icon.category).push(icon);
});

// Sort categories by total count
const sortedCategories = [...byCategory.entries()].sort((a, b) => {
  const countA = a[1].reduce((sum, icon) => sum + icon.count, 0);
  const countB = b[1].reduce((sum, icon) => sum + icon.count, 0);
  return countB - countA;
});

sortedCategories.forEach(([category, icons]) => {
  const totalCount = icons.reduce((sum, icon) => sum + icon.count, 0);
  console.log(`\n📁 ${category.toUpperCase()} (${totalCount} total)`);
  console.log("-".repeat(120));
  console.log(
    "Icon Class          | Color   | Title                           | Count | Content/Notes"
  );
  console.log(
    "--------------------|---------|----------------------------------|-------|------------------"
  );

  icons
    .sort((a, b) => b.count - a.count)
    .forEach((icon) => {
      const contentPreview = icon.content ? icon.content.substring(0, 40) : "";
      console.log(
        `${icon.iconClass.padEnd(19)} | ${icon.color} | ${icon.title.padEnd(
          32
        )} | ${String(icon.count).padStart(5)} | ${contentPreview}`
      );
    });
});

console.log("\n" + "=".repeat(120));
console.log(`\nTotal unique icon types: ${allIcons.size}`);
console.log(`Total categories: ${byCategory.size}\n`);
