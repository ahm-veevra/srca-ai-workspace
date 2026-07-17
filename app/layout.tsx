import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono, Cairo } from "next/font/google";
import "./globals.css";
import { FeedbackRoot } from "@/components/ui/feedback";
import { LocaleProvider } from "@/lib/i18n";
import { getLabelOverrides } from "@/lib/i18n/overrides";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

// Arabic UI face (A91 / PRR-029). Self-hosted via next/font like the Latin faces; applied under
// dir="rtl" in globals.css so Arabic text renders in a proper Arabic typeface, not a fallback.
const cairo = Cairo({
  subsets: ["arabic"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SRCA AI Workspace — Intelligent Intranet Portal | Saudi Red Crescent Authority",
  description:
    "The Saudi Red Crescent Authority's intelligent intranet portal — its business AI application suite, powered by AICP.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      dir="ltr"
      // `dark` is the brand default; the light theme (D2 toggle) removes it.
      className={cn(
        "dark",
        inter.variable,
        spaceGrotesk.variable,
        jetbrainsMono.variable,
        cairo.variable,
      )}
      suppressHydrationWarning
    >
      <head>
        {/* Apply the saved theme and locale/direction before paint to avoid a flash. Dark +
            LTR are the defaults; Arabic (ar) stamps dir="rtl" so the layout mirrors. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('veevra-theme')==='light'){document.documentElement.classList.remove('dark')}}catch(e){}" +
              "try{var l=localStorage.getItem('veevra-locale');if(l==='ar'){document.documentElement.lang='ar';document.documentElement.dir='rtl';}}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <LocaleProvider overrides={getLabelOverrides()}>
          {children}
          <FeedbackRoot />
        </LocaleProvider>
      </body>
    </html>
  );
}
