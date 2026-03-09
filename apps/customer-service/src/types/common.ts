/**
 * Common types for the application
 */

export interface DateRange {
  gte: Date;
  lte: Date;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterOptions {
  field: string;
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'notIn';
  value: any;
}
