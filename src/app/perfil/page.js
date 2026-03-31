"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

export default function PerfilPage() {
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function loadPerfil() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("perfiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setPerfil(data);
      setLoading(false);
    }
    loadPerfil();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="max-w-sm mx-auto px-4 py-12 text-center text-gray-400 text-sm">
        Cargando...
      </div>
    );
  }

  if (!perfil) return null;

  const rolLabel = {
    visitante: "Aficionado",
    colaborador: "Colaborador",
    admin: "Administrador",
  };

  return (
    <div className="max-w-sm mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-[#1DB954] text-white flex items-center justify-center text-2xl font-bold mx-auto mb-3">
          {perfil.nombre?.[0]?.toUpperCase() || "?"}
        </div>
        <h1 className="text-xl font-bold">{perfil.nombre}</h1>
        <p className="text-sm text-gray-500">{perfil.email}</p>
        <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
          {rolLabel[perfil.rol] || perfil.rol}
        </span>
      </div>

      <div className="space-y-3">
        <div className="bg-gray-50 rounded-xl p-4">
          <h2 className="text-sm font-bold text-gray-700 mb-1">Nombre</h2>
          <p className="text-sm text-gray-500">{perfil.nombre}</p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4">
          <h2 className="text-sm font-bold text-gray-700 mb-1">Email</h2>
          <p className="text-sm text-gray-500">{perfil.email}</p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4">
          <h2 className="text-sm font-bold text-gray-700 mb-1">Rol</h2>
          <p className="text-sm text-gray-500">
            {rolLabel[perfil.rol] || perfil.rol}
          </p>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="w-full mt-8 py-2.5 rounded-xl text-sm font-semibold text-red-500 border border-red-200 hover:bg-red-50 transition-colors"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
