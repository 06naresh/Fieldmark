export interface Pagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  [key: string]: unknown;
}

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
    request_id?: string;
  };
}

export interface ApiDataResponse<T> {
  data: T;
}

export interface ApiCollectionResponse<T> {
  data: T[];
  pagination?: Pagination;
}

export interface ActionResponse {
  message: string;
}
