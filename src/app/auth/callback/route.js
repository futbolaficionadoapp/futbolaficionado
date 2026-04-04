import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Guardar avatar del proveedor OAuth en perfiles (solo si no tiene ya uno)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const avatarUrl =
            user.user_metadata?.avatar_url ||
            user.user_metadata?.picture ||
            null;
          if (avatarUrl) {
            // Solo guarda la foto si el usuario no tiene ya una personalizada
            await supabase
              .from("perfiles")
              .update({ avatar_url: avatarUrl })
              .eq("id", user.id)
              .is("avatar_url", null);
          }
        }
      } catch {
        // No bloquear el flujo si falla
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
