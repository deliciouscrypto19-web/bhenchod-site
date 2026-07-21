import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bhenchod of the Week",
  description: "Vote for the Bhenchod of the Week. Meaning of Bhenchod. Indian swear word. Who is a Bhenchod? What is Bhenchod? Do people in India say Bhenchod or Panchod?",
  keywords: [
  "bhenchod",
  "bhenchod of the week",
  "India",
  "bhenchod meaning",
  "bhenchod translation",
  "bhenchod in Indian",
],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
