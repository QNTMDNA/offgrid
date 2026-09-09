import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const inter = Inter({ variable: "--font-body", subsets: ["latin"] });

const display = localFont({
  variable: "--font-display",
  src: [
    { path: "../../public/fonts/display-bold.woff2", weight: "700", style: "normal" },
    { path: "../../public/fonts/display-italic.woff2", weight: "700", style: "italic" },
  ],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Off Grid | Exclusive Grand Prix Experiences",
    template: "%s | Off Grid",
  },
  description:
    "Off Grid is a global hospitality and cultural platform built around the world's most iconic races.",
  icons: { icon: "/brand/favicon.png" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${display.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
