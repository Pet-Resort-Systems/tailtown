# Kennel Calendar

## Overview

The Kennel Calendar is a specialized grid-based view designed for managing boarding and daycare reservations in the Tailtown application. It provides a visual representation of kennel availability and occupancy, allowing staff to efficiently manage reservations across multiple kennels.

## Features

### Layout and Organization
- **Grid-based view**: Displays kennels in rows and days in columns
- **Kennel grouping**: Kennels are organized by type (VIP, Standard Plus, Standard)
- **Compact design**: Optimized to minimize scrolling and maximize information density
- **Responsive layout**: Adapts to different screen sizes while maintaining usability

### Reservation Management
- **Visual indicators**: Color-coded cells show reservation status at a glance
- **Quick creation**: Click on empty cells to create new reservations
- **Easy editing**: Click on occupied cells to edit existing reservations
- **Multi-day support**: Reservations spanning multiple days are visually connected

### Navigation and Filtering
- **Date navigation**: Easily move between days, weeks, and months
- **View options**: Toggle between day, week, and month views
- **Kennel filtering**: Filter by kennel type (VIP, Standard Plus, Standard)
- **Today shortcut**: Quickly navigate to the current date

## Technical Implementation

### Component Structure
- `KennelCalendar.tsx`: Main component that renders the calendar grid
- `CalendarPage.tsx`: Parent component that integrates the calendar into the application
- `ReservationForm.tsx`: Form component for creating and editing reservations

### Key Functions
- `loadKennels()`: Fetches and sorts kennels by type and number
- `loadReservations()`: Retrieves reservations for the displayed date range
- `isKennelOccupied()`: Determines if a kennel is occupied on a specific date
- `handleCellClick()`: Manages interactions when a cell is clicked
- `getStatusColor()`: Returns the appropriate color for reservation status

### Data Flow
1. Calendar loads kennels and groups them by type
2. Reservations are fetched for the visible date range
3. Each cell checks if its kennel is occupied on its date
4. Clicking a cell opens the reservation form with pre-filled data
5. Form submission updates the calendar view

## Usage Guide

### Creating a New Reservation
1. Navigate to the desired date using the calendar controls
2. Click on an available kennel cell (marked with a bullet point)
3. Fill out the reservation details in the form
4. Click "Create Reservation" to save

### Editing an Existing Reservation
1. Locate the reservation in the calendar grid
2. Click on the occupied cell to open the edit form
3. Modify the reservation details as needed
4. Click "Update Reservation" to save changes

### Navigating the Calendar
- Use the left and right arrows to move between time periods
- Click the "Today" button to return to the current date
- Use the view type icons to switch between day, week, and month views
- Use the kennel type dropdown to filter kennels by type

## Design Considerations

### UI Optimizations
- Removed unnecessary information to reduce vertical space
- Used compact styling for status indicators and text
- Implemented proper container sizing to eliminate double scrollbars
- Applied flex layout to maximize available space

### Performance Improvements
- Implemented memoization for expensive calculations
- Optimized API calls to reduce data transfer
- Used efficient data structures for quick lookups
- Applied proper TypeScript typing for code reliability

## Future Enhancements

Potential improvements for future iterations:
- Drag-and-drop functionality for moving reservations
- Batch operations for multiple reservations
- Advanced filtering options (by pet, customer, etc.)
- Printable view for physical records
- Integration with notification system for reminders

## GitHub Repository

The Kennel Calendar implementation is available in the [Tailtown GitHub repository](https://github.com/moosecreates/tailtown).

Key files:
- [KennelCalendar.tsx](https://github.com/moosecreates/tailtown/blob/main/apps/frontend/src/components/calendar/KennelCalendar.tsx)
- [CalendarPage.tsx](https://github.com/moosecreates/tailtown/blob/main/apps/frontend/src/pages/calendar/CalendarPage.tsx)
- [ReservationForm.tsx](https://github.com/moosecreates/tailtown/blob/main/apps/frontend/src/components/reservations/ReservationForm.tsx)
