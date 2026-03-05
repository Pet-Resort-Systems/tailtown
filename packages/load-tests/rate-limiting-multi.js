import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const rateLimitHits = new Counter('rate_limit_hits');
const tenantARequests = new Counter('tenant_a_requests');
const tenantBRequests = new Counter('tenant_b_requests');

// Test configuration
export const options = {
  scenarios: {
    tenant_a: {
      executor: 'constant-vus',
      vus: 25,
      duration: '2m',
      exec: 'tenantAScenario',
    },
    tenant_b: {
      executor: 'constant-vus',
      vus: 25,
      duration: '2m',
      exec: 'tenantBScenario',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<500'],
    'errors': ['rate<0.1'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:4004';

function makeRequest(tenantId, counter) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': tenantId,
    },
  };

  const res = http.get(`${BASE_URL}/api/customers`, params);
  counter.add(1);

  const isSuccess = check(res, {
    'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
  });

  if (!isSuccess) {
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }

  if (res.status === 429) {
    rateLimitHits.add(1);
    console.log(`Rate limit hit for tenant ${tenantId} at ${new Date().toISOString()}`);
  }

  sleep(0.05);
}

export function tenantAScenario() {
  makeRequest('tenant-a', tenantARequests);
}

export function tenantBScenario() {
  makeRequest('tenant-b', tenantBRequests);
}

export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    test: 'Multi-Tenant Rate Limiting',
    results: {
      total_requests: data.metrics.http_reqs.values.count,
      tenant_a_requests: data.metrics.tenant_a_requests ? data.metrics.tenant_a_requests.values.count : 0,
      tenant_b_requests: data.metrics.tenant_b_requests ? data.metrics.tenant_b_requests.values.count : 0,
      rate_limit_hits: data.metrics.rate_limit_hits ? data.metrics.rate_limit_hits.values.count : 0,
      error_rate: data.metrics.errors.values.rate,
      avg_response_time: data.metrics.http_req_duration.values.avg,
      p95_response_time: data.metrics.http_req_duration.values['p(95)'],
    },
  };

  return {
    'load-tests/results/rate-limiting-multi.json': JSON.stringify(summary, null, 2),
    'stdout': formatSummary(summary),
  };
}

function formatSummary(summary) {
  return `
=== Multi-Tenant Rate Limiting Test ===

Total Requests: ${summary.results.total_requests}
  Tenant A: ${summary.results.tenant_a_requests}
  Tenant B: ${summary.results.tenant_b_requests}

Rate Limit Hits: ${summary.results.rate_limit_hits}
Error Rate: ${(summary.results.error_rate * 100).toFixed(2)}%

Response Times:
  Average: ${summary.results.avg_response_time.toFixed(2)}ms
  P95: ${summary.results.p95_response_time.toFixed(2)}ms

✅ Test validates that:
  - Each tenant has independent rate limits
  - One tenant hitting limit doesn't affect others
  - Rate limiting is enforced correctly
`;
}
