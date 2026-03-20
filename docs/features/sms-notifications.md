# SMS Notifications with Twilio

## Overview

The Tailtown Pet Resort Management System includes SMS notification capabilities powered by Twilio. This feature enables automated text message communications for appointment reminders, confirmations, check-in/check-out notifications, and marketing campaigns.

## Features

### Message Types

1. **Appointment Reminders** - Sent before scheduled appointments
2. **Reservation Confirmations** - Sent when bookings are confirmed
3. **Welcome Messages** - Sent to new customers
4. **Check-In Notifications** - Sent when pets are checked in
5. **Check-Out Notifications** - Sent when pets are ready for pickup
6. **Marketing Messages** - Promotional campaigns and announcements

### Key Capabilities

- ✅ **Twilio Integration**: Professional SMS delivery service
- ✅ **Template-Based Messages**: Consistent, branded communications
- ✅ **Phone Number Validation**: Automatic formatting and validation
- ✅ **Graceful Fallback**: Works without Twilio (logs messages)
- ✅ **Tenant-Aware**: Each business sends with their own branding
- ✅ **Batch Messaging**: Send to multiple customers at once

## Setup

### 1. Get Twilio Credentials

1. Sign up for a Twilio account at https://www.twilio.com
2. Get your Account SID and Auth Token from the Twilio Console
3. Purchase a Twilio phone number (or use a trial number for testing)

### 2. Configure Environment Variables

Add the following to `apps/customer-service/.env`:

```bash
# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# Business Information
BUSINESS_NAME=Your Business Name
BUSINESS_PHONE=+1234567890
```

### 3. Restart the Service

```bash
cd apps/customer-service
source ~/.nvm/nvm.sh
pnpm run dev
```

## API Endpoints

### Check Configuration

```bash
GET /api/sms/config
```

**Response:**
```json
{
  "success": true,
  "data": {
    "twilioConfigured": true,
    "message": "Twilio is configured and ready to send SMS"
  }
}
```

### Send Test SMS

```bash
POST /api/sms/test
Content-Type: application/json

{
  "phoneNumber": "+1234567890",
  "message": "This is a test message!"
}
```

### Send Appointment Reminder

```bash
POST /api/sms/reservation-reminder/:reservationId
Headers: x-tenant-id, x-tenant-subdomain
```

**Example:**
```bash
curl -X POST http://localhost:4004/api/sms/reservation-reminder/abc123 \
  -H "x-tenant-id: dev" \
  -H "x-tenant-subdomain: dev"
```

**Message Format:**
```
Hi John! This is a reminder that Max has a Boarding appointment at Tailtown Pet Resort on Monday, October 24, 2025 at 9:00 AM. Questions? Call us at +1234567890
```

### Send Reservation Confirmation

```bash
POST /api/sms/reservation-confirmation/:reservationId
Headers: x-tenant-id, x-tenant-subdomain
```

**Message Format:**
```
Tailtown Pet Resort: Your Boarding reservation for Max is confirmed (Order #RES-20251024-001)! Check-in: Oct 24, Check-out: Oct 26. Questions? +1234567890
```

### Send Welcome Message

```bash
POST /api/sms/welcome/:customerId
Headers: x-tenant-id, x-tenant-subdomain
```

**Message Format:**
```
Welcome to Tailtown Pet Resort, John Smith! We're excited to care for your furry family member. Call us anytime at +1234567890. Reply STOP to opt out.
```

### Send Marketing Message

```bash
POST /api/sms/marketing
Content-Type: application/json
Headers: x-tenant-id, x-tenant-subdomain

{
  "customerIds": ["customer-id-1", "customer-id-2"],
  "message": "Special offer: 20% off all grooming services this week!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sent": 2,
    "failed": 0,
    "results": [
      {
        "customerId": "customer-id-1",
        "customerName": "John Smith",
        "success": true,
        "messageId": "SM..."
      }
    ]
  }
}
```

### Send Check-In Notification

