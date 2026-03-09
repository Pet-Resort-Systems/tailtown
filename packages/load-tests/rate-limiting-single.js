import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '1m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'], // 95% of requests should be below 500ms
    'errors': ['rate<0.1'],              // Error rate should be below 10%
  },
};

// Test configuration
const BASE_URL = __ENV.API_URL || 'http://localhost:4004';
const TENANT_ID = 'dev'; // Single tenant for this test

export default function () {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': TENANT_ID,
    },
  };

  // Test health endpoint (should not be rate limited)
  const healthRes = http.get(`${BASE_URL}/health`, params);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
  });

  // Test API endpoint (should be rate limited)
  const apiRes = http.get(`${BASE_URL}/api/customers`, params);
  
  const isSuccess = check(apiRes, {
    'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
    'rate limit headers present': (r) => r.headers['Ratelimit-Limit'] !== undefined,
  });

  if (!isSuccess) {
    errorRate.add(1);
    console.log(`Unexpected status: ${apiRes.status}`);
  } else {
    errorRate.add(0);
  }

  // Log when rate limit is hit
  if (apiRes.status === 429) {
    console.log(`Rate limit hit for tenant ${TENANT_ID} at ${new Date().toISOString()}`);
    console.log(`Retry-After: ${apiRes.headers['Retry-After']}`);
  }

  sleep(0.1); // Small delay between requests
}

export function handleSummary(data) {
  return {
    'load-tests/results/rate-limiting-single.json': JSON.stringify(data, null, 2),
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;
  
  let summary = '\n' + indent + '=== Load Test Summary ===\n\n';
  
  // Request stats
  summary += indent + 'Requests:\n';
  summary += indent + `  Total: ${data.metrics.http_reqs.values.count}\n`;
  summary += indent + `  Failed: ${data.metrics.http_req_failed ? data.metrics.http_req_failed.values.rate * 100 : 0}%\n\n`;
  
  // Response time stats
  summary += indent + 'Response Time:\n';
  summary += indent + `  Avg: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += indent + `  P95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += indent + `  P99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n\n`;
  
  // Rate limit info
  summary += indent + 'Rate Limiting:\n';
  summary += indent + `  Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%\n`;
  
  return summary;
}
