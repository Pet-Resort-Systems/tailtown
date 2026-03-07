# Payment Service Documentation

## Overview

The Payment Service is a microservice that handles all payment processing for the Tailtown Pet Resort Management System. It integrates with CardConnect's payment gateway to provide secure, PCI-compliant credit card processing.

**Service Port:** 4005  
**Status:** ✅ Operational (as of October 21, 2025)  
**Environment:** UAT (User Acceptance Testing)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (Port 3000)                  │
│                    React Application                    │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │ HTTP/HTTPS
                       │
┌──────────────────────▼──────────────────────────────────┐
│              Payment Service (Port 4005)                │
│                  Express.js Server                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Payment Controller                             │   │
│  │  - Authorization                                │   │
│  │  - Capture                                      │   │
│  │  - Refund                                       │   │
│  │  - Void                                         │   │
│  │  - Inquiry                                      │   │
│  └──────────────────┬──────────────────────────────┘   │
│                     │                                   │
│  ┌──────────────────▼──────────────────────────────┐   │
│  │  CardConnect Service                            │   │
│  │  - API Integration                              │   │
│  │  - Request/Response Logging                     │   │
│  │  - Data Sanitization                            │   │
│  └──────────────────┬──────────────────────────────┘   │
└─────────────────────┼───────────────────────────────────┘
                      │
                      │ REST API
                      │
┌─────────────────────▼───────────────────────────────────┐
│           CardConnect Gateway (UAT/Production)          │
│         https://fts-uat.cardconnect.com                 │
└─────────────────────────────────────────────────────────┘
```

## Service Architecture

### Components

1. **Express Server** (`src/index.ts`)
   - Security middleware (Helmet)
   - CORS configuration
   - Rate limiting
   - Request logging
   - Health check endpoint

2. **CardConnect Service** (`src/services/cardconnect.service.ts`)
   - REST API client
   - Authorization and capture
   - Refunds and voids
   - Transaction inquiry
   - Sensitive data masking
   - Request/response logging

3. **Payment Controller** (`src/controllers/payment.controller.ts`)
   - Request validation (Joi)
   - Business logic
   - Response formatting
   - Error handling

4. **Routes** (`src/routes/payment.routes.ts`)
   - API endpoint definitions
   - Route handlers

5. **Logger** (`src/utils/logger.ts`)
   - Winston-based logging
   - Console and file transports
   - Structured logging

## API Endpoints

### Health Check

```
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "payment-service",
  "timestamp": "2025-10-21T10:00:00.000Z"
}
```

### Authorize Payment

```
POST /api/payments/authorize
```

**Request Body:**
```json
{
  "amount": 50.00,
  "cardNumber": "4788250000028291",
  "expiry": "1225",
  "cvv": "123",
  "name": "John Doe",
  "email": "john@example.com",
  "address": "123 Main St",
  "city": "Anytown",
  "state": "CA",
  "zip": "12345",
  "orderId": "ORDER-123",
  "capture": true
}
```

**Response (Success - 200):**
```json
{
  "status": "success",
  "message": "Payment authorized successfully",
  "data": {
    "transactionId": "123456789012",
    "authCode": "APPROVAL",
    "amount": 50.00,
    "approved": true,
    "responseCode": "00",
    "responseText": "Approval",
    "avsResponse": "Y",
    "cvvResponse": "M",
    "token": "9441149619831111",
    "maskedCard": "************8291"
  }
}
```

**Response (Declined - 402):**
```json
{
  "status": "declined",
  "message": "Payment declined",
  "data": {
    "approved": false,
    "responseCode": "05",
    "responseText": "Do not honor"
  }
}
```

### Capture Payment

```
POST /api/payments/capture
```

**Request Body:**
```json
{
  "retref": "123456789012",
  "amount": 50.00
}
```

### Refund Payment

```
POST /api/payments/refund
```

**Request Body:**
```json
{
  "retref": "123456789012",
  "amount": 50.00
}
```

### Void Payment

```
POST /api/payments/void
```

**Request Body:**
```json
{
  "retref": "123456789012"
}
```

### Inquire Transaction

```
GET /api/payments/inquire/:retref
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "retref": "123456789012",
    "amount": "5000",
    "respstat": "A",
    "respcode": "00",
    "resptext": "Approval"
  }
}
```

### Get Test Cards

```
GET /api/payments/test-cards
```

**Response:**
```json
{
  "status": "success",
  "message": "Test card numbers for CardConnect UAT environment",
  "data": {
    "visa": {
      "approved": "4788250000028291",
      "declined": "4387751111111053",
      "expiry": "1225",
      "cvv": "123"
    },
    "mastercard": {
      "approved": "5454545454545454",
      "declined": "5112345112345114",
      "expiry": "1225",
      "cvv": "123"
    },
    "amex": {
      "approved": "371449635398431",
      "declined": "371449635392431",
      "expiry": "1225",
      "cvv": "1234"
    },
    "discover": {
      "approved": "6011000991001201",
      "declined": "6011000991001111",
      "expiry": "1225",
      "cvv": "123"
    }
  }
}
```

## Test Environment

### CardConnect UAT Configuration

**API Endpoint:** `https://fts-uat.cardconnect.com/cardconnect/rest`

