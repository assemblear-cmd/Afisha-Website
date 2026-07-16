import {
  registerSchema,
  loginSchema,
  createEventSchema,
} from '@/lib/validations';

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
