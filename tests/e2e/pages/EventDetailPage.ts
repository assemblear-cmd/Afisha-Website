import type { Page, Locator } from '@playwright/test';

export class EventDetailPage {
  constructor(private page: Page) {}

  /** The event title rendered in the <h1> on the event detail page. */
  title(): Locator {
    return this.page.locator('h1').first();
  }

  /**
   * Increase the quantity for the first non-sold-out ticket type by clicking
   * the "+" stepper button `qty` times (default: 1).
   *
   * TicketPurchase renders each ticket row's increase stepper with:
   *   aria-label="More {ticket.name}"
   * We click the first such button found on the page.
   */
  async selectFirstTicket(qty = 1) {
    const increaseBtn = this.page
      .getByRole('button', { name: /^more /i })
      .first();

    for (let i = 0; i < qty; i++) {
      await increaseBtn.click();
    }
  }

  /**
   * The checkout submit button rendered by TicketPurchase. Its label is
   * "Get free tickets" (total 0) or "Pay with Stripe" (total > 0); it is
   * disabled until at least one ticket is selected.
   */
  submitButton(): Locator {
    return this.page.getByRole('button', { name: /pay with stripe|get free tickets/i });
  }
}
