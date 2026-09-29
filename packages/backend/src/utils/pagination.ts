export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginationResult {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const getPagination = (page: number = 1, limit: number = 20): PaginationOptions => {
  return {
    page: Math.max(1, page),
    limit: Math.min(100, Math.max(1, limit)),
  };
};

export const getSkip = (page: number, limit: number): number => {
  return (page - 1) * limit;
};
