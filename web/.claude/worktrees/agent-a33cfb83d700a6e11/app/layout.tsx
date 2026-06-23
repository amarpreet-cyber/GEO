import type { Metadata } from "next";
import { Lato } from "next/font/google";
import "./globals.css";

const sans = Lato({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "RISA GEO — Answer Engine Visibility",
  description: "How RISA Labs shows up across AI answer engines.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body>{children}</body>
    </html>
  );
}
