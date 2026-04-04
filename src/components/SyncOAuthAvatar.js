"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";

// Sincroniza la foto de perfil de Google/Facebook a la tabla perfiles
// Solo se ejecuta una vez por sesión de navegador
export default function SyncOAuthAvatar() {
  const supabase = createClient();

  useEffect(() => {
    if (sessionStorage.getItem("avatar_synced")) return;

    async function sync() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const avatarUrl =
        user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        null;

      if (!avatarUrl) return;

      // Solo actualiza si aún no tiene foto personalizada
      await supabase
        .from("perfiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", user.id)
        .is("avatar_url", null);

      sessionStorage.setItem("avatar_synced", "1");
    }

    sync();
  }, []);

  return null;
}
