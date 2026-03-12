export enum PaymentMethod {
  STRIPE = 'stripe',
  CARD = 'card',
  MTN_MOMO = 'mtn_momo',
  VODAFONE_CASH = 'vodafone_cash',
  CASH = 'cash',
  INSURANCE = 'insurance',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  REQUIRES_ACTION = 'requires_action',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  CANCELLED = 'cancelled',
}

export enum RefundType {
  FULL = 'full',
  PARTIAL = 'partial',
}

export enum RefundStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
}

export interface PaymentRequest {
  payment_method: PaymentMethod;
  amount: number;
  currency: string;
  idempotency_key?: string;
  provider_data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface RefundRequest {
  amount: number;
  refund_type: RefundType;
  reason?: string;
}

export interface PaymentResponse {
  id: string;
  transaction_id: string;
  status: PaymentStatus;
  payment_method: PaymentMethod;
  amount: number;
  currency: string;
  provider_reference?: string;
  failure_reason?: string;
  message?: string;
}

export interface RefundResponse {
  id: string;
  payment_id: string;
  amount: number;
  currency: string;
  status: RefundStatus;
  refund_type: RefundType;
  message?: string;
}

export interface PaymentCallbacks {
  onPending?: (payment: PaymentResponse) => void;
  onSuccess?: (payment: PaymentResponse) => void;
  onFailed?: (error: PaymentError) => void;
  onRequiresAction?: (actionUrl: string) => void;
  onRetry?: (attempt: number, maxAttempts: number) => void;
}

export interface SDKConfig {
  baseUrl: string;
  apiKey: string;
  polling?: {
    intervalMs?: number;
    maxAttempts?: number;
  };
}

export interface PaymentError {
  code: PaymentErrorCode;
  message: string;
  retryable: boolean;
  originalError?: Error;
}

export enum PaymentErrorCode {
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  TIMEOUT = 'TIMEOUT',
  CANCELLED_BY_USER = 'CANCELLED_BY_USER',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  INVALID_PAYMENT_METHOD = 'INVALID_PAYMENT_METHOD',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  NOT_FOUND = 'NOT_FOUND',
  UNKNOWN = 'UNKNOWN',
}
