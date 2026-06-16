import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

function futureMmYy(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String((now.getFullYear() + 2) % 100).padStart(2, '0');
  return `${mm}/${yy}`;
}

export interface ContactInfo {
  name: string;
  email: string;
}

export interface CardInfo {
  number?: string;
  name?: string;
  expiry?: string;
  cvc?: string;
}

export class CheckoutPage {
  constructor(private page: Page) {}

  /**
   * Fill the Contact information section.
   * CheckoutForm fields:
   *   id="buyerName"  label="Full name"      placeholder="Jane Smith"
   *   id="buyerEmail" label="Email address"  placeholder="jane@example.com"
   */
  async fillContact({ name, email }: ContactInfo) {
    await this.page.locator('#buyerName').fill(name);
    await this.page.locator('#buyerEmail').fill(email);
  }

  /**
   * Fill the Payment card section.
   * CheckoutForm fields:
   *   id="cardNumber"  label="Card number"   placeholder="4242 4242 4242 4242"
   *   id="cardName"    label="Name on card"  placeholder="Jane Smith"
   *   id="expiry"      label="Expiry"        placeholder="MM/YY"
   *   id="cvc"         label="CVC"           placeholder="123"
   *
   * Defaults to the demo test card values.
   */
  async fillCard({
    number = '4242 4242 4242 4242',
    name = 'Test Buyer',
    expiry = futureMmYy(),
    cvc = '123',
  }: CardInfo = {}) {
    await this.page.locator('#cardNumber').fill(number);
    await this.page.locator('#cardName').fill(name);
    await this.page.locator('#expiry').fill(expiry);
    await this.page.locator('#cvc').fill(cvc);
  }

  /**
   * Click the Pay button.
   * CheckoutForm renders: `Pay ${formatPrice(total)}` — matches /^Pay /
   */
  async pay() {
    await this.page.getByRole('button', { name: /^Pay /i }).click();
  }

  /** Assert we have landed on an /orders/<id> URL. */
  async assertOnOrderConfirmation() {
    await expect(this.page).toHaveURL(/\/orders\//, { timeout: 15000 });
  }
}