```bash
POST /api/sms/check-in/:reservationId
Headers: x-tenant-id, x-tenant-subdomain
```

**Message Format:**
```
Tailtown Pet Resort: Max has been checked in! We'll take great care of them. Have a wonderful day, John!
```

### Send Check-Out Notification

```bash
POST /api/sms/check-out/:reservationId
Headers: x-tenant-id, x-tenant-subdomain
```

**Message Format:**
```
Tailtown Pet Resort: Max is ready for pickup! We hope they had a great time. See you soon, John!
```

## Phone Number Formats

The system accepts and automatically formats various phone number formats:

- ✅ `+1234567890` (E.164 format)
- ✅ `1234567890` (10 digits)
- ✅ `(123) 456-7890`
- ✅ `123-456-7890`
- ✅ `123.456.7890`

All numbers are converted to E.164 format (+1XXXXXXXXXX) for Twilio.

## Message Templates

### Appointment Reminder
```
Hi {customerName}! This is a reminder that {petName} has a {serviceName} appointment at {tenantName} on {date} at {time}. Questions? Call us at {tenantPhone}
```

### Reservation Confirmation
```
{tenantName}: Your {serviceName} reservation for {petName} is confirmed (Order #{orderNumber})! Check-in: {startDate}, Check-out: {endDate}. Questions? {tenantPhone}
```

### Welcome Message
```
Welcome to {tenantName}, {customerName}! We're excited to care for your furry family member. Call us anytime at {tenantPhone}. Reply STOP to opt out.
```

### Check-In Notification
```
{tenantName}: {petName} has been checked in! We'll take great care of them. Have a wonderful day, {customerName}!
```

### Check-Out Notification
```
{tenantName}: {petName} is ready for pickup! We hope they had a great time. See you soon, {customerName}!
```

### Marketing Message
```
{tenantName}: {customMessage} Reply STOP to opt out.
```

## Best Practices

### Compliance

1. **Opt-Out**: Always include "Reply STOP to opt out" in marketing messages
2. **Consent**: Only send to customers who have opted in
3. **Timing**: Send messages during business hours (9 AM - 8 PM)
4. **Frequency**: Limit marketing messages to avoid spam
5. **TCPA Compliance**: Follow Telephone Consumer Protection Act guidelines

### Message Content

1. **Be Concise**: SMS has 160-character limit (longer messages are split)
2. **Include Business Name**: Start with your business name for recognition
3. **Clear Call-to-Action**: Make it obvious what the customer should do
4. **Contact Info**: Include phone number for questions
5. **Professional Tone**: Keep messages friendly but professional

### Automation

1. **Appointment Reminders**: Send 24 hours before appointment
2. **Confirmations**: Send immediately after booking
3. **Check-In/Out**: Send in real-time
4. **Welcome Messages**: Send within 1 hour of customer creation
5. **Marketing**: Schedule during optimal times

## Error Handling

### Common Errors

1. **Invalid Phone Number**
   - Error: "Invalid phone number format"
   - Solution: Ensure phone number is in valid format

2. **Customer Has No Phone**
   - Error: "Customer phone number not available"
   - Solution: Update customer record with phone number

3. **Twilio Not Configured**
   - Behavior: Messages logged but not sent
   - Solution: Add Twilio credentials to .env

4. **Twilio API Error**
   - Error: Twilio-specific error message
   - Solution: Check Twilio account status and balance

### Graceful Fallback

When Twilio is not configured:
- Messages are logged to console
- API returns success with mock message ID
- No errors thrown
- System continues to function normally

## Testing

### Without Twilio (Development)

```bash
# Messages will be logged to console
POST /api/sms/test
{
  "phoneNumber": "+1234567890",
  "message": "Test message"
}
```

**Console Output:**
```
📱 SMS (Twilio not configured):
To: +1234567890
Message: Test message
---
```

### With Twilio (Production)

