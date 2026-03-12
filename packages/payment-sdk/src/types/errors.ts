import { PaymentError, PaymentErrorCode } from './payment.types';

interface ErrorResponse {
  message?: string;
  failure_reason?: string;
  [key: string]: unknown;
}

const errorMap: Record<number, { code: PaymentErrorCode; retryable: boolean }> = {
  400: { code: PaymentErrorCode.VALIDATION_ERROR, retryable: false },
  401: { code: PaymentErrorCode.UNAUTHORIZED, retryable: false },
  404: { code: PaymentErrorCode.NOT_FOUND, retryable: false },
  409: { code: PaymentErrorCode.INVALID_PAYMENT_METHOD, retryable: false },
  422: { code: PaymentErrorCode.VALIDATION_ERROR, retryable: false },
  500: { code: PaymentErrorCode.PROVIDER_ERROR, retryable: true },
  502: { code: PaymentErrorCode.NETWORK_ERROR, retryable: true },
  503: { code: PaymentErrorCode.NETWORK_ERROR, retryable: true },
};

export function createError(status: number, data: ErrorResponse): PaymentError {
  const mapped = errorMap[status] || { code: PaymentErrorCode.UNKNOWN, retryable: false };

  let code = mapped.code;
  let message = data?.message || data?.failure_reason || 'An error occurred';

  if (data?.failure_reason) {
    const reason = data.failure_reason.toLowerCase();
    if (reason.includes('insufficient')) {
      code = PaymentErrorCode.INSUFFICIENT_FUNDS;
      message = 'Insufficient funds';
    } else if (reason.includes('cancel')) {
      code = PaymentErrorCode.CANCELLED_BY_USER;
      message = 'Payment cancelled by user';
    }
  }

  return {
    code,
    message,
    retryable: mapped.retryable,
  };
}
