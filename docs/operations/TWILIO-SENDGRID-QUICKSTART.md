# Twilio & SendGrid Quick Start

**⏱️ Setup Time**: 15-20 minutes  
**💰 Cost**: ~$20-30/month for moderate usage

---

## ✅ What's Already Done

Your system already has:
- ✅ Twilio SDK installed and configured
- ✅ SendGrid SDK installed and configured
- ✅ 6 email templates ready to use
- ✅ 6 SMS templates ready to use
- ✅ Graceful fallback (logs messages when not configured)

**You just need to add API keys!**

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Get SendGrid API Key (5 minutes)

1. Go to [SendGrid.com](https://sendgrid.com) → Sign up (free)
2. Settings → Sender Authentication → Verify Single Sender
3. Settings → API Keys → Create API Key → Copy it

### Step 2: Get Twilio Credentials (5 minutes)

1. Go to [Twilio.com](https://www.twilio.com) → Sign up (free trial)
2. Buy a phone number (~$1/month)
3. Copy Account SID and Auth Token from dashboard

### Step 3: Add to Server (5 minutes)

```bash
# SSH into server
ssh -i ~/ttkey root@129.212.178.244

# Edit environment file
nano /opt/tailtown/apps/customer-service/.env

# Add these lines:
SENDGRID_API_KEY=SG.xxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@canicloud.com
SENDGRID_FROM_NAME="Tailtown Pet Resort"

TWILIO_ACCOUNT_SID=ACxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Save and exit (Ctrl+X, Y, Enter)

# Restart service
pm2 restart customer-service

# Test it
pnpm run test:notifications
```

---

## 📧 Email Templates Included

1. **Reservation Confirmation** - Professional HTML email with booking details
2. **Appointment Reminder** - Sent 24 hours before with what to bring
3. **Check-in Notification** - "Your pet has been checked in!"
4. **Check-out Notification** - "Your pet is ready for pickup!"
5. **Status Changes** - Cancellations, updates, etc.
6. **Welcome Email** - Sent to new customers

---

## 📱 SMS Templates Included

1. **Appointment Reminder** - "Hi! Reminder: Fluffy has grooming tomorrow at 2pm"
2. **Reservation Confirmation** - "Your boarding reservation is confirmed!"
3. **Check-in** - "Fluffy has been checked in! Have a great day!"
4. **Check-out** - "Fluffy is ready for pickup!"
5. **Welcome Message** - "Welcome to Tailtown!"
6. **Marketing** - For promotional campaigns

---

## 💰 Pricing

### SendGrid
- **Free**: 100 emails/day (3,000/month)
- **Paid**: $19.95/mo for 50,000 emails

### Twilio
- **Phone Number**: $1/month
- **SMS**: $0.0079 per message
- **Example**: 1,000 SMS/month = $8.90/month

**Total**: ~$10-30/month depending on usage

---

## 🧪 Testing

```bash
# Test both services
pnpm run test:notifications

# Or test manually
cd /opt/tailtown/apps/customer-service

# Test email
node -e "require('./dist/services/email.service').emailService.sendEmail({to:'your@email.com',subject:'Test',html:'<p>It works!</p>'})"

# Test SMS
node -e "require('./dist/services/sms.service').smsService.sendSMS({to:'+1234567890',message:'Test from Tailtown!'})"
```

---

## 🎯 What Happens Automatically

Once configured, the system automatically sends:

**Emails:**
- ✅ Confirmation when booking is made
- ✅ Reminder 24 hours before appointment
- ✅ Check-in/check-out notifications
- ✅ Status change updates
- ✅ Welcome email for new customers

**SMS:**
- ✅ Reminder 24 hours before appointment
- ✅ Confirmation after booking
- ✅ Check-in/check-out notifications

---

## 🔒 Security

Your API keys are:
- ✅ Stored in `.env` file (not in code)
- ✅ Never committed to git
- ✅ Protected by file permissions
- ✅ Only accessible by root user

---

## 📖 Full Documentation

For detailed instructions, see:
- **Complete Guide**: `docs/TWILIO-SENDGRID-SETUP.md`
- **Troubleshooting**: Included in complete guide
- **Customization**: Edit templates in `apps/customer-service/src/services/`

---

## ❓ Need Help?

**SendGrid Issues:**
- Check sender email is verified
- Verify API key has "Mail Send" permission
- Check SendGrid dashboard for errors

**Twilio Issues:**
- Verify phone number format: `+1234567890`
- Check account balance
- Trial accounts only send to verified numbers

**Still stuck?**
- Check PM2 logs: `pm2 logs customer-service`
- Review full guide: `docs/TWILIO-SENDGRID-SETUP.md`

---

**Ready to go live?** Just add your API keys and restart! 🚀
