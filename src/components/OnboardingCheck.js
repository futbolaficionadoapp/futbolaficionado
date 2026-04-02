"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

// Rutas donde NO se muestra el onboarding
const SKIP_ROUTES = ["/onboarding", "/login", "/registro"];

export default function OnboardingCheck() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (SKIP_ROUTES.some((r) => pathname.startsWith(r))) return;
    const done = localStorage.getItem("onboarding_done");
    if (!done) {
      router.replace("/onboarding");
    }
  }, [pathname]);

  return null;
}
