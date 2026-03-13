/**
 * Dashboard Help Content
 * Help articles and tooltips for the Dashboard page
 */

import { PageHelpContent } from '../../types/help';

export const dashboardHelp: PageHelpContent = {
  pageId: 'dashboard',
  pageName: 'Dashboard',
  overview: 'The Dashboard provides a quick overview of your daily operations, including check-ins, check-outs, and current occupancy. Use the date selector to view different days.',
  
  articles: [
    {
      id: 'dashboard-overview',
      title: 'Understanding Your Dashboard',
      category: 'getting-started',
      tags: ['dashboard', 'overview', 'basics'],
      content: `The Dashboard is your command center for daily operations at Tailtown Pet Resort.

Key Features:
• Today's Metrics: View check-ins, check-outs, and overnight guests at a glance
• Quick Actions: Access frequently used features like creating reservations
• Date Navigation: Use the date picker to view past or future days
• Real-time Updates: Data refreshes automatically to show current status

The dashboard is designed to give you everything you need to start your day efficiently.`
    },
    {
      id: 'dashboard-metrics',
      title: 'Dashboard Metrics Explained',
      category: 'getting-started',
      tags: ['metrics', 'statistics', 'reporting'],
      content: `Understanding the numbers on your dashboard:

Check-Ins Today:
Shows the number of pets scheduled to arrive today. This includes both new arrivals and pets returning from previous stays.

Check-Outs Today:
Displays pets scheduled to depart today. Use this to prepare for pickups and final billing.

Overnight Guests:
The total number of pets staying at your facility tonight. This helps with staffing and resource planning.

Total Reservations:
All active reservations for the selected date, including daycare, boarding, and grooming appointments.

These metrics update in real-time as you create, modify, or complete reservations.`,
      relatedArticles: ['dashboard-overview', 'dashboard-date-selector']
    },
    {
      id: 'dashboard-date-selector',
      title: 'Using the Date Selector',
      category: 'getting-started',
      tags: ['date', 'navigation', 'calendar'],
      content: `The date selector allows you to view dashboard data for any date:

How to Use:
1. Click on the date field at the top of the dashboard
2. Select a date from the calendar picker
3. The dashboard will update to show data for that date

Quick Navigation:
• Use the arrow buttons to move forward or backward one day
• Click "Today" to return to the current date
• The selected date is highlighted in blue

This is useful for:
• Planning future operations
• Reviewing past activity
• Preparing for busy periods
• Checking historical data`,
      relatedArticles: ['dashboard-metrics']
    },
    {
      id: 'dashboard-quick-actions',
      title: 'Quick Actions Guide',
      category: 'reservations',
      tags: ['quick actions', 'shortcuts', 'efficiency'],
      content: `Quick Actions provide fast access to common tasks:

Available Actions:
• New Reservation: Create a new booking in seconds
• Check In: Process arrivals quickly
• Check Out: Complete departures and billing
• View Calendar: Jump to the full calendar view

Using Quick Actions:
1. Click the action button you need
2. Complete the required information
3. Save to update your records

These shortcuts save time during busy periods and keep your workflow smooth.`,
      relatedArticles: ['dashboard-overview']
    }
  ],

  tooltips: {
    'check-ins-metric': {
      id: 'check-ins-metric',
      title: 'Check-Ins Today',
      description: 'Number of pets scheduled to arrive today. Click to see the full list of incoming guests.',
      learnMoreArticleId: 'dashboard-metrics'
    },
    'check-outs-metric': {
      id: 'check-outs-metric',
      title: 'Check-Outs Today',
      description: 'Number of pets scheduled to depart today. Prepare for pickups and final billing.',
      learnMoreArticleId: 'dashboard-metrics'
    },
    'overnight-metric': {
      id: 'overnight-metric',
      title: 'Overnight Guests',
      description: 'Total pets staying at your facility tonight. Use this for staffing and resource planning.',
      learnMoreArticleId: 'dashboard-metrics'
    },
    'date-selector': {
      id: 'date-selector',
      title: 'Date Selector',
      description: 'View dashboard data for any date. Use arrows for quick navigation or click to open the calendar.',
      learnMoreArticleId: 'dashboard-date-selector'
    }
  }
};
