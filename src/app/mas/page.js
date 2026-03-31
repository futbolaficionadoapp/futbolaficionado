"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import Link from "next/link";

export default function MasPage() {
  const [perfil, setPerfil] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
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
            <div className="w-8 h-8 rounded-full bg-[#1DB954] text-white flex items-center justify-center text-xs font-bold">
              {perfil.nombre?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold">{perfil.nombre}</p>
              <p className="text-xs text-gray-400">{perfil.email}</p>
            </div>
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