**Test Credentials:**
- **Merchant ID:** `496160873888`
- **Username:** `testing`
- **Password:** `testing123`
- **Site:** `fts-uat`

### Test Card Numbers

| Card Type  | Number             | Expiry | CVV  | Result   |
| ---------- | ------------------ | ------ | ---- | -------- |
| Visa       | `4788250000028291` | 1225   | 123  | Approved |
| Visa       | `4387751111111053` | 1225   | 123  | Declined |
| Mastercard | `5454545454545454` | 1225   | 123  | Approved |
| Mastercard | `5112345112345114` | 1225   | 123  | Declined |
| Amex       | `371449635398431`  | 1225   | 1234 | Approved |
| Amex       | `371449635392431`  | 1225   | 1234 | Declined |
| Discover   | `6011000991001201` | 1225   | 123  | Approved |
| Discover   | `6011000991001111` | 1225   | 123  | Declined |

## Response Codes

### Status Codes (respstat)

- **A** - Approved ✅
- **B** - Retry (temporary issue) 🔄
- **C** - Declined ❌

### Common Response Codes (respcode)

| Code | Description               |
| ---- | ------------------------- |
| 00   | Approval                  |
| 02   | Referral                  |
| 05   | Do not honor              |
| 14   | Invalid card number       |
| 41   | Lost card                 |
| 43   | Stolen card               |
| 51   | Insufficient funds        |
| 54   | Expired card              |
| 57   | Transaction not permitted |
| 61   | Exceeds withdrawal limit  |
| 65   | Activity limit exceeded   |

### AVS Response Codes (avsresp)

| Code | Description                     |
| ---- | ------------------------------- |
| Y    | Address and ZIP match           |
| Z    | ZIP matches, address does not   |
| A    | Address matches, ZIP does not   |
| N    | Neither address nor ZIP match   |
| U    | Address information unavailable |

### CVV Response Codes (cvvresp)

| Code | Description          |
| ---- | -------------------- |
| M    | CVV matches ✅        |
| N    | CVV does not match ❌ |
| P    | Not processed        |
| U    | Unavailable          |

## Security

### PCI Compliance

The payment service follows PCI-DSS best practices:

1. **Card Data Protection**
   - Card numbers are never logged in full
   - Only last 4 digits are stored/logged
   - CVV is never stored
   - Automatic data masking in logs

2. **Secure Communication**
   - HTTPS required in production
   - TLS 1.2+ for CardConnect API
   - Secure credential storage

3. **Access Control**
   - Rate limiting (100 requests/15 minutes)
   - CORS protection
   - Security headers (Helmet)
   - Request validation

4. **Tokenization**
   - CardConnect returns tokens for stored cards
   - Use tokens for repeat transactions
   - No card data stored locally

### Environment Variables

**Required:**
```bash
PORT=4005
CARDCONNECT_API_URL=https://fts-uat.cardconnect.com/cardconnect/rest
CARDCONNECT_MERCHANT_ID=496160873888
CARDCONNECT_USERNAME=testing
CARDCONNECT_PASSWORD=testing123
CARDCONNECT_SITE=fts-uat
```

**Optional:**
```bash
NODE_ENV=development
LOG_LEVEL=debug
ALLOWED_ORIGINS=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Setup and Deployment

### Local Development

1. **Install Dependencies:**
   ```bash
   cd /path/to/tailtown
   pnpm install
   ```

2. **Configure Environment:**
   ```bash
   cd apps/payment-service
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Start Development Server:**
   ```bash
   pnpm run dev
   ```

4. **Test:**
   ```bash
   curl http://localhost:4005/health
   curl http://localhost:4005/api/payments/test-cards
   ```

### Production Deployment

**Pre-deployment Checklist:**

- [ ] Update to production CardConnect credentials
- [ ] Change `CARDCONNECT_API_URL` to production endpoint
- [ ] Set strong `JWT_SECRET` and `API_KEY`
- [ ] Enable HTTPS only
- [ ] Configure proper CORS origins
- [ ] Set up monitoring and alerting
- [ ] Review and adjust rate limits
- [ ] Set `NODE_ENV=production`
- [ ] Configure log rotation
- [ ] Set up backup and disaster recovery
- [ ] Complete PCI compliance audit

