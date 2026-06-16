import type { Page } from '@playwright/test';

export interface EventBasics {
  title: string;
  description: string;
  category: string; // slug, e.g. 'music'
  venue: string;
  city: string;
  address: string;
  startsAt: string; // datetime-local format: "YYYY-MM-DDTHH:MM"
  endsAt: string;
  coverImage?: string;
}

export interface TicketTypeInput {
  name: string;
  price: number;  // dollars
  quantity: number;
}

export class CreateEventPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard/events/new');
  }

  /**
   * Fill the basic event details section.
   *
   * CreateEventForm fields (all by id):
   *   id="title"       label="Title"
   *   id="description" label="Description"  (textarea)
   *   id="category"    label="Category"     (select, value = slug)
   *   id="venue"       label="Venue name"
   *   id="city"        label="City"
   *   id="address"     label="Address"
   *   id="startsAt"    label="Starts at"    (datetime-local input)
   *   id="endsAt"      label="Ends at"      (datetime-local input)
   *   id="coverImage"  label="Cover image URL" (optional)
   */
  async fillBasics({
    title,
    description,
    category,
    venue,
    city,
    address,
    startsAt,
    endsAt,
    coverImage,
  }: EventBasics) {
    await this.page.locator('#title').fill(title);
    await this.page.locator('#description').fill(description);
    await this.page.locator('#category').selectOption(category);
    await this.page.locator('#venue').fill(venue);
    await this.page.locator('#city').fill(city);
    await this.page.locator('#address').fill(address);
    await this.page.locator('#startsAt').fill(startsAt);
    await this.page.locator('#endsAt').fill(endsAt);
    if (coverImage) {
      await this.page.locator('#coverImage').fill(coverImage);
    }
  }

  /**
   * Fill the first ticket row (index 0) in the Tickets section.
   *
   * CreateEventForm ticket row fields (by id with index):
   *   id="tt-name-0"  label="Ticket name"
   *   id="tt-price-0" label="Price ($)"
   *   id="tt-qty-0"   label="Qty"
   *
   * The form pre-populates with DEFAULT_TICKET ("General Admission", price=0, qty=100),
   * so we clear and re-fill each field.
   */
  async setTicket({ name, price, quantity }: TicketTypeInput, index = 0) {
    await this.page.locator(`#tt-name-${index}`).fill(name);
    await this.page.locator(`#tt-price-${index}`).fill(String(price));
    await this.page.locator(`#tt-qty-${index}`).fill(String(quantity));
  }

  /**
   * Click the "Create event" submit button.
   * CreateEventForm renders: "Create event" (or "Creating event…" while loading)
   */
  async submit() {
    await this.page.getByRole('button', { name: 'Create event' }).click();
  }
}
