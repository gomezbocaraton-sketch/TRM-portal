import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quote Desk — Code Consultation NYC",
  description: "Quotes, jobs, payments and documents for Code Consultation NYC Inc.",
  icons: { icon: "/icon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
