/**
 * Concurrent Booking Stress Test
 * Tests double-booking prevention under high concurrency
 *
 * Run with: k6 run concurrent-booking-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

// Custom metrics
const successfulBookings = new Counter('successful_bookings');
const rejectedBookings = new Counter('rejected_bookings');
const doubleBookings = new Counter('double_bookings');
const errorRate = new Rate('errors');

// Test configuration - high concurrency, short duration
export const options = {
  scenarios: {
    concurrent_booking_spike: {
      executor: 'constant-arrival-rate',
      rate: 50, // 50 requests per second
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 100,
      maxVUs: 200,
    },
  },
  thresholds: {
    successful_bookings: ['count>0'],
    double_bookings: ['count==0'], // Should be ZERO double bookings
    rejected_bookings: ['count>0'], // Should have rejections (conflict detection working)
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4003';
const TENANT_ID = 'test-tenant-concurrent';

// Use same resource for all bookings to force conflicts
const testCustomerId = 'customer-concurrent-001';
const testPetId = 'pet-concurrent-001';
const testServiceId = 'service-boarding-001';
const testResourceId = 'resource-A01'; // SAME RESOURCE FOR ALL

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'x-tenant-id': TENANT_ID,
  };

  // All VUs try to book the SAME kennel for the SAME dates
  const tomorrow = new Date(Date.now() + 86400000);
  const dayAfter = new Date(Date.now() + 172800000);

  const payload = JSON.stringify({
    customerId: testCustomerId,
    petId: testPetId,
    serviceId: testServiceId,
    resourceId: testResourceId, // Same resource!
    startDate: tomorrow.toISOString().split('T')[0],
    endDate: dayAfter.toISOString().split('T')[0],
    status: 'CONFIRMED',
  });

  const response = http.post(`${BASE_URL}/api/reservations`, payload, {
    headers,
    timeout: '10s',
  });

  // Check response
  const success = check(response, {
    'response received': (r) => r.status !== 0,
    'valid status code': (r) =>
      r.status === 201 || r.status === 409 || r.status === 400,
  });

  if (response.status === 201) {
    // Successful booking
    successfulBookings.add(1);

    // Verify it's actually saved by checking again
    const verifyResponse = http.get(
      `${BASE_URL}/api/reservations?resourceId=${testResourceId}&startDate=${tomorrow.toISOString().split('T')[0]}`,
      { headers }
    );

    if (verifyResponse.status === 200) {
      const body = JSON.parse(verifyResponse.body);
      const count = body.data ? body.data.length : 0;

      // If more than 1 reservation for same resource/date, we have a double booking!
      if (count > 1) {
        doubleBookings.add(1);
        console.error(
          `⚠️  DOUBLE BOOKING DETECTED! ${count} reservations for same resource/date`
        );
      }
    }
  } else if (response.status === 409) {
    // Conflict - correctly rejected
    rejectedBookings.add(1);
  } else if (response.status === 400) {
    // Validation error - also acceptable
    rejectedBookings.add(1);
  } else {
    // Unexpected error
    errorRate.add(1);
    console.error(`Unexpected status: ${response.status}`);
  }

  errorRate.add(!success);
  sleep(0.1); // Small sleep to prevent overwhelming the system
}

export function handleSummary(data) {
  const summary = {
    testName: 'Concurrent Booking Stress Test',
    timestamp: new Date().toISOString(),
    metrics: {
      totalRequests: data.metrics.http_reqs.values.count,
      successfulBookings: data.metrics.successful_bookings.values.count,
      rejectedBookings: data.metrics.rejected_bookings.values.count,
      doubleBookings: data.metrics.double_bookings.values.count,
      errorRate: data.metrics.errors.values.rate,
      avgDuration: data.metrics.http_req_duration.values.avg,
      p95Duration: data.metrics.http_req_duration.values['p(95)'],
    },
    result: data.metrics.double_bookings.values.count === 0 ? 'PASS' : 'FAIL',
  };

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔥 CONCURRENT BOOKING STRESS TEST RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total Booking Attempts: ${summary.metrics.totalRequests}`);
  console.log(`✅ Successful Bookings: ${summary.metrics.successfulBookings}`);
  console.log(`🚫 Rejected Bookings: ${summary.metrics.rejectedBookings}`);
  console.log(`⚠️  Double Bookings: ${summary.metrics.doubleBookings}`);
  console.log(
    `❌ Error Rate: ${(summary.metrics.errorRate * 100).toFixed(2)}%`
  );
  console.log(
    `⏱️  Avg Response Time: ${summary.metrics.avgDuration.toFixed(2)}ms`
  );
  console.log(
    `⏱️  P95 Response Time: ${summary.metrics.p95Duration.toFixed(2)}ms`
  );
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (summary.result === 'PASS') {
    console.log('✅ TEST PASSED: No double bookings detected!');
  } else {
    console.log('❌ TEST FAILED: Double bookings detected!');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return {
    'performance/results/concurrent-booking-test-summary.json': JSON.stringify(
      summary,
      null,
      2
    ),
  };
}
