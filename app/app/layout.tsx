import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentShelf",
  description: "Make product catalogs recommendation-ready for AI shopping assistants."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
