// This is the ROOT layout, it should be very simple.
// The main layout logic including AppShell is now in [locale]/layout.tsx
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

// Note: Font imports (Geist) are now handled in [locale]/layout.tsx
// as this root layout is minimal.

const geistSansFont = GeistSans;
const geistMonoFont = GeistMono;

export const metadata: Metadata = {
  title: "Euro Metal Docs - Document & Workflow Management",
  description: "Organize documents, manage offers, track orders, and monitor balances with Euro Metal Docs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
      <body 
        className={`${geistSansFont.variable} ${geistMonoFont.variable}`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
