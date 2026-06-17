import type { Page, Locator } from '@playwright/test';

export class EventsPage {
  constructor(private page: Page) {}

  async goto(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    await this.page.goto('/events' + qs);
  }

  /** All EventCard anchor elements on the page. */
  eventCards(): Locator {
    return this.page.locator('main a[href^="/events/"]');
  }

  /** Click the nth event card (0-indexed). */
  async openEvent(index = 0) {
    await this.eventCards().nth(index).click();
  }

  /**
   * Returns the numeric results count from the heading "N events" / "N event".
   * The EventsPage renders: <h1>{events.length} {events.length === 1 ? 'event' : 'events'}</h1>
   */
  async resultsCount(): Promise<number> {
    const heading = this.page.locator('h1').first();
    const text = await heading.innerText();
    const match = text.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }
}
