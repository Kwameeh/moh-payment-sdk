# MOH Payment SDK

A TypeScript SDK for the MOH Payment Gateway. Supports both vanilla JavaScript and React applications.

## Installation

```bash
npm install @moh/payment-sdk
```

## Configuration

```typescript
import { MohPaymentSDK } from '@moh/payment-sdk';

const sdk = new MohPaymentSDK({
  baseUrl: 'https://api.hospital.com/api/v1',
  apiKey: process.env.MOH_API_KEY,
  polling: {
    intervalMs: 5000,   // Poll every 5 seconds (default)
    maxAttempts: 24,   // Max 24 attempts = 2 minutes (default)
  },
});
```

## Usage

### React

```tsx
import { MohPaymentSDK, usePayment, PaymentMethod } from '@moh/payment-sdk/react';

const sdk = new MohPaymentSDK({
  baseUrl: import.meta.env.VITE_API_URL,
  apiKey: import.meta.env.VITE_API_KEY,
});

function PaymentForm({ billId, amount, patientId }) {
  const { isLoading, isProcessing, payment, error, pay, cancel, reset } = usePayment(sdk);

  const handlePay = async () => {
    await pay(
      {
        payment_method: PaymentMethod.MTN_MOMO,
        amount: amount * 100, // Convert to pesewas
        currency: 'GHS',
        provider_data: { phone: '0241234567' },
        metadata: { bill_id: billId, patient_id: patientId },
      },
      {
        onPending: () => console.log('Check your phone for payment prompt...'),
        onSuccess: (p) => console.log('Payment successful:', p.transaction_id),
        onFailed: (e) => console.error('Payment failed:', e.message),
        onRetry: (attempt, max) => console.log(`Verifying... ${attempt}/${max}`),
      }
    );
  };

  if (isProcessing) {
    return (
      <div>
        <p>Check your phone for the payment prompt...</p>
        <button onClick={cancel}>Cancel</button>
      </div>
    );
  }

  if (payment?.status === 'success') {
    return (
      <div>
        <p>Payment successful!</p>
        <p>Transaction ID: {payment.transaction_id}</p>
      </div>
    );
  }

  return (
    <div>
      <button onClick={handlePay} disabled={isLoading}>
        Pay with MTN MoMo
      </button>
      {error && <p>Error: {error.message}</p>}
    </div>
  );
}
```

### Vanilla JavaScript

```typescript
import { MohPaymentSDK, PaymentMethod } from '@moh/payment-sdk';

const sdk = new MohPaymentSDK({
  baseUrl: 'https://api.hospital.com/api/v1',
  apiKey: 'your-api-key',
});

async function processPayment() {
  try {
    const payment = await sdk.pay(
      {
        payment_method: PaymentMethod.CASH,
        amount: 25000,
        currency: 'GHS',
        provider_data: { received_amount: 30000 },
        metadata: { bill_id: 'BILL-001', patient_id: 'PAT-001' },
      },
      {
        onSuccess: (p) => console.log('Receipt:', p),
        onFailed: (e) => console.error('Error:', e.message),
      }
    );
    
    console.log('Payment result:', payment);
  } catch (error) {
    console.error('Payment error:', error);
  }
}
```

## Payment Methods

| Method | Enum Value | Type |
|--------|------------|------|
| Stripe | `PaymentMethod.STRIPE` | Async |
| Card | `PaymentMethod.CARD` | Async |
| MTN MoMo | `PaymentMethod.MTN_MOMO` | Async |
| Vodafone Cash | `PaymentMethod.VODAFONE_CASH` | Async |
| Cash | `PaymentMethod.CASH` | Sync |
| Insurance | `PaymentMethod.INSURANCE` | Async |

## API Reference

### `MohPaymentSDK`

#### Constructor Options

```typescript
interface SDKConfig {
  baseUrl: string;      // API base URL
  apiKey: string;       // API key for authentication
  polling?: {
    intervalMs?: number;   // Poll interval in ms (default: 5000)
    maxAttempts?: number;  // Max poll attempts (default: 24)
  };
}
```

#### Methods

| Method | Description |
|--------|-------------|
| `pay(request, callbacks)` | Initiate a payment |
| `getStatus(transactionId, providerReference?)` | Check payment status |
| `refund(paymentId, request)` | Process a refund |
| `cancelPayment()` | Cancel ongoing async payment |

### `usePayment` (React Hook)

```typescript
const {
  isLoading,      // Initial request in progress
  isProcessing,  // Async payment waiting for confirmation
  payment,        // Current payment state
  error,          // Error if failed
  pay,            // Initiate payment
  cancel,         // Cancel async payment
  reset,          // Reset state
} = usePayment(sdk);
```

### Payment Callbacks

```typescript
interface PaymentCallbacks {
  onPending?: (payment: PaymentResponse) => void;
  onSuccess?: (payment: PaymentResponse) => void;
  onFailed?: (error: PaymentError) => void;
  onRequiresAction?: (actionUrl: string) => void;
  onRetry?: (attempt: number, maxAttempts: number) => void;
}
```

## Error Handling

```typescript
enum PaymentErrorCode {
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

interface PaymentError {
  code: PaymentErrorCode;
  message: string;
  retryable: boolean;
  originalError?: Error;
}
```

## License

MIT
