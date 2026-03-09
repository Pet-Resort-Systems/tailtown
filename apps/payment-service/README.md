# Payment Service

Payment processing service for Tailtown with CardConnect integration.

## Features

- ✅ Credit card payment processing
- ✅ Authorization and capture
- ✅ Refunds and voids
- ✅ Transaction inquiry
- ✅ PCI-compliant tokenization
- ✅ Test environment support
- ✅ Comprehensive logging
- ✅ Rate limiting
- ✅ Security headers

## CardConnect Integration

This service integrates with CardConnect's payment gateway using their REST API.

### Test Environment

The service is configured to use CardConnect's UAT (User Acceptance Testing) environment by default.

**Test API Endpoint:** `https://fts-uat.cardconnect.com/cardconnect/rest`

**Test Credentials:**
- Merchant ID: `496160873888`
- Username: `testing`
- Password: `testing123`

### Test Card Numbers

Use these test cards in the UAT environment:

#### Visa
- **Approved:** `4788250000028291`
- **Declined:** `4387751111111053`
- **Expiry:** `1225` (MMYY)
- **CVV:** `123`

#### Mastercard
- **Approved:** `5454545454545454`
- **Declined:** `5112345112345114`
- **Expiry:** `1225`
- **CVV:** `123`

#### American Express
- **Approved:** `371449635398431`
- **Declined:** `371449635392431`
- **Expiry:** `1225`
- **CVV:** `1234` (4 digits)

#### Discover
- **Approved:** `6011000991001201`
- **Declined:** `6011000991001111`
- **Expiry:** `1225`
- **CVV:** `123`

## API Endpoints

### POST /api/payments/authorize

Authorize a payment (and optionally capture immediately).

**Request:**
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

**Response (Success):**
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

**Response (Declined):**
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

### POST /api/payments/capture

Capture a previously authorized payment.

**Request:**
```json
{
  "retref": "123456789012",
  "amount": 50.00
}
```

### POST /api/payments/refund

Refund a payment.

**Request:**
```json
{
  "retref": "123456789012",
  "amount": 50.00
}
```

### POST /api/payments/void

Void a payment.

**Request:**
```json
{
  "retref": "123456789012"
}
```

### GET /api/payments/inquire/:retref

Get transaction details.

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

### GET /api/payments/test-cards

Get test card numbers (development only).

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
    "mastercard": { ... },
    "amex": { ... },
    "discover": { ... }
  }
}
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

**Important:** The default `.env.example` contains test credentials. These are safe to use in development but **MUST** be changed for production.

### 3. Build

```bash
npm run build
```

### 4. Start Service

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

The service will start on port 4005 by default.

## Testing

### Manual Testing with cURL

**Authorize Payment:**
```bash
curl -X POST http://localhost:4005/api/payments/authorize \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10.00,
    "cardNumber": "4788250000028291",
    "expiry": "1225",
    "cvv": "123",
    "name": "Test User",
    "capture": true
  }'
```

**Get Test Cards:**
```bash
curl http://localhost:4005/api/payments/test-cards
```

### Automated Tests

```bash
npm test
```

## Security

### PCI Compliance

This service handles sensitive payment card data. Follow these security practices:

1. **Never log full card numbers**
   - Card numbers are automatically masked in logs
   - Only last 4 digits are logged

2. **Use HTTPS in production**
   - All payment data must be transmitted over HTTPS
   - Configure SSL/TLS certificates

3. **Secure environment variables**
   - Never commit `.env` files to version control
   - Use secure secret management in production

4. **Tokenization**
   - CardConnect returns tokens for stored cards
   - Use tokens instead of card numbers for repeat transactions

5. **Rate limiting**
   - API endpoints are rate-limited to prevent abuse
   - Default: 100 requests per 15 minutes

### Production Checklist

Before deploying to production:

- [ ] Update CardConnect credentials to production values
- [ ] Change `CARDCONNECT_API_URL` to production endpoint
- [ ] Set strong `JWT_SECRET` and `API_KEY`
- [ ] Enable HTTPS
- [ ] Configure proper CORS origins
- [ ] Set up monitoring and alerting
- [ ] Review and adjust rate limits
- [ ] Set `NODE_ENV=production`
- [ ] Configure log rotation
- [ ] Set up backup and disaster recovery

## Response Codes

### CardConnect Response Status (respstat)

- `A` - Approved
- `B` - Retry (temporary issue)
- `C` - Declined

### Common Response Codes (respcode)

- `00` - Approval
- `02` - Referral
- `05` - Do not honor
- `14` - Invalid card number
- `41` - Lost card
- `43` - Stolen card
- `51` - Insufficient funds
- `54` - Expired card
- `57` - Transaction not permitted
- `61` - Exceeds withdrawal limit
- `65` - Activity limit exceeded

### AVS Response Codes (avsresp)

- `Y` - Address and ZIP match
- `Z` - ZIP matches, address does not
- `A` - Address matches, ZIP does not
- `N` - Neither address nor ZIP match
- `U` - Address information unavailable

### CVV Response Codes (cvvresp)

- `M` - CVV matches
- `N` - CVV does not match
- `P` - Not processed
- `U` - Unavailable

## Troubleshooting

### Connection Errors

**Error:** `ECONNREFUSED` or timeout

**Solution:**
- Check CardConnect API URL is correct
- Verify network connectivity
- Check firewall rules

### Authentication Errors

**Error:** `401 Unauthorized`

**Solution:**
- Verify username and password are correct
- Check merchant ID is valid
- Ensure credentials match the environment (UAT vs Production)

### Validation Errors

**Error:** `400 Bad Request`

**Solution:**
- Check request format matches API documentation
- Verify all required fields are present
- Ensure amount is in correct format (decimal)
- Verify card number passes Luhn check
- Check expiry date format (MMYY)

### Declined Transactions

**Error:** `402 Payment Required` with declined status

**Solution:**
- Use approved test card numbers in UAT
- Check card expiry date
- Verify sufficient funds (in production)
- Review response code for specific decline reason

## Architecture

```
┌─────────────────┐
│   Frontend      │
│   (React)       │
└────────┬────────┘
         │
         │ HTTP/HTTPS
         │
┌────────▼────────┐
│  Payment        │
│  Service        │
│  (Express)      │
└────────┬────────┘
         │
         │ REST API
         │
┌────────▼────────┐
│  CardConnect    │
│  Gateway        │
└─────────────────┘
```

## Logging

Logs include:
- All API requests (with sanitized data)
- All API responses
- Authorization results
- Errors and exceptions

**Log Levels:**
- `error` - Errors and exceptions
- `warn` - Warnings and declined transactions
- `info` - General information
- `debug` - Detailed debugging information

**Configure log level:**
```bash
LOG_LEVEL=debug npm run dev
```

## Support

### CardConnect Documentation

- [API Documentation](https://developer.cardconnect.com/cardconnect-api)
- [Testing Guide](https://developer.cardconnect.com/guides/testing)
- [Integration Guide](https://developer.cardconnect.com/guides/integration)

### Contact

For issues or questions:
- CardConnect Support: support@cardconnect.com
- CardConnect Phone: 1-877-828-0720

## License

Proprietary - Tailtown Pet Resort Management System
