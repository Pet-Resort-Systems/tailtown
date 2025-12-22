# Dashboard Date Filtering - Implementation Notes

## Overview

This document describes the dashboard's date filtering implementation and the fixes applied to ensure accurate display of today's check-ins and check-outs.

---

## Architecture

### Data Flow

1. **API Call**: Fetch all active reservations (no server-side date filtering)
2. **Client-Side Filtering**: Filter by check-in/check-out dates using UTC comparison
3. **Display**: Show filtered results based on user's selected tab

### Why Client-Side Filtering?

**Problem with Server-Side Filtering**:

- Original implementation used `date` parameter in API call
- This excluded reservations starting "today" due to date range logic
- Server-side filtering was too restrictive for dashboard needs

**Benefits of Client-Side Filtering**:

- ✅ Get all active reservations in one call
- ✅ Filter instantly without API calls
- ✅ Accurate UTC date comparisons
- ✅ Flexible filtering (check-ins, check-outs, all)
- ✅ Better performance (single API call)

---

## Implementation Details

### API Call

```typescript
// Fetch all active reservations (up to 250)
const [reservationsResponse, revenueResponse] = await Promise.all([
  reservationService.getAllReservations(
    1,
    250,
    "startDate",
    "asc",
    activeStatuses
  ),
  reservationService.getTodayRevenue(),
]);
```

**Parameters**:

- `page`: 1
- `limit`: 250 (sufficient for daily operations)
- `sortBy`: 'startDate'
- `sortOrder`: 'asc'
- `status`: 'PENDING,CONFIRMED,CHECKED_IN,CHECKED_OUT,COMPLETED,NO_SHOW'
- `date`: **NOT USED** (removed to get all reservations)

### Date Comparison Logic

```typescript
// Check-ins: Reservations starting today
const checkIns = reservations.filter((res: any) => {
  const startDate = new Date(res.startDate);
  const startDateStr = `${startDate.getUTCFullYear()}-${String(
    startDate.getUTCMonth() + 1
  ).padStart(2, "0")}-${String(startDate.getUTCDate()).padStart(2, "0")}`;
  return startDateStr === formattedToday;
}).length;

// Check-outs: Reservations ending today
const checkOuts = reservations.filter((res: any) => {
  const endDate = new Date(res.endDate);
  const endDateStr = `${endDate.getUTCFullYear()}-${String(
    endDate.getUTCMonth() + 1
  ).padStart(2, "0")}-${String(endDate.getUTCDate()).padStart(2, "0")}`;
  return endDateStr === formattedToday;
}).length;

// Overnight: Reservations that started before today and end on/after today
const overnight = reservations.filter((res: any) => {
  const startDate = new Date(res.startDate);
  const endDate = new Date(res.endDate);
  const startDateStr = `${startDate.getUTCFullYear()}-${String(
    startDate.getUTCMonth() + 1
  ).padStart(2, "0")}-${String(startDate.getUTCDate()).padStart(2, "0")}`;
  const endDateStr = `${endDate.getUTCFullYear()}-${String(
    endDate.getUTCMonth() + 1
  ).padStart(2, "0")}-${String(endDate.getUTCDate()).padStart(2, "0")}`;
  return startDateStr < formattedToday && endDateStr >= formattedToday;
}).length;
```

**Key Points**:

- Uses `getUTCFullYear()`, `getUTCMonth()`, `getUTCDate()` for timezone consistency
- Compares dates as `YYYY-MM-DD` strings
- Handles all edge cases (midnight, end-of-day, etc.)

---

## Default Behavior

### Initial Display

When the dashboard loads:

1. **Resets date to today** (prevents date picker persistence issues)
2. Fetches all active reservations for selected date
3. Calculates metrics (In, Out, Overnight)
4. **Defaults to showing Check-Ins tab**
5. Filters reservations to show only today's check-ins

### Date Picker Behavior

**Automatic Reset to Today**:

- When navigating back to dashboard from another page
- When browser window/tab regains focus
- Prevents confusion from stale date selections

**User Can Still**:

- Select future dates for planning (e.g., print labels for tomorrow)
- Navigate between dates using arrow buttons
- Use "Today" button to quickly return to current date

### Filter Options

