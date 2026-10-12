import type { Metadata } from "next";
import "./globals.css";
import "./coffee.css";
import FloatingCreate from "./floating-create";

export const metadata: Metadata = {
  title: "CoffeeMate — 一杯を、もっと自分らしく。",
  description: "コーヒーの抽出を設計し、記録し、分かち合う場所。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}<FloatingCreate /></body>
    </html>
  );
}

