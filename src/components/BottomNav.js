"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Inicio", icon: "⚽" },
  { href: "/ligas", label: "Ligas", icon: "📊" },
  { href: "/clubes", label: "Clubes", icon: "🏟️" },
  { href: "/jugadores", label: "Jugadores", icon: "👤" },
  { href: "/mas", label: "Más", icon: "☰" },
];

export default function BottomNav() {
  const pathname = usePathname();

  if (pathname === "/onboarding") return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-lg border-t border-gray-100 flex justify-around items-center h-16 safe-bottom shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
      {tabs.map((tab) => {
        const isActive =
          tab.href === "/"
            ? pathname === "/"
            : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center gap-0.5 text-xs font-medium transition-colors ${
              isActive
                ? "text-[#1DB954]"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
