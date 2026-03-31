"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

export default function SeguirClubButton({ clubId }) {
  const [siguiendo, setSiguiendo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data } = await supabase
          .from("clubes_seguidos")
          .select("id")
          .eq("usuario_id", user.id)
          .eq("club_id", clubId)
          .single();
        setSiguiendo(!!data);
      }
      setLoading(false);
    }
    check();
  }, [clubId]);

  async function handleToggle() {
    if (!user) {
      router.push("/login?redirect=/clubes/" + clubId);
      return;
    }

    setLoading(true);
    if (siguiendo) {
      await supabase
        .from("clubes_seguidos")
        .delete()
        .eq("usuario_id", user.id)
        .eq("club_id", clubId);
      setSiguiendo(false);
    } else {
      await supabase
        .from("clubes_seguidos")
        .insert({ usuario_id: user.id, club_id: clubId });
      setSiguiendo(true);
    }
    setLoading(false);
  }

  if (loading) return null;

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
        siguiendo
          ? "bg-white/20 text-white border border-white/30"
          : "bg-white text-gray-900"
      }`}
    >
      {siguiendo ? "✓ Siguiendo" : "Seguir"}
    </button>
  );
}
