import type { Page } from '@playwright/test';

export interface RegisterOptions {
  name: string;
  email: string;
  password: string;
  role?: 'visitor' | 'organizer';
}

export interface LoginOptions {
  email: string;
  password: string;
}

export class AuthPage {
  constructor(private page: Page) {}

  /**
   * Navigate to /register, fill the AuthForm (mode="register"), and submit.
   *
   * AuthForm register fields:
   *   id="name"     label="Full name"      placeholder="Jane Smith"
   *   id="email"    label="Email address"  placeholder="you@example.com"
   *   id="password" label="Password"       placeholder="At least 8 characters"
   *   id="role"     label="I want to…"     select with options "Attend events" / "Organize events"
   *
   * Submit button text: "Create account"
   */
  async register({ name, email, password, role = 'visitor' }: RegisterOptions) {
    await this.page.goto('/register');
    await this.page.locator('#name').fill(name);
    await this.page.locator('#email').fill(email);
    await this.page.locator('#password').fill(password);
    // Select by value ('visitor' → "Attend events", 'organizer' → "Organize events")
    await this.page.locator('#role').selectOption(role);
    await this.page.getByRole('button', { name: 'Create account' }).click();
  }

  /**
   * Navigate to /login, fill the AuthForm (mode="login"), and submit.
   *
   * AuthForm login fields:
   *   id="email"    label="Email address"
   *   id="password" label="Password"
   *
   * Submit button text: "Log in"
   */
  async login({ email, password }: LoginOptions) {
    await this.page.goto('/login');
    await this.page.locator('#email').fill(email);
    await this.page.locator('#password').fill(password);
    await this.page.getByRole('button', { name: 'Log in' }).click();
  }
}
