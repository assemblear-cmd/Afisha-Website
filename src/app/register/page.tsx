import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata: Metadata = {
  title: 'Sign up',
};

export default function RegisterPage() {
  return (
    <section className="min-h-[calc(100vh-4rem)] bg-surface py-12 flex items-center">
      <Suspense>
        <AuthForm mode="register" />
      </Suspense>
    </section>
  );
}
