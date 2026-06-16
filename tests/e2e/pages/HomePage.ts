import type { Page } from '@playwright/test';

export class HomePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/');
  }

  /**
   * Fill the hero SearchBar and submit.
   * All fields are optional — only provided values are filled.
   */
  async search({
    query,
    city,
    category,
  }: {
    query?: string;
    city?: string;
    category?: string;
  } = {}) {
    if (query !== undefined) {
      // label is sr-only; id="sb-query", name="query", placeholder="Search events, artists, venues"
      await this.page
        .locator('input[name="query"]')
        .first()
        .fill(query);
    }

    if (city !== undefined) {
      // id="sb-city", name="city", placeholder="City"
      await this.page
        .locator('input[name="city"]')
        .first()
        .fill(city);
    }

    if (category !== undefined) {
      // id="sb-category", name="category"
      await this.page
        .locator('select[name="category"]')
        .first()
        .selectOption(category);
    }

    // Button text: "🔎 Search"
    await this.page.getByRole('button', { name: /search/i }).first().click();
  }

  /** Click the first event card link on the homepage. */
  async openFirstEvent() {
    // EventCard renders as a <Link> wrapping a <Card> — each card is an <a> element
    // The card shows the event title in an h3
    await this.page.locator('main a[href^="/events/"]').first().click();
  }
}
