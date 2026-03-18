# Base Calendar Components

This directory contains base calendar components and hooks that can be used to create specialized calendar views.

## Components and Hooks

### `BaseCalendar`

A reusable calendar component that wraps FullCalendar with common functionality.

#### Usage

```jsx
import { BaseCalendar } from '../components/calendar/base';

const MyCalendar = () => {
  const handleDateSelect = (selectInfo) => {
    // Handle date selection
  };

  const handleEventClick = (clickInfo) => {
    // Handle event click
  };

  return (
    <BaseCalendar
      calendarTitle="My Calendar"
      serviceCategories={['GROOMING']}
      initialView="timeGridWeek"
      onDateSelect={handleDateSelect}
      onEventClick={handleEventClick}
    />
  );
};
```

### `useCalendarEvents`

A hook for loading and managing calendar events.

#### Usage

```jsx
import { useCalendarEvents } from '../components/calendar/base';

const MyComponent = () => {
  const {
    events,
    loading,
    error,
    refreshEvents
  } = useCalendarEvents({
    serviceCategories: ['GROOMING'],
    initialDate: new Date()
  });

  // Use events, loading, error, and refreshEvents
};
```

### `useReservationForm`

A hook for managing reservation forms.

#### Usage

```jsx
import { useReservationForm } from '../components/calendar/base';

const MyComponent = () => {
  const {
    isFormOpen,
    selectedReservation,
    selectedDate,
    loading,
    error,
    openNewReservationForm,
    openEditReservationForm,
    closeForm,
    handleFormSubmit
  } = useReservationForm({
    onReservationChange: (reservation) => {
      // Handle reservation change
    },
    closeOnSubmit: true,
    showAddOns: true
  });

  // Use form state and handlers
};
```

## Types

### `ViewType`

Defines the available calendar view types:

```typescript
type ViewType = 'month' | 'week' | 'day';
```

### `CalendarEvent`

Defines the structure of a calendar event:

```typescript
interface CalendarEvent extends EventInput {
  id: string;
  title: string;
  start: Date | string;
  end: Date | string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps: {
    reservation: Reservation;
    [key: string]: any;
  };
}
```

### `BaseCalendarProps`

Defines the props for the BaseCalendar component:

```typescript
interface BaseCalendarProps {
  serviceCategories?: string[];
  calendarTitle?: string;
  initialView?: ViewType;
  initialDate?: Date;
  showWeekends?: boolean;
  showHeader?: boolean;
  allowEventCreation?: boolean;
  allowEventEditing?: boolean;
  allowEventDeletion?: boolean;
  eventRender?: (info: any) => React.ReactNode;
  onEventChange?: (reservation: Reservation) => void;
  onDateSelect?: (selectInfo: DateSelectArg) => void;
  onEventClick?: (clickInfo: EventClickArg) => void;
}
```

## Integration Example

Here's an example of how to use these components to create a specialized calendar:

```jsx
import React, { useState } from 'react';
import { 
  BaseCalendar, 
  useCalendarEvents, 
  useReservationForm 
} from '../components/calendar/base';
import { Dialog, DialogTitle, DialogContent } from '@mui/material';
import ReservationForm from '../components/reservations/ReservationForm';

const GroomingCalendar = () => {
  // Use calendar events hook
  const { events, loading, error, refreshEvents } = useCalendarEvents({
    serviceCategories: ['GROOMING'],
    initialDate: new Date()
  });
  
  // Use reservation form hook
  const {
    isFormOpen,
    selectedReservation,
    selectedDate,
    openNewReservationForm,
    openEditReservationForm,
    closeForm,
    handleFormSubmit
  } = useReservationForm({
    onReservationChange: refreshEvents,
    closeOnSubmit: true
  });
  
  // Event handlers
  const handleDateSelect = (selectInfo) => {
    openNewReservationForm({
      start: selectInfo.start,
      end: selectInfo.end
    });
  };
  
  const handleEventClick = (clickInfo) => {
    openEditReservationForm(clickInfo.event.id);
  };
  
  return (
    <>
      <BaseCalendar
        calendarTitle="Grooming Calendar"
        serviceCategories={['GROOMING']}
        onDateSelect={handleDateSelect}
        onEventClick={handleEventClick}
      />
      
      <Dialog 
        open={isFormOpen} 
        onClose={closeForm}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedReservation ? 'Edit Reservation' : 'Create New Reservation'}
        </DialogTitle>
        <DialogContent>
          {selectedDate && (
            <ReservationForm
              onSubmit={handleFormSubmit}
              initialData={selectedReservation || undefined}
              defaultDates={selectedDate}
              serviceCategories={['GROOMING']}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GroomingCalendar;
```
