/**
 * Common pagination input for use case queries.
 */
export interface PaginationInput {
  page: number;
  pageSize: number;
}

/**
 * Generic paginated result wrapper.
 *
 * @typeParam T - The type of items in the result
 */
export interface PaginatedData<T> {
  items: T[];
  total: number;
}
