/**
 * Reservation Service Load Test
 * Tests the reservation service under various load conditions
 *
 * Run with: k6 run reservation-load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const reservationCreationTime = new Trend('reservation_creation_time');
const reservationQueryTime = new Trend('reservation_query_time');
const failedReservations = new Counter('failed_reservations');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 }, // Ramp up to 10 users
    { duration: '1m', target: 10 }, // Stay at 10 users
    { duration: '30s', target: 50 }, // Ramp up to 50 users
    { duration: '2m', target: 50 }, // Stay at 50 users
    { duration: '30s', target: 100 }, // Spike to 100 users
    { duration: '1m', target: 100 }, // Stay at 100 users
    { duration: '30s', target: 0 }, // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.1'], // Error rate should be below 10%
    errors: ['rate<0.1'], // Custom error rate below 10%
  },
};

// Base URL
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4003';
const TENANT_ID = 'test-tenant-perf';

// Test data
const testCustomerId = 'customer-perf-001';
const testPetId = 'pet-perf-001';
const testServiceId = 'service-boarding-001';
const testResourceId = 'resource-A01';

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'x-tenant-id': TENANT_ID,
  };

  // Test 1: Get all reservations (pagination test)
  testGetReservations(headers);
  sleep(1);

  // Test 2: Get reservations with filters
  testGetReservationsWithFilters(headers);
  sleep(1);

  // Test 3: Create reservation
  testCreateReservation(headers);
  sleep(1);

  // Test 4: Check availability (high-frequency operation)
  testCheckAvailability(headers);
  sleep(1);

  // Test 5: Get reservation by ID
  testGetReservationById(headers);
  sleep(1);
}

function testGetReservations(headers) {
  const startTime = new Date();

  const response = http.get(`${BASE_URL}/api/reservations?limit=250`, {
    headers,
  });

  const duration = new Date() - startTime;
  reservationQueryTime.add(duration);

  const success = check(response, {
    'get reservations status is 200': (r) => r.status === 200,
    'get reservations has data': (r) => {
      const body = JSON.parse(r.body);
      return body.data && Array.isArray(body.data);
    },
    'get reservations returns within 500ms': () => duration < 500,
  });

  errorRate.add(!success);
}

function testGetReservationsWithFilters(headers) {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const response = http.get(
    `${BASE_URL}/api/reservations?startDate=${today}&endDate=${tomorrow}&status=CONFIRMED&limit=100`,
    { headers }
  );

  const success = check(response, {
    'filtered reservations status is 200': (r) => r.status === 200,
    'filtered reservations has pagination': (r) => {
      const body = JSON.parse(r.body);
      return body.pagination !== undefined;
    },
  });

  errorRate.add(!success);
}

function testCreateReservation(headers) {
  const startTime = new Date();
  const tomorrow = new Date(Date.now() + 86400000);
  const dayAfter = new Date(Date.now() + 172800000);

  const payload = JSON.stringify({
    customerId: testCustomerId,
    petId: testPetId,
    serviceId: testServiceId,
    resourceId: testResourceId,
    startDate: tomorrow.toISOString().split('T')[0],
    endDate: dayAfter.toISOString().split('T')[0],
    status: 'CONFIRMED',
  });

  const response = http.post(`${BASE_URL}/api/reservations`, payload, {
    headers,
  });

  const duration = new Date() - startTime;
  reservationCreationTime.add(duration);

  const success = check(response, {
    'create reservation status is 201 or 409': (r) =>
      r.status === 201 || r.status === 409, // 409 = conflict (expected in load test)
    'create reservation returns within 1s': () => duration < 1000,
  });

  if (response.status !== 201 && response.status !== 409) {
    failedReservations.add(1);
  }

  errorRate.add(!success);
}

function testCheckAvailability(headers) {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const dayAfter = new Date(Date.now() + 172800000).toISOString().split('T')[0];

  const response = http.post(
    `${BASE_URL}/api/resources/availability`,
    JSON.stringify({
      startDate: tomorrow,
      endDate: dayAfter,
      resourceIds: [testResourceId],
    }),
    { headers }
  );

  const success = check(response, {
    'check availability status is 200': (r) => r.status === 200,
    'check availability has results': (r) => {
      const body = JSON.parse(r.body);
      return body.data !== undefined;
    },
  });

  errorRate.add(!success);
}

function testGetReservationById(headers) {
  // First get a list to find an ID
  const listResponse = http.get(`${BASE_URL}/api/reservations?limit=1`, {
    headers,
  });

  if (listResponse.status === 200) {
    const body = JSON.parse(listResponse.body);
    if (body.data && body.data.length > 0) {
      const reservationId = body.data[0].id;

      const response = http.get(
        `${BASE_URL}/api/reservations/${reservationId}`,
        { headers }
      );

      const success = check(response, {
        'get reservation by id status is 200': (r) => r.status === 200,
        'get reservation by id has data': (r) => {
          const body = JSON.parse(r.body);
          return body.data && body.data.id === reservationId;
        },
      });

      errorRate.add(!success);
    }
  }
}

export function handleSummary(data) {
  return {
    'performance/results/reservation-load-test-summary.json':
      JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;

  let summary = '\n';
  summary += `${indent}Test Summary:\n`;
  summary += `${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  summary += `${indent}Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `${indent}Failed Requests: ${data.metrics.http_req_failed.values.passes}\n`;
  summary += `${indent}Request Duration (avg): ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `${indent}Request Duration (p95): ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `${indent}Request Duration (max): ${data.metrics.http_req_duration.values.max.toFixed(2)}ms\n`;
  summary += `${indent}Requests/sec: ${data.metrics.http_reqs.values.rate.toFixed(2)}\n`;
  summary += `${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  return summary;
}
