import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

/*
 * Three self-hosted families via next/font (no layout shift):
 *   • Fraunces — a warm, optical-serif display face. Editorial character with
 *     a literary feel; used for headlines and the wordmark (--font-display).
 *   • Plus Jakarta Sans — clean, friendly, professional body/UI (--font-sans).
 *   • Inter — kept only for tabular money figures, where its lining/tabular
 *     numerals align like a bank statement (--font-numeric).
 * globals.css feeds these variables into the semantic font tokens.
 */
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TrustOps AI",
  description: "The operating system for African SMEs.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#3544a8",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${jakarta.variable} ${inter.variable}`}
    >
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
