import {
  luhnCheck,
  isValidCardNumber,
  isValidExpiry,
  isValidCvc,
  registerSchema,
  loginSchema,
  checkoutSchema,
  createEventSchema,
} from '@/lib/validations';

// ---------------------------------------------------------------------------
// luhnCheck
// ---------------------------------------------------------------------------
describe('luhnCheck', () => {
  it('returns true for the canonical 4242… test card', () => {
    expect(luhnCheck('4242424242424242')).toBe(true);
  });

  it('returns true even when spaces are present', () => {
    expect(luhnCheck('4242 4242 4242 4242')).toBe(true);
  });

  it('returns false for a number that fails the Luhn algorithm', () => {
    expect(luhnCheck('4242424242424241')).toBe(false);
  });

  it('returns false for non-digit characters (beyond whitespace)', () => {
    expect(luhnCheck('4242abcd42424242')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(luhnCheck('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isValidCardNumber
// ---------------------------------------------------------------------------
describe('isValidCardNumber', () => {
  it('accepts the 4242 4242 4242 4242 test card (with spaces)', () => {
    expect(isValidCardNumber('4242 4242 4242 4242')).toBe(true);
  });

  it('accepts the 4242424242424242 test card (no spaces)', () => {
    expect(isValidCardNumber('4242424242424242')).toBe(true);
  });

  it('rejects a number that fails Luhn', () => {
    expect(isValidCardNumber('4242424242424241')).toBe(false);
  });

  it('rejects a too-short string', () => {
    expect(isValidCardNumber('1234')).toBe(false);
  });

  it('rejects letters mixed in', () => {
    expect(isValidCardNumber('4242abcd42424242')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isValidExpiry
// ---------------------------------------------------------------------------
describe('isValidExpiry', () => {
  // Compute a clearly future MM/YY: current month + 1 year ahead
  const now = new Date();
  const futureYear = (now.getFullYear() + 2) % 100; // e.g. 28
  const futureYY = String(futureYear).padStart(2, '0');
  const futureMonth = String(now.getMonth() + 1).padStart(2, '0'); // 1-indexed
  const futureExpiry = `${futureMonth}/${futureYY}`;

  it('accepts a clearly future MM/YY', () => {
    expect(isValidExpiry(futureExpiry)).toBe(true);
  });

  it('rejects a past expiry', () => {
    expect(isValidExpiry('01/20')).toBe(false);
  });

  it('rejects an invalid month (13)', () => {
    expect(isValidExpiry('13/30')).toBe(false);
  });

  it('rejects non-numeric garbage', () => {
    expect(isValidExpiry('abc')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidExpiry('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isValidCvc
// ---------------------------------------------------------------------------
describe('isValidCvc', () => {
  it('accepts a 3-digit CVC', () => {
    expect(isValidCvc('123')).toBe(true);
  });

  it('accepts a 4-digit CVC (Amex style)', () => {
    expect(isValidCvc('1234')).toBe(true);
  });

  it('rejects a 2-digit CVC', () => {
    expect(isValidCvc('12')).toBe(false);
  });

  it('rejects a CVC containing a letter', () => {
    expect(isValidCvc('12a')).toBe(false);
  });

  it('rejects a 5-digit CVC', () => {
    expect(isValidCvc('12345')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidCvc('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// registerSchema
// ---------------------------------------------------------------------------
describe('registerSchema', () => {
  const validBase = {
    name: 'Jane Smith',
    email: 'jane@example.com',
    password: 'securepassword',
  };

  it('accepts a fully valid registration payload', () => {
    expect(
      registerSchema.safeParse({ ...validBase, role: 'visitor' }).success
    ).toBe(true);
  });

  it('defaults role to "visitor" when omitted', () => {
    const result = registerSchema.safeParse(validBase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe('visitor');
    }
  });

  it('accepts role "organizer"', () => {
    expect(
      registerSchema.safeParse({ ...validBase, role: 'organizer' }).success
    ).toBe(true);
  });

  it('rejects a password shorter than 8 characters', () => {
    expect(
      registerSchema.safeParse({ ...validBase, password: 'short' }).success
    ).toBe(false);
  });

  it('rejects an invalid email address', () => {
    expect(
      registerSchema.safeParse({ ...validBase, email: 'not-an-email' }).success
    ).toBe(false);
  });

  it('rejects a name shorter than 2 characters', () => {
    expect(
      registerSchema.safeParse({ ...validBase, name: 'A' }).success
    ).toBe(false);
  });

  it('rejects an unknown role', () => {
    expect(
      registerSchema.safeParse({ ...validBase, role: 'admin' }).success
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// loginSchema
// ---------------------------------------------------------------------------
describe('loginSchema', () => {
  it('accepts a valid email + password', () => {
    expect(
      loginSchema.safeParse({ email: 'user@example.com', password: 'pass' }).success
    ).toBe(true);
  });

  it('rejects missing password', () => {
    expect(
      loginSchema.safeParse({ email: 'user@example.com' }).success
    ).toBe(false);
  });

  it('rejects an empty password', () => {
    expect(
      loginSchema.safeParse({ email: 'user@example.com', password: '' }).success
    ).toBe(false);
  });

  it('rejects an invalid email', () => {
    expect(
      loginSchema.safeParse({ email: 'bad-email', password: 'password' }).success
    ).toBe(false);
  });

  it('rejects missing email', () => {
    expect(
      loginSchema.safeParse({ password: 'password' }).success
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// checkoutSchema
// ---------------------------------------------------------------------------
describe('checkoutSchema', () => {
  const validCheckout = {
    buyerName: 'Test Buyer',
    buyerEmail: 'buyer@example.com',
    card: {
      number: '4242 4242 4242 4242',
      name: 'Test Buyer',
      expiry: (() => {
        const now = new Date();
        const futureYear = (now.getFullYear() + 2) % 100;
        const yy = String(futureYear).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        return `${mm}/${yy}`;
      })(),
      cvc: '123',
    },
    items: [{ ticketTypeId: 'ticket-type-abc', quantity: 2 }],
  };

  it('accepts a fully valid checkout payload', () => {
    expect(checkoutSchema.safeParse(validCheckout).success).toBe(true);
  });

  it('rejects an invalid card number', () => {
    expect(
      checkoutSchema.safeParse({
        ...validCheckout,
        card: { ...validCheckout.card, number: '1234 5678 9012 3456' },
      }).success
    ).toBe(false);
  });

  it('rejects an empty items array', () => {
    expect(
      checkoutSchema.safeParse({ ...validCheckout, items: [] }).success
    ).toBe(false);
  });

  it('rejects a missing buyerEmail', () => {
    const { buyerEmail: _omit, ...rest } = validCheckout;
    expect(checkoutSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects a buyerName shorter than 2 characters', () => {
    expect(
      checkoutSchema.safeParse({ ...validCheckout, buyerName: 'X' }).success
    ).toBe(false);
  });

  it('rejects an expired card', () => {
    expect(
      checkoutSchema.safeParse({
        ...validCheckout,
        card: { ...validCheckout.card, expiry: '01/20' },
      }).success
    ).toBe(false);
  });

  it('rejects an invalid CVC', () => {
    expect(
      checkoutSchema.safeParse({
        ...validCheckout,
        card: { ...validCheckout.card, cvc: '12' },
      }).success
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createEventSchema
// ---------------------------------------------------------------------------
describe('createEventSchema', () => {
  const validEvent = {
    title: 'Summer Music Festival',
    description: 'A fantastic outdoor festival with live music all weekend long.',
    category: 'music',
    venue: 'Central Park',
    city: 'New York',
    address: '59th St to 110th St',
    startsAt: '2027-08-01T18:00',
    endsAt: '2027-08-01T23:00',
    ticketTypes: [{ name: 'General Admission', price: 50, quantity: 500 }],
  };

  it('accepts a fully valid event payload', () => {
    expect(createEventSchema.safeParse(validEvent).success).toBe(true);
  });

  it('rejects an empty ticketTypes array', () => {
    expect(
      createEventSchema.safeParse({ ...validEvent, ticketTypes: [] }).success
    ).toBe(false);
  });

  it('rejects a title shorter than 3 characters', () => {
    expect(
      createEventSchema.safeParse({ ...validEvent, title: 'Hi' }).success
    ).toBe(false);
  });

  it('rejects a description shorter than 10 characters', () => {
    expect(
      createEventSchema.safeParse({ ...validEvent, description: 'Too short' }).success
    ).toBe(false);
  });

  it('accepts a free ticket (price 0)', () => {
    expect(
      createEventSchema.safeParse({
        ...validEvent,
        ticketTypes: [{ name: 'Free Entry', price: 0, quantity: 100 }],
      }).success
    ).toBe(true);
  });

  it('rejects a ticket type with quantity 0', () => {
    expect(
      createEventSchema.safeParse({
        ...validEvent,
        ticketTypes: [{ name: 'VIP', price: 100, quantity: 0 }],
      }).success
    ).toBe(false);
  });

  it('accepts an optional coverImage URL', () => {
    expect(
      createEventSchema.safeParse({
        ...validEvent,
        coverImage: 'https://example.com/image.jpg',
      }).success
    ).toBe(true);
  });

  it('accepts an empty-string coverImage (treated as blank)', () => {
    expect(
      createEventSchema.safeParse({
        ...validEvent,
        coverImage: '',
      }).success
    ).toBe(true);
  });
});
