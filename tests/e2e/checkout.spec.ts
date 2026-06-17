import { test, expect } from '@playwright/test';
import { EventsPage } from './pages/EventsPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { CheckoutPage } from './pages/CheckoutPage';

test.describe('Guest checkout flow', () => {
  test('can purchase a ticket and land on the order confirmation page', async ({ page }) => {
    // 1. Browse to the events list and open the first event
    const events = new EventsPage(page);
    await events.goto();
    await expect(events.eventCards().first()).toBeVisible({ timeout: 10000 });
    await events.openEvent(0);

    // 2. On the event detail page, select 1 ticket and proceed to checkout
    const detail = new EventDetailPage(page);
    await expect(detail.title()).toBeVisible({ timeout: 10000 });

    await detail.selectFirstTicket(1);

    const getTicketsBtn = page.getByRole('button', { name: 'Get tickets' });
    await expect(getTicketsBtn).toBeEnabled({ timeout: 5000 });
    await detail.clickGetTickets();

    // 3. We should now be on the checkout page
    await expect(page).toHaveURL(/\/events\/[^/]+\/checkout/, { timeout: 10000 });
    await expect(
      page.getByRole('heading', { name: 'Checkout', level: 1 })
    ).toBeVisible({ timeout: 10000 });

    // 4. Fill the contact information
    const checkout = new CheckoutPage(page);
    await checkout.fillContact({
      name: 'Test Buyer',
      email: 'testbuyer@afisha.test',
    });

    // 5. Fill the demo card (4242 4242 4242 4242)
    await checkout.fillCard({
      number: '4242 4242 4242 4242',
      name: 'Test Buyer',
    });

    // 6. Click Pay
    await checkout.pay();

    // 7. Expect to land on /orders/<id> with the "Payment successful" badge
    await checkout.assertOnOrderConfirmation();

    // OrderConfirmationPage renders: <Badge tone="success">Payment successful</Badge>
    await expect(
      page.getByText('Payment successful')
    ).toBeVisible({ timeout: 15000 });
  });

  test('checkout page shows the "Contact information" and "Payment" sections', async ({ page }) => {
    // Navigate straight to events, open first event, select ticket, go to checkout
    const events = new EventsPage(page);
    await events.goto();
    await events.openEvent(0);

    const detail = new EventDetailPage(page);
    await detail.selectFirstTicket(1);
    await detail.clickGetTickets();

    await expect(page).toHaveURL(/\/checkout/, { timeout: 10000 });

    await expect(
      page.getByRole('heading', { name: 'Contact information' })
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.getByRole('heading', { name: 'Payment' })
    ).toBeVisible({ timeout: 10000 });
  });

  test('checkout page shows the demo card hint', async ({ page }) => {
    const events = new EventsPage(page);
    await events.goto();
    await events.openEvent(0);

    const detail = new EventDetailPage(page);
    await detail.selectFirstTicket(1);
    await detail.clickGetTickets();

    await expect(page).toHaveURL(/\/checkout/, { timeout: 10000 });

    // CheckoutForm renders a hint: "Demo checkout — do not enter a real card."
    await expect(page.getByText(/Demo checkout/i)).toBeVisible({ timeout: 10000 });
  });
});
