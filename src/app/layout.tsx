import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Variable font. A weight list makes Google emit kit URLs with extra query
// params, which Vercel's Turbopack font loader rejects ("queries have exactly one entry").
const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://aquifert.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Aquifert - Knowledge | Fertiliser | Delivered - Informing decisions with transparency on your fertiliser sourcing",
  description:
    "Aquifert is the B2B fertiliser sourcing platform where membership replaces margin. Source water-soluble fertiliser, Urea, DAP, MOP, MAP and NPK, at true landed cost, with AI-drafted quotes, live container tracking and invoice financing.",
  keywords:
    "fertiliser sourcing platform, B2B fertiliser marketplace, buy fertiliser UK, water-soluble fertiliser suppliers, fertiliser landed cost, urea DAP MOP MAP NPK prices, fertiliser container tracking, fertiliser invoice financing, agricultural supply chain platform",
  robots: "index, follow, max-image-preview:large, max-snippet:-1",
  icons: {
    icon: [{ url: "/brand/favicon-32.png", type: "image/png" }],
    apple: "/brand/favicon-180.png",
  },
  openGraph: {
    type: "website",
    siteName: "Aquifert",
    title: "Aquifert, Fertiliser Trading at True Landed Cost",
    description:
      "The B2B fertiliser marketplace where membership replaces margin. AI-drafted quotes, live container tracking, market intelligence and invoice financing for UK agriculture.",
    url: "/",
    images: ["/media/hero-ship-containers.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aquifert, Fertiliser Trading at True Landed Cost",
    description:
      "Source Urea, DAP, MOP, MAP and NPK direct from vetted global producers. Transparent landed cost, 24-hour quotes, live tracking from port to farm gate.",
    images: ["/media/hero-ship-containers.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#163049",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="relative z-0 min-h-full bg-bg text-sm text-ink">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
