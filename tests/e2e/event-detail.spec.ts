import { test, expect } from '@playwright/test';
import { EventsPage } from './pages/EventsPage';
import { EventDetailPage } from './pages/EventDetailPage';

test.describe('Event detail page', () => {
  test('opening an event from the listing shows its title', async ({ page }) => {
    const events = new EventsPage(page);
    await events.goto();

    // Grab the first card's title text before navigating
    const firstCard = events.eventCards().first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });

    await events.openEvent(0);

    const detail = new EventDetailPage(page);
    await expect(detail.title()).toBeVisible({ timeout: 10000 });

    // The event detail page URL should be /events/<id>
    await expect(page).toHaveURL(/\/events\/[^/]+$/, { timeout: 10000 });
  });

  test('event detail page shows the "Tickets" sidebar card', async ({ page }) => {
    const events = new EventsPage(page);
    await events.goto();
    await events.openEvent(0);

    // EventPage renders: <h2 className="...">Tickets</h2> inside the sidebar Card
    await expect(
      page.getByRole('heading', { name: 'Tickets', level: 2 })
    ).toBeVisible({ timeout: 10000 });
  });

  test('"Get tickets" button is present (and initially disabled)', async ({ page }) => {
    const events = new EventsPage(page);
    await events.goto();
    await events.openEvent(0);

    // TicketSelector always renders the "Get tickets" button; disabled when qty=0
    const btn = page.getByRole('button', { name: 'Get tickets' });
    await expect(btn).toBeVisible({ timeout: 10000 });
    await expect(btn).toBeDisabled();
  });

  test('incrementing a ticket quantity enables the "Get tickets" button', async ({ page }) => {
    const events = new EventsPage(page);
    await events.goto();
    await events.openEvent(0);

    const detail = new EventDetailPage(page);
    await detail.selectFirstTicket(1);

    const btn = page.getByRole('button', { name: 'Get tickets' });
    await expect(btn).toBeEnabled({ timeout: 5000 });
  });

  test('event detail shows the "About this event" section', async ({ page }) => {
    const events = new EventsPage(page);
    await events.goto();
    await events.openEvent(0);

    await expect(
      page.getByRole('heading', { name: 'About this event' })
    ).toBeVisible({ timeout: 10000 });
  });
});
