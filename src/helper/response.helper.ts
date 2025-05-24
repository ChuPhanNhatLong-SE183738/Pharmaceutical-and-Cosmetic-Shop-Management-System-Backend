export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message: string;
}

export interface ErrorResponse {
  success: false;
  message: string;
  errorCode?: string;
  errors?: any;
}

export function successResponse<T = any>(
  data: T,
  message = 'Success',
): SuccessResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

export function errorResponse(
  message = 'There was an error',
  errorCode?: string,
  errors?: any,
): ErrorResponse {
  return {
    success: false,
    message,
    errorCode,
    errors,
  };
}
