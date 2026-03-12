# MOH Payment SDK

A TypeScript SDK for the MOH Payment Gateway. Supports both vanilla JavaScript and React applications.

## Features

- Multiple payment methods (MTN MoMo, Vodafone Cash, Cash, Card, Insurance)
- Automatic payment status polling for async payments
- Idempotency key support to prevent duplicate payments
- React hooks for easy integration
- Full TypeScript support
- Error handling with retryable flags

## Installation

```bash
npm install @moh/payment-sdk
```

## Quick Start

### 1. Initialize the SDK

```typescript
import { MohPaymentSDK } from '@moh/payment-sdk';

const sdk = new MohPaymentSDK({
  baseUrl: 'https://api.hospital.com/api/v1',
  apiKey: process.env.MOH_API_KEY!,
});
```

### 2. Make a Payment

```typescript
const payment = await sdk.pay({
  payment_method: PaymentMethod.MTN_MOMO,
  amount: 5000, // 50 GHS in pesewas
  currency: 'GHS',
  provider_data: { phone: '0241234567' },
  metadata: { bill_id: 'BILL-001', patient_id: 'PAT-001' },
});
```

---

## Usage Examples

### React Integration

#### Basic Payment Form

```tsx
import { MohPaymentSDK, usePayment, PaymentMethod } from '@moh/payment-sdk/react';

const sdk = new MohPaymentSDK({
  baseUrl: import.meta.env.VITE_API_URL,
  apiKey: import.meta.env.VITE_API_KEY,
});

function PaymentPage() {
  const { isProcessing, payment, error, pay, cancel } = usePayment(sdk);

  const handlePayment = async () => {
    await pay(
      {
        payment_method: PaymentMethod.MTN_MOMO,
        amount: 50000, // 500 GHS
        currency: 'GHS',
        provider_data: { phone: '0241234567' },
        metadata: { bill_id: 'BILL-123', patient_id: 'PAT-456' },
      },
      {
        onPending: () => console.log('Payment initiated'),
        onSuccess: (p) => console.log('Paid!', p.transaction_id),
        onFailed: (e) => console.error('Failed:', e.message),
        onRetry: (attempt, max) => console.log(`Checking... ${attempt}/${max}`),
      }
    );
  };

  if (isProcessing) {
    return (
      <div className="payment-pending">
        <p>Check your phone for payment prompt</p>
        <p>Enter PIN to confirm</p>
        <button onClick={cancel}>Cancel</button>
      </div>
    );
  }

  if (payment?.status === 'success') {
    return (
      <div className="payment-success">
        <h2>Payment Successful!</h2>
        <p>Transaction ID: {payment.transaction_id}</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Pay Bill</h1>
      <p>Amount: GHS 500.00</p>
      <button onClick={handlePayment}>Pay with MTN MoMo</button>
      {error && <p className="error">{error.message}</p>}
    </div>
  );
}
```

#### With Payment Method Selection

```tsx
function PaymentForm() {
  const [selectedMethod, setSelectedMethod] = useState(PaymentMethod.MTN_MOMO);
  const { isProcessing, pay, cancel } = usePayment(sdk);

  const paymentMethods = [
    { method: PaymentMethod.MTN_MOMO, label: 'MTN MoMo' },
    { method: PaymentMethod.VODAFONE_CASH, label: 'Vodafone Cash' },
    { method: PaymentMethod.CASH, label: 'Cash' },
  ];

  const handlePay = async () => {
    const providerData = selectedMethod === PaymentMethod.MTN_MOMO
      ? { phone: '0241234567' }
      : selectedMethod === PaymentMethod.VODAFONE_CASH
      ? { phone: '0201234567' }
      : { received_amount: 50000, received_by: 'John Doe' };

    await pay({
      payment_method: selectedMethod,
      amount: 50000,
      currency: 'GHS',
      provider_data: providerData,
      metadata: { bill_id: 'BILL-001' },
    });
  };

  return (
    <div>
      <select 
        value={selectedMethod} 
        onChange={(e) => setSelectedMethod(e.target.value as PaymentMethod)}
        disabled={isProcessing}
      >
        {paymentMethods.map(({ method, label }) => (
          <option key={method} value={method}>{label}</option>
        ))}
      </select>
      
      <button onClick={handlePay} disabled={isProcessing}>
        Pay GHS 500
      </button>
      
      {isProcessing && <button onClick={cancel}>Cancel</button>}
    </div>
  );
}
```

### Vanilla JavaScript

