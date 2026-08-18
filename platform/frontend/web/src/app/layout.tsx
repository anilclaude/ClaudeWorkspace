import type { Metadata } from 'next';
import { StoreProvider } from '@/store/provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Platform',
  description: 'Scaffold — no features built yet',
};

// Root layout owns only what every route needs regardless of auth state:
// the document shell and the store.
//
// The app chrome (header, nav) deliberately lives in (app)/layout.tsx, not
// here — routes under (auth) must render without it, since showing app
// navigation to someone who isn't signed in contradicts their wireframes and
// leaks the app's structure pre-auth.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
