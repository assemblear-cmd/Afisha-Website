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
   * TicketSelector renders each ticket row with:
   *   aria-label="Increase quantity for {ticket.name}"
   * We click the first such button found on the page.
   */
  async selectFirstTicket(qty = 1) {
    const increaseBtn = this.page
      .getByRole('button', { name: /increase quantity/i })
      .first();

    for (let i = 0; i < qty; i++) {
      await increaseBtn.click();
    }
  }

  /**
   * Click the "Get tickets" button rendered by TicketSelector.
   * Button text is exactly "Get tickets" (disabled until qty > 0).
   */
  async clickGetTickets() {
    await this.page.getByRole('button', { name: 'Get tickets' }).click();
  }
}
