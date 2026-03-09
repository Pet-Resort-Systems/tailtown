#!/usr/bin/env node

/**
 * Simple script to test API connectivity between apps/frontend and backend
 */

const http = require('http');
const https = require('https');

// Configuration
const API_URL = 'http://localhost:4004';
const TEST_ENDPOINT = '/api/resources/availability';
const TEST_PARAMS = '?resourceType=suite&date=2025-08-03';

console.log(`Testing API connectivity to ${API_URL}${TEST_ENDPOINT}${TEST_PARAMS}`);

// Parse the URL
const url = new URL(`${API_URL}${TEST_ENDPOINT}${TEST_PARAMS}`);
const options = {
  hostname: url.hostname,
  port: url.port,
  path: `${url.pathname}${url.search}`,
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
};

// Choose http or https module based on protocol
const requestModule = url.protocol === 'https:' ? https : http;

// Make the request
const req = requestModule.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const parsedData = JSON.parse(data);
      console.log('Response received successfully');
      console.log(`Response status: ${parsedData.status}`);
      console.log(`Number of resources: ${parsedData.data?.resources?.length || 0}`);
      
      // Check if the response contains the expected data structure
      if (parsedData.status === 'success' && Array.isArray(parsedData.data?.resources)) {
        console.log('✅ API connection test PASSED');
      } else {
        console.log('❌ API connection test FAILED: Unexpected response format');
      }
    } catch (error) {
      console.error('Error parsing response:', error.message);
      console.log('❌ API connection test FAILED');
    }
  });
});

req.on('error', (error) => {
  console.error(`Error making request: ${error.message}`);
  console.log('❌ API connection test FAILED');
});

req.end();
