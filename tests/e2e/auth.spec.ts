import { test, expect } from '@playwright/test';
import { AuthPage } from './pages/AuthPage';

test.describe('Authentication', () => {
  test('registers a new visitor and is redirected to home with "Log out" visible', async ({ page }) => {
    const auth = new AuthPage(page);

    // Use a unique email to avoid conflicts across test runs
    const uniqueEmail = `e2e+${Date.now()}@afisha.test`;

    await auth.register({
      name: 'E2E Test User',
      email: uniqueEmail,
      password: 'password123',
      role: 'visitor',
    });

    // AuthForm redirects to window.location.href = redirect (default '/')
    await expect(page).toHaveURL('/', { timeout: 10000 });

    // Header shows "Log out" button when a user is logged in
    await expect(
      page.getByRole('button', { name: 'Log out' })
    ).toBeVisible({ timeout: 10000 });
  });

  test('registers an organizer account and sees the organizer nav controls', async ({ page }) => {
    const auth = new AuthPage(page);
    const uniqueEmail = `e2e+org+${Date.now()}@afisha.test`;

    await auth.register({
      name: 'E2E Organizer',
      email: uniqueEmail,
      password: 'password123',
      role: 'organizer',
    });

    await expect(page).toHaveURL('/', { timeout: 10000 });

    // Header shows "Create event" link for organizers
    await expect(
      page.getByRole('link', { name: 'Create event' })
    ).toBeVisible({ timeout: 10000 });
  });

  test('logs in as the seeded visitor account', async ({ page }) => {
    const auth = new AuthPage(page);

    await auth.login({
      email: 'visitor@afisha.test',
      password: 'password123',
    });

    await expect(page).toHaveURL('/', { timeout: 10000 });

    // Header shows "Log out" button
    await expect(
      page.getByRole('button', { name: 'Log out' })
    ).toBeVisible({ timeout: 10000 });
  });

  test('shows an error for invalid login credentials', async ({ page }) => {
    const auth = new AuthPage(page);

    await auth.login({
      email: 'nobody@afisha.test',
      password: 'wrongpassword',
    });

    // AuthForm stays on /login and shows an error message
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });

    // The error div has text-red-700 styling — just check something visible
    await expect(page.locator('[class*="red"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('registration form is accessible from the /register page', async ({ page }) => {
    await page.goto('/register');

    // AuthForm renders heading: "Create your account"
    await expect(
      page.getByRole('heading', { name: 'Create your account', level: 1 })
    ).toBeVisible({ timeout: 10000 });

    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
  });

  test('login page renders the Log in heading', async ({ page }) => {
    await page.goto('/login');

    // AuthForm renders heading: "Log in to Afisha"
    await expect(
      page.getByRole('heading', { name: 'Log in to Afisha', level: 1 })
    ).toBeVisible({ timeout: 10000 });

    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
  });
});
