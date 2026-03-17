import {
  SDKConfig,
  PaymentRequest,
  PaymentResponse,
  RefundRequest,
  RefundResponse,
  PaymentCallbacks,
  RefundCallbacks,
  PaymentStatus,
  RefundStatus,
  PaymentError,
  PaymentErrorCode,
} from '../types';
import { createError } from '../types/errors';
import { Poller } from './poller';
import { generateIdempotencyKey } from './idem';

export class MohPaymentSDK {
  private config: SDKConfig;
  private poller: Poller;

  constructor(config: SDKConfig) {
    this.config = {
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      polling: {
        intervalMs: 5000,
        maxAttempts: 24,
        ...config.polling,
      },
    };
    this.poller = new Poller({
      intervalMs: this.config.polling!.intervalMs!,
      maxAttempts: this.config.polling!.maxAttempts!,
    });
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw createError(response.status, data);
    }

    // Handle wrapped response format from NestJS interceptor
    // { data: { id, type, attributes }, meta } -> { id, ...attributes }
    if (data && typeof data === 'object' && 'data' in data) {
      const wrappedData = data.data;
      if (wrappedData && typeof wrappedData === 'object' && 'attributes' in wrappedData) {
        const { id, type, attributes } = wrappedData;
        return { id, ...attributes } as T;
      }
      return wrappedData as T;
    }

    return data;
  }

  async pay(
    request: PaymentRequest,
    callbacks?: PaymentCallbacks
  ): Promise<PaymentResponse> {
    const idempotencyKey = request.idempotency_key || generateIdempotencyKey();

    console.log('[SDK] Sending payment request:', request);

    const response = await this.request<PaymentResponse>('/payments', {
      method: 'POST',
      body: JSON.stringify({
        ...request,
        idempotency_key: idempotencyKey,
      }),
    });

    console.log('[SDK] Payment response:', response);

    if (response.status === PaymentStatus.SUCCESS) {
      console.log('[SDK] Payment SUCCESS');
      callbacks?.onSuccess?.(response);
      return response;
    }

    if (response.status === PaymentStatus.FAILED) {
      console.log('[SDK] Payment FAILED');
      const error: PaymentError = {
        code: PaymentErrorCode.PROVIDER_ERROR,
        message: response.failure_reason || 'Payment failed',
        retryable: false,
      };
      callbacks?.onFailed?.(error);
      return response;
    }

    if (response.status === PaymentStatus.REQUIRES_ACTION) {
      console.log('[SDK] Payment requires action');
      callbacks?.onRequiresAction?.(response.message || '');
      return response;
    }

    if (response.status === PaymentStatus.PENDING || response.status === PaymentStatus.PROCESSING) {
      console.log('[SDK] Payment pending/processing, starting poller');
      callbacks?.onPending?.(response);

      return new Promise((resolve, reject) => {
        this.poller.start(
          async () => {
            const query = response.provider_reference
              ? `?provider_reference=${response.provider_reference}`
              : '';
            return this.request<PaymentResponse>(`/payments/${response.transaction_id}${query}`);
          },
          (payment) => {
            if (payment.status === PaymentStatus.SUCCESS) {
              callbacks?.onSuccess?.(payment);
              resolve(payment);
            } else if (payment.status === PaymentStatus.FAILED) {
              const error: PaymentError = {
                code: PaymentErrorCode.PROVIDER_ERROR,
                message: payment.failure_reason || 'Payment failed',
                retryable: false,
              };
              callbacks?.onFailed?.(error);
              resolve(payment);
            }
          },
          (attempt) => {
            callbacks?.onRetry?.(attempt, this.config.polling!.maxAttempts!);
          },
          () => {
            const timeoutError: PaymentError = {
              code: PaymentErrorCode.TIMEOUT,
              message: 'Payment verification timed out',
              retryable: true,
            };
            callbacks?.onFailed?.(timeoutError);
            reject(timeoutError);
          }
        );
      });
    }

    return response;
  }

  async getStatus(transactionId: string, providerReference?: string): Promise<PaymentResponse> {
    const query = providerReference ? `?provider_reference=${providerReference}` : '';
    return this.request<PaymentResponse>(`/payments/${transactionId}${query}`);
  }

  async refund(
    paymentId: string,
    request: RefundRequest,
    callbacks?: RefundCallbacks
  ): Promise<RefundResponse> {
    try {
      const result = await this.request<RefundResponse>(`/payments/${paymentId}/refund`, {
        method: 'POST',
        body: JSON.stringify(request),
      });

      if (result.status === RefundStatus.FAILED) {
        const error: PaymentError = {
          code: PaymentErrorCode.PROVIDER_ERROR,
          message: result.message || 'Refund failed',
          retryable: false,
        };
        callbacks?.onFailed?.(error);
      } else {
        callbacks?.onSuccess?.(result);
      }

      return result;
    } catch (err) {
      const error = err as PaymentError;
      callbacks?.onFailed?.(error);
      throw err;
    }
  }

  cancelPayment(): void {
    this.poller.stop();
  }
}
