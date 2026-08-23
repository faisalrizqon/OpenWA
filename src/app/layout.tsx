import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { themeInitScript, isValidTheme } from "@/lib/theme";
import { getStoreSettings } from "@/lib/content";

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

export const metadata: Metadata = {
  title: "MudahSewa — Sewa Kamera & Digicam",
  description: "Sewa digicam & kamera harian dengan harga bersahabat. Booking mudah via WhatsApp.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getStoreSettings();
  return (
    <html
      lang="id"
      className={`${jakarta.variable} ${geistMono.variable} ${instrument.variable} h-full antialiased`}
    >
      <body className="min-h-screen bg-background text-foreground">
        {/* Terapkan tema tersimpan sebelum paint (skip halaman admin) */}
        <script
          dangerouslySetInnerHTML={{
            __html: themeInitScript(isValidTheme(settings.theme) ? settings.theme : undefined),
          }}
        />
        {children}
      </body>
    </html>
  );
}
