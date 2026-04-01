#!/usr/bin/env node

/**
 * Coverage Badge Generator
 * Generates coverage badges based on test coverage results
 */

const fs = require('fs');
const path = require('path');

// Badge colors based on coverage percentage
function getBadgeColor(percentage) {
  if (percentage >= 80) return 'brightgreen';
  if (percentage >= 70) return 'green';
  if (percentage >= 60) return 'yellowgreen';
  if (percentage >= 50) return 'yellow';
  if (percentage >= 40) return 'orange';
  return 'red';
}

// Generate badge URL
function generateBadgeUrl(label, value, color) {
  return `https://img.shields.io/badge/${encodeURIComponent(label)}-${encodeURIComponent(value)}-${color}`;
}

// Read coverage summary
function readCoverageSummary(summaryPath) {
  try {
    const data = fs.readFileSync(summaryPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading coverage summary: ${error.message}`);
    return null;
  }
}

// Generate badges for a component
function generateBadges(componentName, summaryPath) {
  const coverage = readCoverageSummary(summaryPath);

  if (!coverage || !coverage.total) {
    console.log(`No coverage data found for ${componentName}`);
    return;
  }

  const total = coverage.total;
  const badges = [];

  // Statements badge
  const stmtPct = total.statements.pct;
  badges.push({
    label: `${componentName} Statements`,
    value: `${stmtPct}%`,
    color: getBadgeColor(stmtPct),
    url: generateBadgeUrl(
      `${componentName} Statements`,
      `${stmtPct}%`,
      getBadgeColor(stmtPct)
    ),
  });

  // Branches badge
  const branchPct = total.branches.pct;
  badges.push({
    label: `${componentName} Branches`,
    value: `${branchPct}%`,
    color: getBadgeColor(branchPct),
    url: generateBadgeUrl(
      `${componentName} Branches`,
      `${branchPct}%`,
      getBadgeColor(branchPct)
    ),
  });

  // Functions badge
  const funcPct = total.functions.pct;
  badges.push({
    label: `${componentName} Functions`,
    value: `${funcPct}%`,
    color: getBadgeColor(funcPct),
    url: generateBadgeUrl(
      `${componentName} Functions`,
      `${funcPct}%`,
      getBadgeColor(funcPct)
    ),
  });

  // Lines badge
  const linePct = total.lines.pct;
  badges.push({
    label: `${componentName} Lines`,
    value: `${linePct}%`,
    color: getBadgeColor(linePct),
    url: generateBadgeUrl(
      `${componentName} Lines`,
      `${linePct}%`,
      getBadgeColor(linePct)
    ),
  });

  return badges;
}

// Generate markdown for badges
function generateMarkdown(badges) {
  let markdown = '## Test Coverage Badges\n\n';

  badges.forEach((badge) => {
    markdown += `![${badge.label}](${badge.url})\n`;
  });

  return markdown;
}

// Main execution
function main() {
  console.log('🎨 Generating Coverage Badges...\n');

  const badges = [];

  // Legacy Frontend badges
  const frontendSummary = path.join(
    __dirname,
    '../apps/legacy-frontend/coverage/coverage-summary.json'
  );
  if (fs.existsSync(frontendSummary)) {
    const frontendBadges = generateBadges('Legacy Frontend', frontendSummary);
    if (frontendBadges) {
      badges.push(...frontendBadges);
      console.log('✅ Legacy Frontend badges generated');
    }
  } else {
    console.log('⚠️  Legacy frontend coverage not found');
  }

  // Backend badges
  const backendSummary = path.join(
    __dirname,
    '../apps/reservation-service/coverage/coverage-summary.json'
  );
  if (fs.existsSync(backendSummary)) {
    const backendBadges = generateBadges('Backend', backendSummary);
    if (backendBadges) {
      badges.push(...backendBadges);
      console.log('✅ Backend badges generated');
    }
  } else {
    console.log('⚠️  Backend coverage not found');
  }

  // Generate markdown
  if (badges.length > 0) {
    const markdown = generateMarkdown(badges);
    const outputPath = path.join(__dirname, '../coverage-badges.md');
    fs.writeFileSync(outputPath, markdown);
    console.log(`\n📝 Badges written to: ${outputPath}`);
    console.log('\n' + markdown);
  } else {
    console.log('\n❌ No coverage data found. Run tests with coverage first.');
  }
}

main();
