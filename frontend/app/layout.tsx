import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FACENET — Live Monitor",
  description: "Real-time face detection video pipeline",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-display antialiased">{children}</body>
    </html>
  );
}
