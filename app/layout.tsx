import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Bricolage_Grotesque } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-body",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Harden HVAC & Refrigeration in Tallahassee and Quincy FL",
  description:
    "Licensed & insured HVAC and commercial refrigeration services in Tallahassee and Quincy, FL. Emergency repairs, tune-ups, diagnostics, and priority membership plans.",
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Harden HVAC",
  },
  manifest: '/manifest.json',
  formatDetection: {
    telephone: true,
  },
  metadataBase: new URL("https://hardenhvacr.com"),
  openGraph: {
    title: "Harden HVAC & Refrigeration in Tallahassee and Quincy FL",
    description:
      "Reliable HVAC and commercial refrigeration service in Tallahassee and Quincy, FL. Request service online or call (910) 546-6485.",
    url: "https://hardenhvacr.com",
    siteName: "Harden HVAC & Refrigeration",
    images: [
      {
        url: "/og-image.png",
        width: 1024,
        height: 1024,
        alt: "Harden HVAC & Refrigeration — AC Repair, Heating, Refrigeration in Tallahassee FL",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Harden HVAC & Refrigeration in Tallahassee and Quincy FL",
    description:
      "Reliable HVAC and commercial refrigeration service in Tallahassee and Quincy, FL. Request service online or call (910) 546-6485.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bebasNeue.variable} ${bricolage.variable}`}>
      <body className="font-[var(--font-body)] antialiased">
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"
          strategy="beforeInteractive"
        />
        <Script id="sw-register" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js'); }`}
        </Script>
        {children}
      </body>
    </html>
  );
}