```typescript
import { MohPaymentSDK, PaymentMethod, PaymentStatus } from '@moh/payment-sdk';

const sdk = new MohPaymentSDK({
  baseUrl: 'https://api.hospital.com/api/v1',
  apiKey: 'your-api-key',
});

async function processBillPayment(billId, amount, phone) {
  try {
    const payment = await sdk.pay(
      {
        payment_method: PaymentMethod.MTN_MOMO,
        amount: amount * 100, // Convert to pesewas
        currency: 'GHS',
        provider_data: { phone },
        metadata: { bill_id: billId },
      },
      {
        onPending: (p) => console.log('Pending:', p.status),
        onSuccess: (p) => {
          console.log('Success!', p.transaction_id);
          updateBillStatus(billId, 'paid');
        },
        onFailed: (e) => {
          console.error('Failed:', e.code, e.message);
        },
        onRetry: (attempt, max) => {
          console.log(`Verifying payment... ${attempt}/${max}`);
        },
      }
    );

    return payment;
  } catch (error) {
    console.error('Payment error:', error);
  }
}

// Cash payment (synchronous)
async function processCashPayment(billId, amountReceived) {
  const payment = await sdk.pay({
    payment_method: PaymentMethod.CASH,
    amount: 50000,
    currency: 'GHS',
    provider_data: { 
      received_amount: amountReceived,
      received_by: 'Admin User',
      receipt_number: 'RCP-001'
    },
    metadata: { bill_id: billId },
  });

  console.log('Cash payment:', payment.status);
}
```

### Checking Payment Status

```typescript
// Check status of existing payment
async function checkPaymentStatus(transactionId) {
  const payment = await sdk.getStatus(transactionId);
  console.log('Status:', payment.status);
  return payment;
}

// Process refund
async function refundPayment(paymentId) {
  const refund = await sdk.refund(paymentId, {
    amount: 25000, // Partial refund
    refund_type: RefundType.PARTIAL,
    reason: 'Customer request',
  });
  
  console.log('Refund status:', refund.status);
}
```

---

## Payment Methods

| Method | Enum Value | Type | Provider Data |
|--------|------------|------|---------------|
| MTN MoMo | `PaymentMethod.MTN_MOMO` | Async | `{ phone: '0241234567' }` |
| Vodafone Cash | `PaymentMethod.VODAFONE_CASH` | Async | `{ phone: '0201234567' }` |
| Cash | `PaymentMethod.CASH` | Sync | `{ received_amount: number, received_by: string }` |
| Card | `PaymentMethod.CARD` | Async | `{ card_token?: string }` |
| Insurance | `PaymentMethod.INSURANCE` | Async | `{ policy_number: string }` |
| Stripe | `PaymentMethod.STRIPE` | Async | `{ payment_intent_id?: string }` |

---

## API Reference

### Constructor

```typescript
const sdk = new MohPaymentSDK({
  baseUrl: 'https://api.hospital.com/api/v1',
  apiKey: 'your-api-key',
  polling: {
    intervalMs: 5000,   // Poll every 5 seconds (default)
    maxAttempts: 24,    // Max 24 attempts = 2 minutes (default)
  },
});
```

### Methods

| Method | Parameters | Returns |
|--------|------------|---------|
| `pay` | `PaymentRequest, PaymentCallbacks?` | `Promise<PaymentResponse>` |
| `getStatus` | `transactionId, providerReference?` | `Promise<PaymentResponse>` |
| `refund` | `paymentId, RefundRequest` | `Promise<RefundResponse>` |
| `cancelPayment` | - | `void` |

### Types

```typescript
interface PaymentRequest {
  payment_method: PaymentMethod;
  amount: number;           // In smallest currency unit (pesewas)
  currency: string;         // ISO 4217 (e.g., 'GHS')
  idempotency_key?: string; // Auto-generated if not provided
  provider_data: Record<string, any>;
  metadata?: Record<string, any>;
}

interface RefundRequest {
  amount: number;
  refund_type: RefundType;
  reason?: string;
}
```

### React Hook Return Values

```typescript
const {
  isLoading,      // Initial request in progress
  isProcessing,  // Async payment waiting for confirmation
  payment,        // Current payment state
  error,          // Error if failed
  pay,            // Initiate payment
  cancel,         // Cancel async payment
  reset,          // Reset all state
} = usePayment(sdk);
```

---

## Error Handling

```typescript
// Handle specific errors
await pay(request, {
  onFailed: (error) => {
    switch (error.code) {
      case PaymentErrorCode.INSUFFICIENT_FUNDS:
        // Show insufficient funds message
        break;
      case PaymentErrorCode.TIMEOUT:
        // Allow retry
        break;
      case PaymentErrorCode.CANCELLED_BY_USER:
        // User cancelled on their phone
        break;
      default:
        // Generic error
    }
    
    // Check if retryable
    if (error.retryable) {
      // Can retry the payment
    }
  },
});

// Error codes
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
```

---

## Environment Variables

```env
# .env
VITE_API_URL=https://api.hospital.com/api/v1
VITE_API_KEY=your-api-key-here
```

---

## License

MIT
