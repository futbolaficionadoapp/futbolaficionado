"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function MasPage() {
  const [perfil, setPerfil] = useState(null);
  const [oauthAvatar, setOauthAvatar] = useState(null);
  const supabase = createClient();
  const router = useRouter();

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

  const avatarUrl = perfil?.avatar_url || oauthAvatar;
  const esAdmin = perfil?.rol === "admin";
  const esColaborador = perfil?.rol === "colaborador";

  return (
    <div className="max-w-lg mx-auto pb-24">
      <header className="px-4 py-4 border-b border-gray-100">
        <h1 className="text-lg font-extrabold">Más</h1>
      </header>

      <div className="px-4 py-4 space-y-3">
        {/* Perfil de usuario */}
        {perfil ? (
          <Link
            href="/perfil"
            className="flex items-center gap-3 bg-gray-50 rounded-2xl p-4 hover:bg-gray-100 transition-colors"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={perfil.nombre}
                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[#1DB954] text-white flex items-center justify-center text-lg font-bold shrink-0">
                {perfil.nombre?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{perfil.nombre}</p>
              <p className="text-xs text-gray-400 truncate">{perfil.email}</p>
              <span className="inline-block mt-0.5 text-[10px] font-bold uppercase tracking-wider bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                {perfil.rol === "admin" ? "Administrador" : perfil.rol === "colaborador" ? "Colaborador" : "Aficionado"}
              </span>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-3 bg-[#1DB954] rounded-2xl p-4 hover:bg-[#17a34a] transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl shrink-0">
              👤
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">Iniciar sesión</p>
              <p className="text-xs text-white/70">Accede a tu cuenta o regístrate</p>
            </div>
          </Link>
        )}

        {/* Paneles de gestión */}
        {(esColaborador || esAdmin) && (
          <section>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 px-1">Gestión</p>
            <div className="bg-gray-50 rounded-2xl overflow-hidden divide-y divide-gray-100">
              <Link href="/colaborador" className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-100 transition-colors">
                <span className="w-8 h-8 rounded-xl bg-[#1DB954]/10 text-[#1DB954] flex items-center justify-center text-sm shrink-0">📋</span>
                <span className="text-sm font-semibold flex-1">Panel de colaborador</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
              {esAdmin && (
                <Link href="/admin" className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-100 transition-colors">
                  <span className="w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center text-sm shrink-0">⚙️</span>
                  <span className="text-sm font-semibold flex-1">Panel de administración</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              )}
            </div>
          </section>
        )}

        {/* Quiero ser Colaborador — solo para aficionados sin rol especial */}
        {perfil && !esAdmin && !esColaborador && (
          <section>
            <div className="bg-[#1DB954]/5 border border-[#1DB954]/20 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🤝</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-800 mb-0.5">¿Quieres ser colaborador?</p>
                  <p className="text-xs text-gray-500 mb-3">
                    Ayuda a gestionar partidos, resultados y plantillas de tu equipo.
                  </p>
                  <Link
                    href="/perfil"
                    className="inline-block px-4 py-2 bg-[#1DB954] text-white text-xs font-bold rounded-xl hover:bg-[#17a34a] transition-colors"
                  >
                    Solicitar desde mi perfil
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Información */}
        <section>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 px-1">Información</p>
          <div className="bg-gray-50 rounded-2xl overflow-hidden divide-y divide-gray-100">
            <Link href="/sobre" className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-100 transition-colors">
              <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center text-sm shrink-0">ℹ️</span>
              <span className="text-sm font-semibold flex-1">Sobre el proyecto</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
            <Link href="/privacidad" className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-100 transition-colors">
              <span className="w-8 h-8 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center text-sm shrink-0">🔒</span>
              <span className="text-sm font-semibold flex-1">Privacidad</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
            <a href="mailto:futbolaficionado.app@gmail.com" className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-100 transition-colors">
              <span className="w-8 h-8 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center text-sm shrink-0">✉️</span>
              <span className="text-sm font-semibold flex-1">Contacto</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
