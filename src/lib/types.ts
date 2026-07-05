export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; fieldErrors?: Record<string, string[]>; message?: string };

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type ListFilters = {
  q?: string;
  page?: number;
  limit?: number;
};