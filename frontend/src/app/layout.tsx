import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import { Providers } from "@/context/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Route 53 Management Console",
  description: "A Route 53 console clone: hosted zones and DNS records, backed by FastAPI and SQLite.",
};

const openSans = Open_Sans({ subsets: ["latin"], variable: "--font-open-sans", display: "swap" });

const THEME_SCRIPT = `try{if(localStorage.getItem("r53-theme")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={openSans.variable} suppressHydrationWarning>
      <head>
        {/* Applies the saved theme before first paint so dark mode doesn't flash light. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
