import { useState, useCallback } from 'react';
import { MohPaymentSDK } from '../core/client';
import {
  PaymentRequest,
  PaymentResponse,
  PaymentCallbacks,
  PaymentError,
} from '../types';

export interface UsePaymentReturn {
  isLoading: boolean;
  isProcessing: boolean;
  payment: PaymentResponse | null;
  error: PaymentError | null;
  pay: (
    request: PaymentRequest,
    callbacks?: PaymentCallbacks
  ) => Promise<PaymentResponse | null>;
  cancel: () => void;
  reset: () => void;
}

export function usePayment(sdk: MohPaymentSDK): UsePaymentReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const [error, setError] = useState<PaymentError | null>(null);

  const pay = useCallback(
    async (request: PaymentRequest, callbacks?: PaymentCallbacks) => {
      setIsLoading(true);
      setIsProcessing(true);
      setError(null);
      setPayment(null);

      try {
        const result = await sdk.pay(request, {
          onPending: (p) => {
            setPayment(p);
            callbacks?.onPending?.(p);
          },
          onSuccess: (p) => {
            setPayment(p);
            setIsProcessing(false);
            callbacks?.onSuccess?.(p);
          },
          onFailed: (err) => {
            setError(err);
            setIsProcessing(false);
            callbacks?.onFailed?.(err);
          },
          onRequiresAction: (actionUrl) => {
            callbacks?.onRequiresAction?.(actionUrl);
          },
          onRetry: (attempt, max) => {
            callbacks?.onRetry?.(attempt, max);
          },
        });

        return result;
      } catch (err) {
        const paymentError = err as PaymentError;
        setError(paymentError);
        setIsProcessing(false);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [sdk]
  );

  const cancel = useCallback(() => {
    sdk.cancelPayment();
    setIsProcessing(false);
  }, [sdk]);

  const reset = useCallback(() => {
    setPayment(null);
    setError(null);
    setIsProcessing(false);
    setIsLoading(false);
  }, []);

  return {
    isLoading,
    isProcessing,
    payment,
    error,
    pay,
    cancel,
    reset,
  };
}
