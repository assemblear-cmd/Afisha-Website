import Link from 'next/link';
import { Container } from '@/components/ui';

export function Footer() {
  return (
    <footer className="bg-ink text-white/80 mt-16">
      <Container>
        <div className="py-10">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xl font-extrabold text-white">
                Afish<span className="text-coral">a</span>
              </p>
              <p className="mt-2 text-sm text-white/70">Discover events that move you.</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white">Discover</h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href="/events" className="text-white/70 hover:text-white no-underline">
                    Browse events
                  </Link>
                </li>
                <li>
                  <Link href="/events" className="text-white/70 hover:text-white no-underline">
                    Categories
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white">Organize</h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href="/register" className="text-white/70 hover:text-white no-underline">
                    Create an event
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="text-white/70 hover:text-white no-underline">
                    Log in
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white">About</h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="text-white/70">This is a demo MVP.</li>
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-white/10 pt-6">
            <p className="text-xs text-white/50">
              © 2026 Afisha — demo project. Not affiliated with Eventbrite.
            </p>
          </div>
        </div>
      </Container>
    </footer>
  );
}
