import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
import { Splash } from "@/components/splash";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
const serif = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: { default: "Seam: resume tailoring you can review", template: "%s · Seam" },
  description:
    "Paste a job description. Seam proposes specific, reviewable edits to your resume. You accept, reject or rewrite each one, and nothing gets invented.",
};

const themeScript = `try{var t=localStorage.getItem("seam-theme");if(t==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} ${serif.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
        <Splash />
      </body>
    </html>
  );
}