**Check-Ins Tab** (Default):

- Shows reservations where `startDate` = today (UTC)
- Displays "Check-In" button for CONFIRMED reservations
- Focused on today's arrivals

**Check-Outs Tab**:

- Shows reservations where `endDate` = today (UTC)
- Displays status chip
- Focused on today's departures

**All Tab**:

- Shows all fetched reservations
- No date filtering
- Displays status chip

---

## User Experience

### Dashboard Flow

1. **User opens dashboard**

   - Sees today's check-ins by default
   - Metric cards show: In (4), Out (2), Overnight (12)
   - List shows 4 reservations with check-in buttons

2. **User clicks "Check-Outs" button**

   - Instantly filters to show check-outs
   - No API call needed
   - Shows 2 reservations ending today

3. **User clicks "All" button**

   - Shows all active reservations
   - Useful for overview of operations

4. **User clicks check-in button (✓)**
   - Navigates to `/check-in/:reservationId`
   - Starts 5-step check-in workflow

---

## Performance Considerations

### Optimization Strategies

**Single API Call**:

- Fetch 250 reservations once
- Cache in component state
- Filter client-side for instant updates

**Efficient Filtering**:

- Simple string comparison
- No complex date math
- Memoized filter function

**Auto-Refresh**:

- Refreshes on window focus
- Ensures data stays current
- Uses same efficient fetch strategy

### Scalability

**Current Limit**: 250 reservations

- Sufficient for most daily operations
- Typical pet resort: 50-100 daily reservations

**If Needed**:

- Increase limit to 500 or 1000
- Add pagination for very large operations
- Consider server-side date filtering for specific date ranges

---

## Testing

### Test Coverage

**Timezone Tests**:

- ✅ Check-ins at midnight UTC
- ✅ Check-outs at 23:59:59 UTC
- ✅ Reservations crossing timezone boundaries
- ✅ UTC consistency across all calculations

**Filtering Tests**:

- ✅ Filter by check-ins
- ✅ Filter by check-outs
- ✅ Filter by all
- ✅ Default to check-ins on load

**API Tests**:

- ✅ Verify no date parameter in API call
- ✅ Verify correct status filtering
- ✅ Verify pagination parameters

---

## Troubleshooting

### Common Issues

**Issue**: Check-ins not showing
**Cause**: Reservations have timestamps that don't match today's UTC date
**Solution**: Verify reservation `startDate` is in UTC format

**Issue**: Wrong reservations showing
**Cause**: Timezone mismatch between local and UTC
**Solution**: Always use UTC methods for date comparison

**Issue**: Performance slow with many reservations
**Cause**: Fetching too many reservations
**Solution**: Adjust limit or add server-side filtering

---

## Future Enhancements

### Potential Improvements

1. **Date Range Selector**

   - Allow viewing check-ins for specific dates
   - Useful for planning ahead

2. **Service Type Filtering**

   - Filter by boarding, grooming, training
   - Show only relevant reservations

3. **Search Functionality**

   - Search by pet name, customer name
   - Quick access to specific reservations

4. **Bulk Actions**
   - Check in multiple pets at once
   - Useful for busy mornings

---

## Related Documentation

- [Timezone Handling Best Practices](./timezone-handling.md)
- [Dashboard Component](../../frontend/src/pages/Dashboard.tsx)
- [useDashboardData Hook](../../frontend/src/hooks/useDashboardData.ts)
- [ReservationList Component](../../frontend/src/components/dashboard/ReservationList.tsx)

---

## Changelog

### December 21, 2025

- **Fixed**: Date picker now resets to today when navigating back to dashboard
- **Fixed**: Prevents conflicting date information (date picker showing future date while data loads for today)
- **Added**: Component-level date reset on Dashboard mount
- **Added**: Window focus date reset for tab switching scenarios
- **Improved**: User experience when returning to dashboard after viewing future dates

### October 23, 2025

- **Fixed**: Removed server-side date filtering from API call
- **Fixed**: Dashboard now shows all active reservations
- **Fixed**: Client-side filtering for accurate check-in/check-out display
- **Added**: Check-in button for CONFIRMED reservations
- **Added**: Default to check-ins tab on load
- **Improved**: UTC date handling for timezone consistency