**Build:**
```bash
pnpm run build
```

**Start:**
```bash
pnpm start
```

## Integration Guide

### Frontend Integration

1. **Create Payment API Client:**
   ```typescript
   // apps/frontend/src/services/paymentService.ts
   import axios from 'axios';

   const paymentApi = axios.create({
     baseURL: 'http://localhost:4005/api/payments',
   });

   export const authorizePayment = async (paymentData) => {
     const response = await paymentApi.post('/authorize', paymentData);
     return response.data;
   };

   export const getTestCards = async () => {
     const response = await paymentApi.get('/test-cards');
     return response.data;
   };
   ```

2. **Use in Components:**
   ```typescript
   import { authorizePayment } from '../services/paymentService';

   const handlePayment = async (formData) => {
     try {
       const result = await authorizePayment({
         amount: formData.amount,
         cardNumber: formData.cardNumber,
         expiry: formData.expiry,
         cvv: formData.cvv,
         name: formData.name,
         capture: true,
       });

       if (result.data.approved) {
         // Payment successful
         console.log('Transaction ID:', result.data.transactionId);
       }
     } catch (error) {
       // Handle error
       console.error('Payment failed:', error);
     }
   };
   ```

### Backend Integration

To integrate with other services:

1. **Store Transaction Records:**
   - Save transaction ID to invoice/reservation
   - Store masked card number
   - Record payment status

2. **Handle Webhooks** (future):
   - Listen for CardConnect notifications
   - Update payment status
   - Trigger business logic

## Monitoring and Logging

### Log Levels

- **error** - Errors and exceptions
- **warn** - Warnings and declined transactions
- **info** - General information and API calls
- **debug** - Detailed debugging information

### Key Metrics to Monitor

1. **Transaction Metrics:**
   - Total transactions
   - Approval rate
   - Decline rate
   - Average transaction amount

2. **Performance Metrics:**
   - API response time
   - CardConnect API latency
   - Error rate
   - Timeout rate

3. **Security Metrics:**
   - Rate limit hits
   - Failed authentication attempts
   - Suspicious activity patterns

### Log Examples

**Successful Authorization:**
```
2025-10-21T10:00:00.000Z [info]: CardConnect API Request {
  method: 'put',
  url: '/auth',
  data: { amount: '5000', account: '****8291', ... }
}

2025-10-21T10:00:01.000Z [info]: Authorization result {
  respstat: 'A',
  retref: '123456789012',
  resptext: 'Approval'
}
```

**Declined Transaction:**
```
2025-10-21T10:00:00.000Z [warn]: Payment declined {
  respstat: 'C',
  resptext: 'Do not honor'
}
```

## Troubleshooting

### Common Issues

1. **Connection Errors**
   - Check CardConnect API URL
   - Verify network connectivity
   - Check firewall rules

2. **Authentication Errors**
   - Verify credentials are correct
   - Check merchant ID matches environment
   - Ensure credentials are for correct environment (UAT vs Production)

3. **Validation Errors**
   - Check request format
   - Verify all required fields present
   - Ensure amount format is correct (decimal)
   - Verify card number passes Luhn check

4. **Declined Transactions**
   - Use approved test cards in UAT
   - Check card expiry date
   - Review response code for specific reason

## Future Enhancements

### Planned Features

1. **Frontend Integration**
   - Payment form component
   - Saved card management
   - Payment history display

2. **Payment Reporting**
   - Transaction reports
   - Reconciliation tools
   - Export capabilities

3. **Recurring Payments**
   - Subscription management
   - Automatic billing
   - Payment schedules

4. **Advanced Features**
   - Split payments
   - Partial refunds
   - Payment plans
   - Gift cards

## Support

### CardConnect Resources

- [API Documentation](https://developer.cardconnect.com/cardconnect-api)
- [Testing Guide](https://developer.cardconnect.com/guides/testing)
- [Integration Guide](https://developer.cardconnect.com/guides/integration)

### Contact

- **CardConnect Support:** support@cardconnect.com
- **CardConnect Phone:** 1-877-828-0720

## Version History

### v1.0.0 (October 21, 2025)

**Initial Release:**
- CardConnect REST API integration
- Authorization and capture
- Refunds and voids
- Transaction inquiry
- Test environment configuration
- PCI-compliant practices
- Comprehensive documentation
- Security features (rate limiting, CORS, helmet)

---

**Last Updated:** October 21, 2025  
**Service Status:** ✅ Operational  
**Environment:** UAT (User Acceptance Testing)
