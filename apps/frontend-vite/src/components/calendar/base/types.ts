import React from 'react';
import { EventInput, DateSelectArg, EventClickArg } from '@fullcalendar/core';
import { Reservation } from '../../../services/reservationService';

/**
 * Common calendar view types
 */
export type ViewType = 'month' | 'week' | 'day';

/**
 * Base calendar event object with standardized structure
 */
export interface CalendarEvent extends EventInput {
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

/**
 * Base calendar props that are common across all calendar types
 */
export interface BaseCalendarProps {
  /**
   * Optional service categories to filter reservations by
   */
  serviceCategories?: string[];
  
  /**
   * Optional calendar title
   */
  calendarTitle?: string;
  
  /**
   * Initial view type
   */
  initialView?: ViewType | string;
  
  /**
   * Initial date to show
   */
  initialDate?: Date;
  
  /**
   * Whether to show weekends
   */
  showWeekends?: boolean;
  
  /**
   * Whether to show the calendar header
   */
  showHeader?: boolean;

  /**
   * Whether to allow adding new events
   */
  allowEventCreation?: boolean;
  
  /**
   * Whether to allow editing events
   */
  allowEventEditing?: boolean;
  
  /**
   * Whether to allow deleting events
   */
  allowEventDeletion?: boolean;
  
  /**
   * Custom event render function
   */
  eventRender?: (info: any) => React.ReactNode;
  
  /**
   * Callback when an event is created, updated, or deleted
   */
  onEventChange?: (reservation: Reservation) => void;
  
  /**
   * Callback when a date is selected
   */
  onDateSelect?: (selectInfo: DateSelectArg) => void;
  
  /**
   * Callback when an event is clicked
   */
  onEventClick?: (clickInfo: EventClickArg) => void;
  
  /**
   * Children components
   */
  children?: React.ReactNode;
}

/**
 * Status color map
 */
export const STATUS_COLORS: Record<string, string> = {
  'CONFIRMED': '#4caf50', // Green
  'PENDING': '#ff9800', // Orange
  'CHECKED_IN': '#2196f3', // Blue
  'CHECKED_OUT': '#9e9e9e', // Gray
  'COMPLETED': '#673ab7', // Purple
  'CANCELLED': '#f44336', // Red
  'NO_SHOW': '#d32f2f', // Dark Red
  'default': '#9e9e9e' // Gray
};

/**
 * Service categories enum
 */
export enum ServiceCategory {
  BOARDING = 'BOARDING',
  GROOMING = 'GROOMING',
  DAYCARE = 'DAYCARE',
  TRAINING = 'TRAINING'
}
