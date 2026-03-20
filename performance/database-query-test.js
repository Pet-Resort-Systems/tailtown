/**
 * Database Query Performance Test
 * Tests database query performance with large datasets
 *
 * Run with: k6 run database-query-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Custom metrics
const paginationQueryTime = new Trend('pagination_query_time');
const filterQueryTime = new Trend('filter_query_time');
const complexQueryTime = new Trend('complex_query_time');
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp up
    { duration: '2m', target: 20 }, // Sustained load
    { duration: '30s', target: 0 }, // Ramp down
  ],
  thresholds: {
    pagination_query_time: ['p(95)<300'], // Pagination should be fast
    filter_query_time: ['p(95)<500'], // Filtering a bit slower
    complex_query_time: ['p(95)<1000'], // Complex queries can be slower
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4003';
const TENANT_ID = 'test-tenant-db';

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'x-tenant-id': TENANT_ID,
  };

  // Test 1: Large pagination query (250 records)
  testLargePagination(headers);
  sleep(1);

  // Test 2: Multiple filters
  testMultipleFilters(headers);
  sleep(1);

  // Test 3: Date range queries
  testDateRangeQuery(headers);
  sleep(1);

  // Test 4: Complex query with joins
  testComplexQuery(headers);
  sleep(1);

  // Test 5: Sorting performance
  testSortingQuery(headers);
  sleep(1);
}

function testLargePagination(headers) {
  const startTime = new Date();

  const response = http.get(`${BASE_URL}/api/reservations?limit=250&page=1`, {
    headers,
  });

  const duration = new Date() - startTime;
  paginationQueryTime.add(duration);

  const success = check(response, {
    'pagination query status is 200': (r) => r.status === 200,
    'pagination query returns data': (r) => {
      const body = JSON.parse(r.body);
      return body.data && Array.isArray(body.data);
    },
    'pagination query has metadata': (r) => {
      const body = JSON.parse(r.body);
      return body.pagination && body.pagination.total !== undefined;
    },
    'pagination query under 300ms': () => duration < 300,
  });

  errorRate.add(!success);
}

function testMultipleFilters(headers) {
  const startTime = new Date();
  const today = new Date().toISOString().split('T')[0];

  const response = http.get(
    `${BASE_URL}/api/reservations?status=CONFIRMED,CHECKED_IN&startDate=${today}&limit=100`,
    { headers }
  );

  const duration = new Date() - startTime;
  filterQueryTime.add(duration);

  const success = check(response, {
    'filter query status is 200': (r) => r.status === 200,
    'filter query returns filtered data': (r) => {
      const body = JSON.parse(r.body);
      return body.data && Array.isArray(body.data);
    },
    'filter query under 500ms': () => duration < 500,
  });

  errorRate.add(!success);
}

function testDateRangeQuery(headers) {
  const startTime = new Date();
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 86400000);

  const response = http.get(
    `${BASE_URL}/api/reservations?startDate=${today.toISOString().split('T')[0]}&endDate=${nextWeek.toISOString().split('T')[0]}&limit=200`,
    { headers }
  );

  const duration = new Date() - startTime;
  filterQueryTime.add(duration);

  const success = check(response, {
    'date range query status is 200': (r) => r.status === 200,
    'date range query returns data': (r) => {
      const body = JSON.parse(r.body);
      return body.data !== undefined;
    },
  });

  errorRate.add(!success);
}

function testComplexQuery(headers) {
  const startTime = new Date();
  const today = new Date().toISOString().split('T')[0];

  // Query with multiple filters, sorting, and pagination
  const response = http.get(
    `${BASE_URL}/api/reservations?status=CONFIRMED&startDate=${today}&sortBy=startDate&sortOrder=desc&limit=100&page=1`,
    { headers }
  );

  const duration = new Date() - startTime;
  complexQueryTime.add(duration);

  const success = check(response, {
    'complex query status is 200': (r) => r.status === 200,
    'complex query returns sorted data': (r) => {
      const body = JSON.parse(r.body);
      if (!body.data || body.data.length < 2) return true;

      // Verify sorting
      const dates = body.data.map((r) => new Date(r.startDate));
      for (let i = 1; i < dates.length; i++) {
        if (dates[i] > dates[i - 1]) return false;
      }
      return true;
    },
    'complex query under 1s': () => duration < 1000,
  });

  errorRate.add(!success);
}

function testSortingQuery(headers) {
  const startTime = new Date();

  const response = http.get(
    `${BASE_URL}/api/reservations?sortBy=createdAt&sortOrder=desc&limit=100`,
    { headers }
  );

  const duration = new Date() - startTime;
  filterQueryTime.add(duration);

  const success = check(response, {
    'sorting query status is 200': (r) => r.status === 200,
    'sorting query returns data': (r) => {
      const body = JSON.parse(r.body);
      return body.data && Array.isArray(body.data);
    },
  });

  errorRate.add(!success);
}

export function handleSummary(data) {
  const summary = {
    testName: 'Database Query Performance Test',
    timestamp: new Date().toISOString(),
    metrics: {
      totalRequests: data.metrics.http_reqs.values.count,
      paginationQueryAvg:
        data.metrics.pagination_query_time.values.avg.toFixed(2),
      paginationQueryP95:
        data.metrics.pagination_query_time.values['p(95)'].toFixed(2),
      filterQueryAvg: data.metrics.filter_query_time.values.avg.toFixed(2),
      filterQueryP95: data.metrics.filter_query_time.values['p(95)'].toFixed(2),
      complexQueryAvg: data.metrics.complex_query_time.values.avg.toFixed(2),
      complexQueryP95:
        data.metrics.complex_query_time.values['p(95)'].toFixed(2),
      errorRate: (data.metrics.errors.values.rate * 100).toFixed(2),
    },
  };

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 DATABASE QUERY PERFORMANCE TEST RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total Queries: ${summary.metrics.totalRequests}`);
  console.log('');
  console.log('Pagination Queries (250 records):');
  console.log(`  Avg: ${summary.metrics.paginationQueryAvg}ms`);
  console.log(`  P95: ${summary.metrics.paginationQueryP95}ms`);
  console.log('');
  console.log('Filter Queries:');
  console.log(`  Avg: ${summary.metrics.filterQueryAvg}ms`);
  console.log(`  P95: ${summary.metrics.filterQueryP95}ms`);
  console.log('');
  console.log('Complex Queries:');
  console.log(`  Avg: ${summary.metrics.complexQueryAvg}ms`);
  console.log(`  P95: ${summary.metrics.complexQueryP95}ms`);
  console.log('');
  console.log(`Error Rate: ${summary.metrics.errorRate}%`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return {
    'performance/results/database-query-test-summary.json': JSON.stringify(
      summary,
      null,
      2
    ),
  };
}
