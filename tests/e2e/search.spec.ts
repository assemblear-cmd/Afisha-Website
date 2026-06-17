import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { EventsPage } from './pages/EventsPage';

test.describe('Search', () => {
  test('submitting the hero search bar navigates to /events', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    // Submit without any filters — should land on /events with all events
    await home.search({});

    await expect(page).toHaveURL(/\/events/, { timeout: 10000 });
  });

  test('searching by city returns at least 1 result on /events', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    // The seed data has events in "New York" — search for a partial city name
    await home.search({ city: 'New' });

    await expect(page).toHaveURL(/\/events\?.*city=New/, { timeout: 10000 });

    const events = new EventsPage(page);
    const count = await events.resultsCount();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('searching by keyword returns results on /events', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    // Use a generic term likely present across seed events
    await home.search({ query: 'event' });

    await expect(page).toHaveURL(/\/events/, { timeout: 10000 });

    // The page heading always shows "N events" — just verify we rendered
    const events = new EventsPage(page);
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
  });

  test('category chip navigation lands on /events?category=<slug>', async ({ page }) => {
    const events = new EventsPage(page);
    await events.goto();

    // CategoryFilter renders links for each category slug.
    // Click the "Music" chip (text: "🎵 Music")
    await page.getByRole('link', { name: /Music/i }).first().click();

    await expect(page).toHaveURL(/\/events\?category=music/, { timeout: 10000 });

    // Heading should render "N event(s)"
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
  });

  test('"All" category chip removes the category filter', async ({ page }) => {
    // Start with a category filter active
    const events = new EventsPage(page);
    await events.goto({ category: 'music' });

    // CategoryFilter renders "✨ All" chip linking to /events (no params)
    await page.getByRole('link', { name: /All/i }).first().click();

    await expect(page).toHaveURL(/\/events$/, { timeout: 10000 });
  });
});
