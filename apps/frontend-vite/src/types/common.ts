export interface PaginatedResponse<T> {
  status: string;
  results: number;
  totalPages: number;
  currentPage: number;
  data: T[];
}

export interface ApiResponse<T> {
  status: string;
  data: T;
}
