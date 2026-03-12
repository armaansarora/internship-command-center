import type { Metadata } from 'next';
import { Geist, Geist_Mono, Playfair_Display, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { AppSidebar } from '@/components/layout/sidebar';
import { LayoutTransition } from '@/components/layout/layout-transition';
import { CommandPalette } from '@/components/layout/command-palette';
import { BottomTabBar } from '@/components/layout/bottom-tab-bar';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { auth } from '@/auth';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { ServiceWorkerRegistration } from '@/components/layout/service-worker-registration';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const playfairDisplay = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'Internship Command Center',
  description:
    'Track applications, generate cover letters, manage follow-ups, and nail your internship search',
  openGraph: {
    title: 'Internship Command Center',
    description:
      'Track applications, generate cover letters, manage follow-ups, and nail your internship search',
    url: '/',
    siteName: 'Internship Command Center',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Internship Command Center',
    description:
      'Track applications, generate cover letters, manage follow-ups, and nail your internship search',
  },
  icons: {
    icon: ['/favicon-32x32.png', '/favicon-16x16.png'],
    apple: '/apple-touch-icon.png',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            {session ? (
              <div className="flex min-h-screen bg-background text-foreground">
                <AppSidebar footer={<SignOutButton />} />
                <LayoutTransition className="flex-1 overflow-auto pb-16 md:pb-0">
                  {children}
                </LayoutTransition>
                <CommandPalette />
                <BottomTabBar />
              </div>
            ) : (
              <div className="min-h-screen bg-background text-foreground">
                {children}
              </div>
            )}
          </TooltipProvider>
        </ThemeProvider>
        <Toaster richColors closeButton />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
