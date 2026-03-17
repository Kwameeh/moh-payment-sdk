import { useState, useCallback } from 'react';
import { MohPaymentSDK } from '../core/client';
import { RefundRequest, RefundResponse, PaymentError, RefundCallbacks } from '../types';

export interface UseRefundProps {
  onSuccess?: (refund: RefundResponse) => void;
  onFailed?: (error: PaymentError) => void;
}

export interface UseRefundReturn {
  isLoading: boolean;
  error: PaymentError | null;
  refund: (paymentId: string, request: RefundRequest) => Promise<RefundResponse | null>;
}

export function useRefund(sdk: MohPaymentSDK, props?: UseRefundProps): UseRefundReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<PaymentError | null>(null);

  const refund = useCallback(
    async (paymentId: string, request: RefundRequest): Promise<RefundResponse | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await sdk.refund(paymentId, request, {
          onSuccess: (refund) => {
            props?.onSuccess?.(refund);
          },
          onFailed: (err) => {
            setError(err);
            props?.onFailed?.(err);
          },
        });
        return result;
      } catch (err) {
        const paymentError = err as PaymentError;
        setError(paymentError);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [sdk, props]
  );

  return {
    isLoading,
    error,
    refund,
  };
}
