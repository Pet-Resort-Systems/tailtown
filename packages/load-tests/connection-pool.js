import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const dbErrors = new Rate('db_errors');

// Test configuration - stress test connection pooling
export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Warm up
    { duration: '1m', target: 100 },   // Increase load
    { duration: '1m', target: 200 },   // High load (test pool limits)
    { duration: '30s', target: 100 },  // Cool down
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1000'], // Allow higher latency under stress
    'errors': ['rate<0.05'],              // Max 5% error rate
    'db_errors': ['rate<0.01'],           // Max 1% database errors
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:4004';
const TENANT_ID = 'dev';

export default function () {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': TENANT_ID,
    },
  };

  // Make database-heavy requests
  const endpoints = [
    '/api/customers',
    '/api/pets',
    '/api/services',
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const res = http.get(`${BASE_URL}${endpoint}`, params);

  const isSuccess = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 2000,
  });

  if (!isSuccess) {
    errorRate.add(1);
    
    // Check for database-specific errors
    if (res.body && (
      res.body.includes('connection') ||
      res.body.includes('pool') ||
      res.body.includes('timeout')
    )) {
      dbErrors.add(1);
      console.log(`DB Error at ${new Date().toISOString()}: ${res.status}`);
    }
  } else {
    errorRate.add(0);
    dbErrors.add(0);
  }

  sleep(0.1);
}

export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    test: 'Connection Pool Stress Test',
    results: {
      total_requests: data.metrics.http_reqs.values.count,
      error_rate: data.metrics.errors.values.rate,
      db_error_rate: data.metrics.db_errors ? data.metrics.db_errors.values.rate : 0,
      response_times: {
        avg: data.metrics.http_req_duration.values.avg,
        min: data.metrics.http_req_duration.values.min,
        max: data.metrics.http_req_duration.values.max,
        p50: data.metrics.http_req_duration.values.med,
        p95: data.metrics.http_req_duration.values['p(95)'],
        p99: data.metrics.http_req_duration.values['p(99)'],
      },
      requests_per_second: data.metrics.http_reqs.values.rate,
    },
    assessment: assessPerformance(data),
  };

  return {
    'load-tests/results/connection-pool.json': JSON.stringify(summary, null, 2),
    'stdout': formatSummary(summary),
  };
}

function assessPerformance(data) {
  const assessment = {
    overall: 'PASS',
    issues: [],
  };

  if (data.metrics.errors.values.rate > 0.05) {
    assessment.overall = 'FAIL';
    assessment.issues.push('High error rate (>5%)');
  }

  if (data.metrics.db_errors && data.metrics.db_errors.values.rate > 0.01) {
    assessment.overall = 'FAIL';
    assessment.issues.push('Database connection errors detected');
  }

  if (data.metrics.http_req_duration.values['p(95)'] > 1000) {
    assessment.overall = 'WARNING';
    assessment.issues.push('P95 response time > 1s');
  }

  if (assessment.issues.length === 0) {
    assessment.issues.push('All metrics within acceptable ranges');
  }

  return assessment;
}

function formatSummary(summary) {
  const status = summary.assessment.overall === 'PASS' ? '✅' : 
                 summary.assessment.overall === 'WARNING' ? '⚠️' : '❌';

  return `
=== Connection Pool Stress Test ===

${status} Overall Status: ${summary.assessment.overall}

Total Requests: ${summary.results.total_requests}
Requests/sec: ${summary.results.requests_per_second.toFixed(2)}

Error Rates:
  General: ${(summary.results.error_rate * 100).toFixed(2)}%
  Database: ${(summary.results.db_error_rate * 100).toFixed(2)}%

Response Times:
  Average: ${summary.results.response_times.avg.toFixed(2)}ms
  P50: ${summary.results.response_times.p50.toFixed(2)}ms
  P95: ${summary.results.response_times.p95.toFixed(2)}ms
  P99: ${summary.results.response_times.p99.toFixed(2)}ms
  Max: ${summary.results.response_times.max.toFixed(2)}ms

Assessment:
${summary.assessment.issues.map(issue => `  - ${issue}`).join('\n')}

Connection Pool Performance:
  ${summary.assessment.overall === 'PASS' ? '✅ Pool handled load without exhaustion' : '❌ Pool may need tuning'}
`;
}
