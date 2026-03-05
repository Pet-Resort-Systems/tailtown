#!/usr/bin/env node

/**
 * Generate PDF Report from Load Test Results
 * Requires: npm install -g markdown-pdf
 */

const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

const markdownFile = path.join(__dirname, 'RESULTS.md');
const pdfFile = path.join(__dirname, 'Load-Test-Results-2025-11-08.pdf');

console.log('📄 Generating PDF report from test results...');
console.log('');

// Check if markdown-pdf is installed
exec('which markdown-pdf', (error) => {
  if (error) {
    console.log('❌ markdown-pdf not installed');
    console.log('');
    console.log('Install with:');
    console.log('  npm install -g markdown-pdf');
    console.log('');
    console.log('Then run:');
    console.log('  node generate-pdf-report.js');
    console.log('');
    console.log('Alternative: Use online converter');
    console.log('  1. Open RESULTS.md in VS Code');
    console.log('  2. Install "Markdown PDF" extension');
    console.log('  3. Right-click → "Markdown PDF: Export (pdf)"');
    process.exit(1);
  }

  // Generate PDF
  exec(`markdown-pdf "${markdownFile}" -o "${pdfFile}"`, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Error generating PDF:', error.message);
      process.exit(1);
    }

    console.log('✅ PDF report generated successfully!');
    console.log('');
    console.log(`📄 File: ${pdfFile}`);
    console.log('');
    console.log('Next steps:');
    console.log('1. Open the PDF to review');
    console.log('2. Email it using the command below:');
    console.log('');
    console.log('Email command:');
    console.log(`  node send-report-email.js "${pdfFile}" rob@tailtownpetresort.com`);
  });
});
