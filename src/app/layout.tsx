import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Private Stream",
  description: "A private live camera stream",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

