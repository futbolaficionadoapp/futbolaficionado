"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function IconInicio({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#1DB954" : "#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <polyline points="9 21 9 12 15 12 15 21" />
    </svg>
  );
}

function IconDirecto({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#1DB954" : "#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.55a11 11 0 0114.08 0" />
      <path d="M1.42 9a16 16 0 0121.16 0" />
      <path d="M8.53 16.11a6 6 0 016.95 0" />
      <circle cx="12" cy="20" r="1" fill={active ? "#1DB954" : "#9ca3af"} stroke="none" />
    </svg>
  );
}

function IconSeguidos({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "#1DB954" : "none"} stroke={active ? "#1DB954" : "#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
    </svg>
  );
}

function IconMas({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#1DB954" : "#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

const tabs = [
  { href: "/", label: "Inicio", Icon: IconInicio },
  { href: "/directo", label: "Directo", Icon: IconDirecto },
  { href: "/seguidos", label: "Seguidos", Icon: IconSeguidos },
  { href: "/mas", label: "Más", Icon: IconMas },
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
            className={`flex flex-col items-center gap-0.5 transition-colors ${
              isActive ? "text-[#1DB954]" : "text-gray-400"
            }`}
          >
            <tab.Icon active={isActive} />
            <span className={`text-[10px] font-semibold ${isActive ? "text-[#1DB954]" : "text-gray-400"}`}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
