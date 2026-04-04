"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import Link from "next/link";

export default function MasPage() {
  const [perfil, setPerfil] = useState(null);
  const [oauthAvatar, setOauthAvatar] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setOauthAvatar(
          user.user_metadata?.avatar_url ||
          user.user_metadata?.picture ||
          null
        );
        const { data } = await supabase
          .from("perfiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setPerfil(data);
      }
    }
    load();
  }, []);

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-4">Más</h1>

      <div className="space-y-1">
        {perfil && (
          <Link
            href="/perfil"
            className="flex items-center gap-3 py-3 border-b border-gray-100"
          >
            {(perfil.avatar_url || oauthAvatar) ? (
              <img
                src={perfil.avatar_url || oauthAvatar}
                alt={perfil.nombre}
                className="w-10 h-10 rounded-full object-cover border border-gray-100 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#1DB954] text-white flex items-center justify-center text-sm font-bold shrink-0">
                {perfil.nombre?.[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold">{perfil.nombre}</p>
              <p className="text-xs text-gray-400">{perfil.email}</p>
            </div>
            <span className="ml-auto text-gray-300 text-lg">›</span>
          </Link>
        )}

        {perfil?.rol === "colaborador" && (
          <Link
            href="/colaborador"
            className="block py-3 border-b border-gray-100 text-sm font-medium text-[#1DB954]"
          >
            📋 Panel de colaborador
          </Link>
        )}

        {perfil?.rol === "admin" && (
          <>
            <Link
              href="/colaborador"
              className="block py-3 border-b border-gray-100 text-sm font-medium text-[#1DB954]"
            >
              📋 Panel de colaborador
            </Link>
            <Link
              href="/admin"
              className="block py-3 border-b border-gray-100 text-sm font-medium text-red-500"
            >
              ⚙️ Panel de administración
            </Link>
          </>
        )}

        <div className="py-3 border-b border-gray-100 text-sm text-gray-700">
          Sobre el proyecto
        </div>
        <div className="py-3 border-b border-gray-100 text-sm text-gray-700">
          Contacto
        </div>
        <div className="py-3 text-sm text-gray-700">Privacidad</div>

        {!perfil && (
          <Link
            href="/login"
            className="block mt-4 py-2.5 rounded-xl text-sm font-semibold text-center bg-[#1DB954] text-white"
          >
            Iniciar sesión
          </Link>
        )}
      </div>
    </div>
  );
}
