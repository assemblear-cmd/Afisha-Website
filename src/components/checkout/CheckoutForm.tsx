'use client';

import { useState } from 'react';
import { formatPrice } from '@/lib/format';
import { isValidCardNumber, isValidExpiry, isValidCvc } from '@/lib/validations';
import { Button, Badge, Card, Field, Input, Label } from '@/components/ui';

interface SelectionItem {
  ticketTypeId: string;
  name: string;
  priceCents: number;
  quantity: number;
}

interface CheckoutFormProps {
  eventId: string;
  selection: SelectionItem[];
  defaultName?: string;
  defaultEmail?: string;
}

interface FormErrors {
  buyerName?: string;
  buyerEmail?: string;
  cardNumber?: string;
  cardName?: string;
  expiry?: string;
  cvc?: string;
  server?: string;
}

export function CheckoutForm({
  eventId,
  selection,
  defaultName = '',
  defaultEmail = '',
}: CheckoutFormProps) {
  const [buyerName, setBuyerName] = useState(defaultName);
  const [buyerEmail, setBuyerEmail] = useState(defaultEmail);
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const total = selection.reduce((sum, s) => sum + s.priceCents * s.quantity, 0);

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!buyerName.trim() || buyerName.trim().length < 2) {
      errs.buyerName = 'Please enter your full name.';
    }
    if (!buyerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail.trim())) {
      errs.buyerEmail = 'Please enter a valid email address.';
    }
    if (!isValidCardNumber(cardNumber)) {
      errs.cardNumber = 'Enter a valid card number.';
    }
    if (!cardName.trim() || cardName.trim().length < 2) {
      errs.cardName = 'Enter the name on the card.';
    }
    if (!isValidExpiry(expiry)) {
      errs.expiry = 'Enter a valid future expiry (MM/YY).';
    }
    if (!isValidCvc(cvc)) {
      errs.cvc = 'Enter a valid CVC (3–4 digits).';
    }
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          buyerName: buyerName.trim(),
          buyerEmail: buyerEmail.trim(),
          card: {
            number: cardNumber,
            name: cardName.trim(),
            expiry,
            cvc,
          },
          items: selection.map((s) => ({
            ticketTypeId: s.ticketTypeId,
            quantity: s.quantity,
          })),
        }),
      });

      const data = (await res.json()) as { orderId?: string; error?: string };

      if (res.ok && data.orderId) {
        window.location.href = '/orders/' + data.orderId;
      } else {
        setErrors({ server: data.error ?? 'Something went wrong. Please try again.' });
        setLoading(false);
      }
    } catch {
      setErrors({ server: 'Network error. Please try again.' });
      setLoading(false);
    }
  }

  // Format card number with spaces every 4 digits
  function handleCardNumberChange(val: string) {
    const digits = val.replace(/\D/g, '').slice(0, 19);
    const formatted = digits.replace(/(.{4})/g, '$1 ').trim();
    setCardNumber(formatted);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {errors.server && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {errors.server}
        </div>
      )}

      {/* Contact information */}
      <Card className="p-6 space-y-4">
        <h2 className="font-semibold text-ink text-lg">Contact information</h2>
        <Field label="Full name" htmlFor="buyerName" error={errors.buyerName}>
          <Input
            id="buyerName"
            type="text"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            autoComplete="name"
            placeholder="Jane Smith"
          />
        </Field>
        <Field label="Email address" htmlFor="buyerEmail" error={errors.buyerEmail}>
          <Input
            id="buyerEmail"
            type="email"
            value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)}
            autoComplete="email"
            placeholder="jane@example.com"
          />
        </Field>
      </Card>

      {/* Payment */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink text-lg">Payment</h2>
          <Badge tone="coral">Demo — no real charges</Badge>
        </div>

        <div className="rounded-md bg-coral/5 border border-coral/20 px-4 py-3 text-sm text-coral">
          <strong>Demo checkout</strong> — do not enter a real card. Use{' '}
          <code className="font-mono">4242 4242 4242 4242</code> for testing.
        </div>

        <Field label="Card number" htmlFor="cardNumber" error={errors.cardNumber}>
          <Input
            id="cardNumber"
            type="text"
            inputMode="numeric"
            value={cardNumber}
            onChange={(e) => handleCardNumberChange(e.target.value)}
            autoComplete="cc-number"
            placeholder="4242 4242 4242 4242"
            maxLength={23}
          />
        </Field>

        <Field label="Name on card" htmlFor="cardName" error={errors.cardName}>
          <Input
            id="cardName"
            type="text"
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
            autoComplete="cc-name"
            placeholder="Jane Smith"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Expiry" htmlFor="expiry" error={errors.expiry}>
            <Input
              id="expiry"
              type="text"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              autoComplete="cc-exp"
              placeholder="MM/YY"
              maxLength={5}
            />
          </Field>
          <Field label="CVC" htmlFor="cvc" error={errors.cvc}>
            <Input
              id="cvc"
              type="text"
              inputMode="numeric"
              value={cvc}
              onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
              autoComplete="cc-csc"
              placeholder="123"
              maxLength={4}
            />
          </Field>
        </div>
      </Card>

      {/* Removed unused Label import usage — Label is available via Field */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={loading}
      >
        {loading ? 'Processing payment…' : `Pay ${formatPrice(total)}`}
      </Button>
    </form>
  );
}
