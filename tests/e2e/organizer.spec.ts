import { test, expect } from '@playwright/test';
import { AuthPage } from './pages/AuthPage';
import { CreateEventPage } from './pages/CreateEventPage';

test.describe('Organizer — create event flow', () => {
  test('organizer can log in, create an event, and land on the new event detail page', async ({ page }) => {
    // 1. Log in as the seeded organizer
    const auth = new AuthPage(page);
    await auth.login({
      email: 'organizer@afisha.test',
      password: 'password123',
    });

    await expect(page).toHaveURL('/', { timeout: 10000 });
    // Header shows "Create event" for organizers
    await expect(
      page.getByRole('link', { name: 'Create event' })
    ).toBeVisible({ timeout: 10000 });

    // 2. Navigate to the create event form
    const createPage = new CreateEventPage(page);
    await createPage.goto();

    await expect(page).toHaveURL('/dashboard/events/new', { timeout: 10000 });
    await expect(
      page.getByRole('heading', { name: 'Create an event', level: 1 })
    ).toBeVisible({ timeout: 10000 });

    // 3. Fill in the event basics
    // Use a unique title so we can identify it after creation
    const eventTitle = `E2E Live Concert ${Date.now()}`;

    // startsAt must be in the future; datetime-local format: YYYY-MM-DDTHH:MM
    const startsAt = '2027-09-15T19:00';
    const endsAt = '2027-09-15T23:00';

    await createPage.fillBasics({
      title: eventTitle,
      description: 'An end-to-end test concert featuring local artists performing live music.',
      category: 'music',
      venue: 'E2E Arena',
      city: 'Test City',
      address: '1 Test Boulevard',
      startsAt,
      endsAt,
    });

    // 4. Fill the first (default) ticket row
    await createPage.setTicket({
      name: 'General Admission',
      price: 25,
      quantity: 100,
    });

    // 5. Submit the form
    await createPage.submit();

    // 6. After successful creation, CreateEventForm does:
    //    window.location.href = '/events/' + data.event.id
    // So we should land on /events/<uuid>
    await expect(page).toHaveURL(/\/events\/[^/]+$/, { timeout: 15000 });

    // 7. The event detail page should show our title in the h1
    await expect(
      page.getByRole('heading', { name: eventTitle, level: 1 })
    ).toBeVisible({ timeout: 10000 });
  });

  test('the /dashboard/events/new page redirects unauthenticated users to /login', async ({ page }) => {
    // Navigate directly without logging in
    await page.goto('/dashboard/events/new');

    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('a visitor account sees the "Organizer access required" message on the create page', async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.login({
      email: 'visitor@afisha.test',
      password: 'password123',
    });

    await expect(page).toHaveURL('/', { timeout: 10000 });

    const createPage = new CreateEventPage(page);
    await createPage.goto();

    // NewEventPage renders "Organizer access required" for visitor role
    await expect(
      page.getByRole('heading', { name: 'Organizer access required' })
    ).toBeVisible({ timeout: 10000 });
  });
});
