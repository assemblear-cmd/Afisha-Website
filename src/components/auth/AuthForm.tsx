'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { Card } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';
import Link from 'next/link';

interface AuthFormProps {
  mode: 'login' | 'register';
}

export function AuthForm({ mode }: AuthFormProps) {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
    const payload =
      mode === 'register'
        ? { name, email, password }
        : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        window.location.href = redirect;
      } else {
        const data = await res.json();
        setError(data.error ?? 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const otherModeHref =
    mode === 'login'
      ? `/register${redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`
      : `/login${redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`;

  const heading = mode === 'login' ? 'Log in to Afisha' : 'Create your account';

  return (
    <Container>
      <div className="mx-auto max-w-[440px]">
        <Card className="p-8">
          <h1 className="mb-6 text-2xl font-bold text-ink">{heading}</h1>

          {error && (
            <div role="alert" className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
            {mode === 'register' && (
              <Field label="Full name" htmlFor="name">
                <Input
                  id="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                />
              </Field>
            )}

            <Field label="Email address" htmlFor="email">
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </Field>

            <Field label="Password" htmlFor="password">
              <Input
                id="password"
                type="password"
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'At least 8 characters' : ''}
              />
            </Field>

            <Button type="submit" size="lg" className="w-full mt-1" disabled={loading}>
              {loading
                ? mode === 'login'
                  ? 'Logging in…'
                  : 'Creating account…'
                : mode === 'login'
                  ? 'Log in'
                  : 'Create account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            {mode === 'login' ? (
              <>
                New to Afisha?{' '}
                <Link href={otherModeHref} className="text-coral hover:underline font-medium">
                  Create an account
                </Link>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <Link href={otherModeHref} className="text-coral hover:underline font-medium">
                  Log in
                </Link>
              </>
            )}
          </p>
        </Card>
      </div>
    </Container>
  );
}
