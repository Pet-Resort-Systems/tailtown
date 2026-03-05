#!/usr/bin/env node

/**
 * Simple Load Test (No k6 required)
 * Tests rate limiting with basic Node.js
 */

const http = require('http');

const BASE_URL = process.env.API_URL || 'http://localhost:4004';
const TENANT_ID = 'dev';
const TOTAL_REQUESTS = 100;
const CONCURRENT = 10;

let completed = 0;
let success = 0;
let rateLimited = 0;
let errors = 0;
const responseTimes = [];

console.log('🚀 Simple Load Test Starting...');
console.log(`Target: ${BASE_URL}`);
console.log(`Tenant: ${TENANT_ID}`);
console.log(`Requests: ${TOTAL_REQUESTS} (${CONCURRENT} concurrent)`);
console.log('');

function makeRequest() {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const url = new URL(`${BASE_URL}/health`);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname,
      method: 'GET',
      headers: {
        'x-tenant-id': TENANT_ID,
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      const duration = Date.now() - startTime;
      responseTimes.push(duration);
      
      completed++;
      
      if (res.statusCode === 200) {
        success++;
      } else if (res.statusCode === 429) {
        rateLimited++;
        console.log(`⚠️  Rate limit hit at request ${completed}`);
      } else {
        errors++;
      }
      
      res.on('data', () => {}); // Consume response
      res.on('end', () => resolve());
    });

    req.on('error', (err) => {
      completed++;
      errors++;
      console.error(`❌ Error: ${err.message}`);
      resolve();
    });

    req.end();
  });
}

async function runBatch(batchSize) {
  const promises = [];
  for (let i = 0; i < batchSize; i++) {
    promises.push(makeRequest());
  }
  await Promise.all(promises);
}

async function runTest() {
  const batches = Math.ceil(TOTAL_REQUESTS / CONCURRENT);
  
  for (let i = 0; i < batches; i++) {
    const batchSize = Math.min(CONCURRENT, TOTAL_REQUESTS - (i * CONCURRENT));
    await runBatch(batchSize);
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Calculate stats
  responseTimes.sort((a, b) => a - b);
  const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const p95Index = Math.floor(responseTimes.length * 0.95);
  const p95 = responseTimes[p95Index];
  
  console.log('');
  console.log('✅ Test Complete!');
  console.log('================');
  console.log('');
  console.log('Results:');
  console.log(`  Total Requests: ${completed}`);
  console.log(`  Success (200): ${success}`);
  console.log(`  Rate Limited (429): ${rateLimited}`);
  console.log(`  Errors: ${errors}`);
  console.log('');
  console.log('Response Times:');
  console.log(`  Average: ${avg.toFixed(2)}ms`);
  console.log(`  Min: ${responseTimes[0]}ms`);
  console.log(`  Max: ${responseTimes[responseTimes.length - 1]}ms`);
  console.log(`  P95: ${p95}ms`);
  console.log('');
  
  if (rateLimited > 0) {
    console.log('✅ Rate limiting is working!');
  } else {
    console.log('ℹ️  No rate limits hit (increase TOTAL_REQUESTS to test)');
  }
}

runTest().catch(console.error);
