/**
 * Getting Started Help Content
 * Comprehensive guide for new users
 */

import { PageHelpContent } from '../../types/help';

export const gettingStartedHelp: PageHelpContent = {
  pageId: 'getting-started',
  pageName: 'Getting Started',
  overview: 'Welcome to Tailtown! This guide will help you get started with managing your pet resort efficiently. Learn the basics of navigating the system, managing customers and pets, creating reservations, and more.',
  
  articles: [
    {
      id: 'welcome-to-tailtown',
      title: 'Welcome to Tailtown Pet Resort',
      category: 'getting-started',
      tags: ['introduction', 'overview', 'basics'],
      content: `Welcome to Tailtown Pet Resort Management System!

Tailtown is designed to help you efficiently manage every aspect of your pet resort operations, from customer management to reservations, billing, and reporting.

## What You Can Do with Tailtown

• **Customer Management** - Keep detailed records of all your customers and their contact information
• **Pet Profiles** - Maintain comprehensive profiles for each pet including medical history, behavior notes, and dietary requirements
• **Reservations** - Easily book and manage boarding, daycare, grooming, and training services
• **Kennel Management** - Track availability and assign pets to appropriate accommodations
• **Billing & Payments** - Process payments and generate invoices automatically
• **Reports & Analytics** - Gain insights into your business performance with detailed reports
• **Staff Management** - Manage staff schedules and assignments

## Getting Help

Throughout the system, you'll find help icons (?) that provide contextual assistance. Click any help icon to learn more about that specific feature.

You can also:
• Press Ctrl+K (or Cmd+K on Mac) to open quick search
• Click the Help button in the top right corner
• Contact support at support@tailtown.com

Let's get started!`
    },
    {
      id: 'logging-in',
      title: 'Logging In to Tailtown',
      category: 'getting-started',
      tags: ['login', 'password', 'authentication', 'access'],
      content: `## How to Log In

1. Navigate to your Tailtown URL (e.g., yourresort.canicloud.com/login)
2. Enter your email address
3. Enter your password
4. Click "Sign In"

## First Time Login

If this is your first time logging in:
• Use the email and temporary password provided by your administrator
• You'll be prompted to change your password after first login
• Choose a strong password with at least 8 characters

## Forgot Your Password?

If you've forgotten your password:

1. Click "Forgot Password?" on the login page
2. Enter your email address
3. Check your email for a password reset link
4. Click the link and follow instructions to create a new password
5. Return to the login page and sign in with your new password

## Trouble Logging In?

If you're having trouble logging in:
• Make sure Caps Lock is off
• Check that you're using the correct email address
• Try resetting your password
• Clear your browser cache and cookies
• Try a different browser
• Contact your administrator or support@tailtown.com

## Security Tips

• Never share your password with anyone
• Use a unique password for Tailtown
• Log out when you're done, especially on shared computers
• Change your password regularly`
    },
    {
      id: 'dashboard-overview',
      title: 'Understanding Your Dashboard',
      category: 'getting-started',
      tags: ['dashboard', 'overview', 'metrics', 'navigation'],
      content: `## Dashboard Overview

The Dashboard is your command center - it's the first thing you see when you log in and provides a quick overview of your daily operations.

## Key Metrics

At the top of the dashboard, you'll see important metrics:

**Total Revenue** - Current month's revenue from all services
**Active Customers** - Number of customers with active or upcoming reservations
**Service Bookings** - Total number of bookings for the current month
**Add-On Revenue** - Revenue from additional services and extras

## Today's Schedule

The main section shows:
• **Upcoming Check-Ins** - Pets arriving today
• **Upcoming Check-Outs** - Pets leaving today
• **Current Occupancy** - How many kennels are occupied
• **Available Kennels** - Kennels ready for new guests

## Quick Actions

Use the sidebar menu to navigate to:
• **Boarding & Daycare** - Manage reservations
• **Grooming** - Schedule grooming appointments
• **Training** - Manage training sessions
• **Customers** - View and edit customer information
• **Pets** - Access pet profiles
• **Kennels** - Manage accommodations
• **Reports** - View analytics and reports

## Announcements

Check the announcements section for:
• Important updates from management
• System notifications
• Upcoming events or changes

## Customizing Your View

You can customize your dashboard:
• Use the date selector to view different days
• Filter by service type
• Sort by check-in time or customer name`
    },
    {
      id: 'adding-customers',
      title: 'Adding New Customers',
      category: 'getting-started',
      tags: ['customers', 'add', 'create', 'contact'],
      content: `## How to Add a New Customer

1. Click "Customers" in the sidebar menu
2. Click the "+ ADD NEW CUSTOMER" button
3. Fill in the customer information form
4. Click "Save"

## Required Information

You must provide:
• **First Name**
• **Last Name**
• **Email Address**
• **Phone Number**

## Optional but Recommended

Consider adding:
• **Address** - For emergency contact and billing
• **Secondary Phone** - Alternate contact number
• **Emergency Contact** - Name and phone of someone to call if customer is unreachable
• **Notes** - Any special information about the customer
• **Communication Preferences** - How they prefer to be contacted

## Tips for Customer Records

• **Double-check email addresses** - They're used for confirmations and receipts
• **Verify phone numbers** - Essential for quick communication
• **Add notes** - Document any special requests or preferences
• **Keep information current** - Encourage customers to update their info regularly

## After Adding a Customer

Once you've added a customer:
• You can immediately add their pets
• Create reservations for them
• View their complete profile
• Edit information as needed

## Searching for Customers

Use the search bar to find customers by:
• Name (first or last)
• Email address
• Phone number
• Pet name

## Customer Profile

Each customer profile includes:
• Contact information
• All pets associated with the customer
• Reservation history
• Payment history
• Notes and special instructions`
    },
    {
      id: 'adding-pets',
      title: 'Adding Pets to Customer Accounts',
      category: 'getting-started',
      tags: ['pets', 'add', 'create', 'profile', 'medical'],
      content: `## How to Add a Pet

There are two ways to add a pet:

**Method 1: From Customer Profile**
1. Open the customer's profile
2. Scroll to the "Pets" section
3. Click "Add Pet"
4. Fill in the pet information
5. Click "Save"

**Method 2: From Pets Page**
1. Click "Pets" in the sidebar
2. Click "+ ADD NEW PET"
3. Select the customer (or create a new one)
4. Fill in the pet information
5. Click "Save"

## Basic Information

Required fields:
• **Name** - Pet's name
• **Type** - Dog, Cat, or Other
• **Customer** - Who owns this pet

Recommended fields:
• **Breed** - Select from searchable dropdown
• **Age or Birthdate**
• **Weight** - Important for medication dosing
• **Gender** - Male, Female, or Unknown
• **Color/Markings** - Helps identify the pet

## Medical Information

Critical for safety:
• **Vaccination Status** - Upload vaccine records
• **Allergies** - Food, environmental, or medication allergies
• **Medical Conditions** - Chronic conditions or health issues
• **Medications** - Current medications and dosing instructions
• **Veterinarian** - Name and contact info of pet's vet

## Behavioral Information

Helps staff provide better care:
• **Temperament** - Friendly, shy, aggressive, etc.
• **Play Style** - Active, calm, social, solitary
• **Special Needs** - Any accommodations required
• **Behavior Notes** - Important behavioral information
• **Ideal Play Group** - Compatible with other pets?

## Dietary Information

Essential for feeding:
• **Food Type** - Brand and type of food
• **Feeding Schedule** - Times and amounts
• **Food Allergies** - What to avoid
• **Special Diet** - Any dietary restrictions
• **Treats** - What treats are allowed

## Photos

Upload a photo to help staff identify the pet:
• Click "Upload Photo" or drag and drop
• Use a clear, recent photo
• Shows the pet's face and markings
• Helps prevent mix-ups

## After Adding a Pet

Once added, you can:
• Create reservations for the pet
• Update medical records
• Add vaccination certificates
• Track the pet's stay history
• Add notes about each visit`
    },
    {
      id: 'creating-reservations',
      title: 'Creating Your First Reservation',
      category: 'getting-started',
      tags: ['reservations', 'booking', 'check-in', 'services'],
      content: `## How to Create a Reservation

1. Click "Boarding & Daycare" in the sidebar
2. Click "+ NEW RESERVATION"
3. Follow the reservation wizard

## Step 1: Select Customer

• Search for an existing customer by name, email, or phone
• Or click "Add New Customer" to create one

## Step 2: Select Pet(s)

• Choose which pet(s) this reservation is for
• You can select multiple pets for the same dates
• Or click "Add New Pet" if needed

## Step 3: Choose Dates

• **Check-In Date & Time** - When the pet arrives
• **Check-Out Date & Time** - When the pet leaves
• The system will show you the total number of days/nights

## Step 4: Select Service Type

Choose the appropriate service:
• **Boarding** - Overnight stays
• **Day Camp** - Daytime care only (no overnight)
• **Training** - Training sessions
• **Grooming** - Grooming services

## Step 5: Choose Accommodation

• **Auto-Assign** - Let the system choose the best available kennel
• **Manual Selection** - Choose a specific kennel or suite
• The system shows only available accommodations for your dates

## Step 6: Add Services & Extras

Optional add-ons:
• Extra playtime
• Grooming services
• Special treats
• Medication administration
• Training sessions
• Photos/videos

## Step 7: Review & Confirm

Before creating the reservation:
• Review all details carefully
• Check the total price
• Verify dates and times
• Confirm the pet's information is current
• Check vaccination requirements

## Step 8: Create Reservation

Click "Create Reservation" to finalize.

The reservation is now in the system and will appear on:
• The dashboard
• The calendar
• The customer's profile
• The pet's profile

## After Creating a Reservation

You can:
• Email confirmation to the customer
• Print a reservation summary
• Modify dates or services if needed
• Process a deposit payment
• Add notes or special instructions

## Reservation Status

Reservations can have different statuses:
• **Pending** - Awaiting confirmation or payment
• **Confirmed** - Confirmed and paid
• **Checked In** - Pet has arrived
• **Checked Out** - Pet has left
• **Cancelled** - Reservation was cancelled

## Tips for Reservations

• **Book early** - Especially during holidays
• **Verify vaccinations** - Before check-in date
• **Communicate** - Send confirmation emails
• **Add notes** - Document special requests
• **Check availability** - Before promising dates to customers`
    },
    {
      id: 'check-in-process',
      title: 'Check-In Process',
      category: 'getting-started',
      tags: ['check-in', 'arrival', 'process', 'verification'],
      content: `## Check-In Overview

The check-in process ensures you have all necessary information and items before the pet's stay begins.

## Before Check-In

Prepare by:
• Reviewing the reservation details
• Verifying vaccination records are current
• Checking for any special instructions
• Ensuring the assigned kennel is ready

## Check-In Steps

**Step 1: Find the Reservation**
• Go to Boarding & Daycare
• Search by customer name or pet name
• Or view today's check-ins on the dashboard

**Step 2: Click "Check In"**
• Opens the check-in form
• Shows all reservation details

**Step 3: Verify Pet Information**
• Confirm the pet matches the description
• Check ID tags or microchip if needed
• Verify weight (update if changed significantly)

**Step 4: Review Medical Information**
• Check vaccination records
• Verify all vaccines are current
• Note any new medical conditions
• Confirm current medications

**Step 5: Document Items**
Record what the customer brought:
• Food (type and amount)
• Medications
• Toys or comfort items
• Bedding
• Special equipment

**Step 6: Review Special Instructions**
• Feeding schedule
• Medication administration
• Exercise requirements
• Behavioral notes
• Emergency contacts

**Step 7: Collect Payment**
• Process deposit if not already paid
• Or collect full payment
• Provide receipt

**Step 8: Complete Check-In**
• Click "Complete Check-In"
• Reservation status changes to "Checked In"
• Pet is now in your care

## After Check-In

• Escort pet to assigned kennel
• Update kennel status to "Occupied"
• Note check-in time in system
• Brief staff about any special needs

## Check-In Checklist

Use this checklist for every check-in:
☐ Verify pet identity
☐ Check vaccination records
☐ Review medical history
☐ Document brought items
☐ Confirm feeding instructions
☐ Note medication schedule
☐ Collect payment
☐ Update system status
☐ Assign to kennel
☐ Brief staff

## Common Check-In Issues

**Expired Vaccinations**
• Don't accept the pet until vaccines are current
• Offer to reschedule or refer to a vet

**Missing Information**
• Get customer's phone number to call for details
• Document what's missing

**Behavioral Concerns**
• Note any aggressive or fearful behavior
• Adjust kennel assignment if needed
• Brief staff immediately

**Payment Issues**
• Have clear payment policies
• Require deposit or full payment at check-in
• Don't release pet at checkout without payment`
    },
    {
      id: 'check-out-process',
      title: 'Check-Out Process',
      category: 'getting-started',
      tags: ['check-out', 'departure', 'payment', 'receipt'],
      content: `## Check-Out Overview

The check-out process ensures the customer receives their pet safely and all charges are settled.

## Before Check-Out

Prepare by:
• Reviewing the pet's stay notes
• Calculating final charges
• Preparing the pet for departure
• Gathering the customer's belongings

## Check-Out Steps

**Step 1: Find the Reservation**
• Go to Boarding & Daycare
• Search by customer name or pet name
• Or view today's check-outs on the dashboard

**Step 2: Click "Check Out"**
• Opens the check-out form
• Shows stay summary and charges

**Step 3: Review Stay Summary**
• Number of nights/days
• Services provided
• Any incidents or notes
• Overall behavior during stay

**Step 4: Calculate Final Charges**
The system automatically calculates:
• Base service charges
• Add-on services used
• Any additional charges
• Discounts applied
• Taxes
• Total amount due

**Step 5: Add Additional Charges (if any)**
• Extra days (late pickup)
• Additional services used
• Damage fees (if applicable)
• Medication administration
• Special care charges

**Step 6: Process Payment**
• Show customer the itemized bill
• Process payment (credit card, cash, check)
• Apply any credits or deposits
• Print receipt

**Step 7: Return Belongings**
• Food (if any remaining)
• Medications
• Toys and comfort items
• Bedding
• Special equipment

**Step 8: Share Stay Report**
• How the pet behaved
• Eating and bathroom habits
• Activity level
• Any concerns or recommendations
• Photos or videos (if available)

**Step 9: Complete Check-Out**
• Click "Complete Check-Out"
• Reservation status changes to "Checked Out"
• Kennel becomes available
• Pet is released to customer

## After Check-Out

• Update kennel status to "Available" or "Needs Cleaning"
• Clean and prepare kennel for next guest
• File any important notes in pet's profile
• Send follow-up email if desired

## Check-Out Checklist

Use this checklist for every check-out:
☐ Review stay summary
☐ Calculate final charges
☐ Process payment
☐ Print receipt
☐ Return all belongings
☐ Share stay report
☐ Answer customer questions
☐ Update system status
☐ Mark kennel for cleaning
☐ Schedule next visit (if applicable)

## Common Check-Out Issues

**Late Pickup**
• Charge late pickup fees per your policy
• Document the time
• Ensure staff availability

**Payment Disputes**
• Show itemized charges
• Explain each line item
• Have manager review if needed
• Document resolution

**Missing Items**
• Check kennel thoroughly
• Review check-in inventory
• Document and follow up

**Customer Concerns**
• Listen carefully
• Document the concern
• Offer solutions
• Follow up after resolution

## Tips for Smooth Check-Outs

• **Be prepared** - Have everything ready before customer arrives
• **Communicate clearly** - Explain charges and stay details
• **Be positive** - Share good news about the pet's stay
• **Book next visit** - Ask about future reservations
• **Request feedback** - Ask how their experience was`
    },
    {
      id: 'keyboard-shortcuts',
      title: 'Keyboard Shortcuts & Quick Tips',
      category: 'getting-started',
      tags: ['shortcuts', 'tips', 'efficiency', 'productivity'],
      content: `## Keyboard Shortcuts

Speed up your workflow with these shortcuts:

### Global Shortcuts
• **Ctrl/Cmd + K** - Quick search (customers, pets, reservations)
• **Ctrl/Cmd + /** - Open help
• **Ctrl/Cmd + N** - New reservation (from Boarding page)
• **Esc** - Close dialogs and modals

### Navigation
• **Alt + 1** - Go to Dashboard
• **Alt + 2** - Go to Boarding & Daycare
• **Alt + 3** - Go to Customers
• **Alt + 4** - Go to Pets

### Forms
• **Tab** - Move to next field
• **Shift + Tab** - Move to previous field
• **Enter** - Submit form (when button is focused)
• **Esc** - Cancel and close form

## Quick Tips

### Search Like a Pro
• Use partial names (e.g., "John" finds "John Smith")
• Search by phone number for quick lookup
• Use pet names to find their owners
• Filter results by date range

### Efficient Data Entry
• Use Tab to move between fields quickly
• Copy/paste customer info when adding multiple pets
• Use keyboard shortcuts instead of mouse clicks
• Save frequently used notes as templates

### Stay Organized
• Review dashboard every morning
• Process check-ins as soon as pets arrive
• Update notes immediately after incidents
• Clean up completed reservations regularly

### Communication Best Practices
• Send confirmation emails for all bookings
• Follow up after check-out
• Document all customer conversations
• Keep emergency contacts updated

### Time-Saving Features
• Use auto-assign for kennel selection
• Set up default service packages
• Create customer groups for bulk emails
• Use filters to find specific reservations quickly

### Mobile Usage
• Tailtown works on tablets and phones
• Use mobile for quick check-ins
• Take photos with your phone camera
• Access from anywhere with internet

### Reporting
• Run reports at month-end
• Export data to Excel for analysis
• Track trends over time
• Share reports with management

## Pro Tips from Experienced Users

**Tip 1: Morning Routine**
Start each day by:
1. Checking today's check-ins and check-outs
2. Reviewing any special instructions
3. Verifying staff assignments
4. Checking kennel availability

**Tip 2: Keep Notes Detailed**
Document:
• Behavioral observations
• Eating and bathroom habits
• Any incidents or concerns
• Positive interactions
• Customer requests

**Tip 3: Use Tags and Categories**
• Tag VIP customers
• Mark pets with special needs
• Categorize by service type
• Flag urgent items

**Tip 4: Batch Similar Tasks**
• Process all check-ins together
• Do all check-outs at once
• Update multiple records simultaneously
• Send bulk communications

**Tip 5: Regular Maintenance**
• Update vaccination records promptly
• Archive old reservations
• Clean up duplicate entries
• Verify contact information quarterly

## Getting Faster

As you use Tailtown more, you'll:
• Memorize common workflows
• Develop your own shortcuts
• Find features that save time
• Become more efficient

Practice these tips and shortcuts to become a Tailtown power user!`
    }
  ],
  
  tooltips: {
    'help-button': {
      id: 'help-button',
      title: 'Help Center',
      description: 'Click to open the help center and search for articles, or press Ctrl+K for quick search.',
      learnMoreArticleId: 'welcome-to-tailtown'
    }
  }
};