1. Configure Twilio credentials in .env
2. Use Twilio trial number for testing
3. Verify phone number in Twilio console
4. Send test message
5. Check Twilio logs for delivery status

## Monitoring

### Twilio Console

- View message logs
- Check delivery status
- Monitor usage and costs
- Review error reports

### Application Logs

```bash
# Successful send
✅ SMS sent successfully: SM...

# Error
❌ Error sending SMS: [error message]
```

## Cost Considerations

### Twilio Pricing (US)

- **SMS**: ~$0.0079 per message
- **Phone Number**: ~$1.15/month
- **Trial Account**: Free credits for testing

### Optimization Tips

1. **Batch Messages**: Send multiple messages efficiently
2. **Opt-Out Management**: Don't send to opted-out customers
3. **Message Length**: Keep under 160 characters to avoid splits
4. **Timing**: Send during business hours to reduce waste

## Integration Examples

### Automatic Reminder Cron Job

```typescript
// Send reminders for tomorrow's appointments
import cron from 'node-cron';
import { smsService } from './services/sms.service';

cron.schedule('0 9 * * *', async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const reservations = await getReservationsForDate(tomorrow);
  
  for (const reservation of reservations) {
    if (reservation.customer.phone) {
      await smsService.sendAppointmentReminder({
        customerName: reservation.customer.name,
        customerPhone: reservation.customer.phone,
        petName: reservation.pet.name,
        serviceName: reservation.service.name,
        startDate: reservation.startDate,
        tenantName: 'Tailtown Pet Resort',
      });
    }
  }
});
```

### Post-Checkout Confirmation

```typescript
// After checkout, send confirmation
app.post('/api/checkout/complete', async (req, res) => {
  const { reservationId } = req.body;
  
  // Process payment...
  
  // Send SMS confirmation
  await fetch(`http://localhost:4004/api/sms/reservation-confirmation/${reservationId}`, {
    method: 'POST',
    headers: {
      'x-tenant-id': 'dev',
      'x-tenant-subdomain': 'dev'
    }
  });
  
  res.json({ success: true });
});
```

## Troubleshooting

### Messages Not Sending

1. Check Twilio configuration in .env
2. Verify phone number format
3. Check Twilio account balance
4. Review Twilio console for errors
5. Check application logs

### Invalid Phone Numbers

1. Ensure phone number includes country code
2. Remove special characters
3. Use E.164 format (+1XXXXXXXXXX)
4. Verify number is valid in Twilio console

### Rate Limiting

1. Twilio has rate limits (varies by account type)
2. Implement delays between batch messages
3. Use Twilio's messaging service for higher throughput
4. Monitor Twilio console for rate limit errors

## Security

### Best Practices

1. **Environment Variables**: Never commit credentials to git
2. **API Keys**: Rotate Twilio auth token regularly
3. **Access Control**: Restrict SMS endpoints to authenticated users
4. **Rate Limiting**: Implement rate limits on SMS endpoints
5. **Audit Logs**: Log all SMS sends for compliance

### Data Privacy

1. **Phone Numbers**: Encrypt in database
2. **Message Content**: Don't include sensitive information
3. **Opt-Out**: Honor opt-out requests immediately
4. **GDPR**: Allow customers to request data deletion

## Support

### Resources

- **Twilio Documentation**: https://www.twilio.com/docs
- **Twilio Console**: https://console.twilio.com
- **Twilio Support**: https://support.twilio.com

### Common Questions

**Q: Can I use a different SMS provider?**
A: Yes, but you'll need to modify the sms.service.ts to use their API.

**Q: How do I handle international numbers?**
A: Update the phone validation logic to support international formats.

**Q: Can I customize message templates?**
A: Yes, edit the message templates in sms.service.ts.

**Q: How do I track message delivery?**
A: Use Twilio webhooks to receive delivery status updates.

## Version History

- **v1.0** (Oct 24, 2025): Initial Twilio SMS integration
  - 6 message types
  - Phone number validation
  - Graceful fallback
  - Batch messaging support
