# Twilio & SendGrid Production Setup Guide

## Overview

Tailtown has built-in SMS (Twilio) and email (SendGrid) services that are currently running in **test mode**. This guide will help you configure production credentials.

## Current Status

✅ **Code is ready** - SMS and email services are fully implemented  
⚠️ **Credentials needed** - Production API keys required  
🔧 **Test mode** - Currently logs messages instead of sending

---

## Part 1: SendGrid Email Setup

### Step 1: Create SendGrid Account

1. Go to [SendGrid.com](https://sendgrid.com)
2. Sign up for a free account (40,000 emails/month free for 30 days, then 100/day free forever)
3. Or upgrade to paid plan for higher limits

### Step 2: Verify Sender Email

**Option A: Single Sender Verification (Quick)**
1. Go to Settings → Sender Authentication
2. Click "Verify a Single Sender"
3. Enter your business email (e.g., `noreply@canicloud.com`)
4. Check email and click verification link

**Option B: Domain Authentication (Recommended for Production)**
1. Go to Settings → Sender Authentication
2. Click "Authenticate Your Domain"
3. Enter your domain (`canicloud.com`)
4. Add DNS records provided by SendGrid to your domain registrar
5. Wait for DNS propagation (can take up to 48 hours)

### Step 3: Create API Key

1. Go to Settings → API Keys
2. Click "Create API Key"
3. Name it: `Tailtown Production`
4. Select "Full Access" (or "Restricted Access" with Mail Send permission)
5. Click "Create & View"
6. **IMPORTANT**: Copy the API key immediately (you won't see it again!)

### Step 4: Configure Environment Variables

Add to `/opt/tailtown/services/customer/.env`:

```bash
# SendGrid Configuration
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@canicloud.com
SENDGRID_FROM_NAME="Tailtown Pet Resort"
```

### Step 5: Test Email Sending

```bash
# SSH into server
ssh -i ~/ttkey root@129.212.178.244

# Test email service
cd /opt/tailtown/services/customer
node -e "
const { emailService } = require('./dist/services/email.service');
emailService.sendEmail({
  to: 'your-email@example.com',
  subject: 'Test Email from Tailtown',
  html: '<h1>Success!</h1><p>SendGrid is configured correctly.</p>'
}).then(() => console.log('✅ Email sent!')).catch(err => console.error('❌ Error:', err));
"
```

---

## Part 2: Twilio SMS Setup

### Step 1: Create Twilio Account

1. Go to [Twilio.com](https://www.twilio.com)
2. Sign up for a free trial ($15 credit)
3. Or upgrade to paid account for production use

### Step 2: Get Phone Number

1. Go to Phone Numbers → Buy a Number
2. Select your country (United States)
3. Choose capabilities: **SMS** and **Voice** (optional)
4. Search for a local number in your area code
5. Purchase the number (~$1/month)

### Step 3: Get API Credentials

1. Go to Console Dashboard
2. Find your credentials:
   - **Account SID**: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - **Auth Token**: Click "View" to reveal
3. Copy both values

### Step 4: Configure Environment Variables

Add to `/opt/tailtown/services/customer/.env`:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

### Step 5: Test SMS Sending

```bash
# SSH into server
ssh -i ~/ttkey root@129.212.178.244

# Test SMS service
cd /opt/tailtown/services/customer
node -e "
const { smsService } = require('./dist/services/sms.service');
smsService.sendSMS({
  to: '+1234567890',  // Your phone number
  message: 'Test SMS from Tailtown! 🐾'
}).then(result => console.log('✅ SMS sent:', result)).catch(err => console.error('❌ Error:', err));
"
```

---

## Part 3: Restart Services

After adding environment variables, restart the services:

```bash
# Using PM2
pm2 restart customer-service

# Or restart all services
pm2 restart all

# Verify services are running
pm2 status
pm2 logs customer-service --lines 50
```

---

## Part 4: Verify Configuration

### Check SendGrid Status

```bash
curl -X GET https://api.sendgrid.com/v3/user/profile \
  -H "Authorization: Bearer YOUR_SENDGRID_API_KEY"
```

Expected response: Your account details

### Check Twilio Status

```bash
curl -X GET "https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID.json" \
  -u "YOUR_ACCOUNT_SID:YOUR_AUTH_TOKEN"
```

Expected response: Your account details

---

## Email Templates Available

The system includes these pre-built email templates:

1. **Reservation Confirmation** - Sent when booking is confirmed
2. **Reservation Reminder** - Sent 24 hours before appointment
3. **Status Change Notifications** - Check-in, check-out, cancellation
4. **Welcome Email** - Sent to new customers

### Customize Email Templates

Edit `/services/customer/src/services/email.service.ts` to customize:
- Email styling (colors, fonts)
- Email content
- Business information
- Footer text

---

## SMS Templates Available

The system includes these pre-built SMS templates:

1. **Appointment Reminder** - 24 hours before
2. **Reservation Confirmation** - After booking
3. **Welcome Message** - New customer
4. **Check-in Notification** - Pet checked in
5. **Check-out Notification** - Pet ready for pickup
6. **Marketing Messages** - Promotional campaigns

### Customize SMS Templates

Edit `/services/customer/src/services/sms.service.ts` to customize:
- Message content
- Timing
- Opt-out handling

---

## Cost Estimates

### SendGrid Pricing

| Plan | Price | Emails/Month |
|------|-------|--------------|
| Free | $0 | 100/day (3,000/month) |
| Essentials | $19.95/mo | 50,000 |
| Pro | $89.95/mo | 100,000 |

**Recommendation**: Start with Free plan, upgrade if you exceed 100 emails/day

### Twilio Pricing

| Item | Price |
|------|-------|
| Phone Number | $1.00/month |
| SMS (US) | $0.0079 per message |
| SMS (Canada) | $0.0075 per message |

**Example**: 1,000 SMS/month = $1 + (1,000 × $0.0079) = **$8.90/month**

**Recommendation**: Budget $15-20/month for moderate SMS usage

---

## Automated Notifications

Once configured, the system will automatically send:

### Email Notifications

- ✅ Reservation confirmations (immediate)
- ✅ Appointment reminders (24 hours before)
- ✅ Check-in confirmations
- ✅ Check-out notifications
- ✅ Status change updates
- ✅ Welcome emails for new customers

### SMS Notifications

- ✅ Appointment reminders (24 hours before)
- ✅ Reservation confirmations
- ✅ Check-in notifications
- ✅ Check-out notifications
- ✅ Marketing campaigns (manual)

---

## Troubleshooting

### SendGrid Issues

**Problem**: Emails not sending
- Check API key is correct
- Verify sender email is verified
- Check SendGrid dashboard for errors
- Look at PM2 logs: `pm2 logs customer-service`

**Problem**: Emails going to spam
- Complete domain authentication (not just single sender)
- Add SPF and DKIM records
- Warm up your sending reputation gradually

### Twilio Issues

**Problem**: SMS not sending
- Verify phone number format (+1234567890)
- Check Twilio account balance
- Verify phone number is SMS-enabled
- Check PM2 logs: `pm2 logs customer-service`

**Problem**: Trial account limitations
- Trial accounts can only send to verified numbers
- Upgrade to paid account for production use

---

## Security Best Practices

### 1. Protect API Keys

```bash
# Set proper file permissions
chmod 600 /opt/tailtown/services/customer/.env

# Never commit .env to git
# (already in .gitignore)
```

### 2. Use Environment-Specific Keys

- **Development**: Use test/sandbox keys
- **Production**: Use production keys
- **Never** mix them up

### 3. Rotate Keys Regularly

- Rotate SendGrid API keys every 90 days
- Rotate Twilio auth tokens every 90 days
- Update .env file and restart services

### 4. Monitor Usage

- Set up usage alerts in SendGrid dashboard
- Set up usage alerts in Twilio console
- Monitor for unusual activity

---

## Testing Checklist

Before going live, test each notification type:

### Email Tests

- [ ] Send test reservation confirmation
- [ ] Send test appointment reminder
- [ ] Send test welcome email
- [ ] Send test status change notification
- [ ] Verify emails arrive in inbox (not spam)
- [ ] Test on multiple email providers (Gmail, Outlook, Yahoo)

### SMS Tests

- [ ] Send test appointment reminder
- [ ] Send test reservation confirmation
- [ ] Send test check-in notification
- [ ] Send test check-out notification
- [ ] Verify SMS arrives on multiple carriers (AT&T, Verizon, T-Mobile)
- [ ] Test opt-out functionality (reply STOP)

---

## Quick Reference

### Environment Variables Needed

```bash
# SendGrid
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@canicloud.com
SENDGRID_FROM_NAME="Tailtown Pet Resort"

# Twilio
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1xxx
```

### Restart Command

```bash
pm2 restart customer-service
```

### Test Commands

```bash
# Test email
node -e "require('./dist/services/email.service').emailService.sendEmail({to:'test@example.com',subject:'Test',html:'<p>Test</p>'})"

# Test SMS
node -e "require('./dist/services/sms.service').smsService.sendSMS({to:'+1234567890',message:'Test'})"
```

---

## Support Resources

- **SendGrid Docs**: https://docs.sendgrid.com
- **Twilio Docs**: https://www.twilio.com/docs
- **Tailtown Support**: Check `/docs` folder for more guides

---

**Last Updated**: November 8, 2025  
**Status**: Ready for production configuration
