import { Nunito } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import RegisterSW from "@/components/RegisterSW";
import OnboardingCheck from "@/components/OnboardingCheck";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata = {
  title: "FútbolAficionado — El fútbol que se vive",
  description:
    "Resultados, clasificaciones y estadísticas del fútbol modesto andaluz. Desde la 3ª RFEF hasta las categorías provinciales.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FútbolAficionado",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1DB954",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${nunito.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-white text-gray-900 font-sans pb-16">
        <OnboardingCheck />
        <main className="flex-1">{children}</main>
        <BottomNav />
        <RegisterSW />
      </body>
    </html>
  );
}
