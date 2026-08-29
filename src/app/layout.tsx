import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono, Instrument_Serif, Rubik_Spray_Paint } from "next/font/google";
import "./globals.css";
import { isValidTheme } from "@/lib/theme";
import { getStoreSettings } from "@/lib/content";
import { Toaster } from "sonner";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

const rubikSpray = Rubik_Spray_Paint({
  variable: "--font-spray",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MudahSewa — Sewa Kamera & Digicam",
  description: "Sewa digicam & kamera harian dengan harga bersahabat. Booking mudah via WhatsApp.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getStoreSettings();
  const validTheme = isValidTheme(settings.theme) ? settings.theme : "light";

  return (
    <html lang="id" className={`${jakarta.variable} ${geistMono.variable} ${instrument.variable} ${rubikSpray.variable} h-full antialiased`} data-theme={validTheme}>
      <body className="min-h-screen bg-background text-foreground">
        {children}
        {/* Toast notifications - top right */}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
