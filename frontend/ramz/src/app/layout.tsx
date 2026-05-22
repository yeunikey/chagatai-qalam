import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chagatai RAMZ",
  description: "Платформа нормализации текста арабской графики",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-white text-[#20242a] antialiased">{children}</body>
    </html>
  );
}
