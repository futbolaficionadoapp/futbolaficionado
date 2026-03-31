"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AuthButton() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null;

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/perfil"
          className="w-8 h-8 rounded-full bg-[#1DB954] text-white flex items-center justify-center text-xs font-bold"
        >
          {user.user_metadata?.nombre?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
        </Link>
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className="text-xs font-semibold text-[#1DB954] border border-[#1DB954] px-3 py-1.5 rounded-lg hover:bg-[#1DB954]/5 transition-colors"
    >
      Entrar
    </Link>
  );
}
