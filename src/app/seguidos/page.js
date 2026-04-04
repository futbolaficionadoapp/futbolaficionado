"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SeguidosPage() {
  const [seguidos, setSeguidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [buscar, setBuscar] = useState("");
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [showBuscador, setShowBuscador] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUser(user);

      const { data } = await supabase
        .from("equipos_seguidos")
        .select("id, created_at, club:clubs(id, nombre, escudo_url, color_principal, municipio, provincia)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setSeguidos(data || []);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (!buscar.trim()) { setResultados([]); return; }
    const timeout = setTimeout(async () => {
      setBuscando(true);
      const { data } = await supabase
        .from("clubs")
        .select("id, nombre, escudo_url, color_principal, municipio, provincia")
        .ilike("nombre", `%${buscar}%`)
        .limit(8);
      setResultados(data || []);
      setBuscando(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [buscar]);

  async function handleSeguir(club) {
    if (!user) { router.push("/login"); return; }
    await supabase.from("equipos_seguidos").insert({ user_id: user.id, club_id: club.id });
    setSeguidos((prev) => [{ id: Date.now(), club, created_at: new Date().toISOString() }, ...prev]);
    setBuscar("");
    setResultados([]);
    setShowBuscador(false);
  }

  async function handleDejar(clubId) {
    if (!user) return;
    await supabase.from("equipos_seguidos").delete().eq("user_id", user.id).eq("club_id", clubId);
    setSeguidos((prev) => prev.filter((s) => s.club?.id !== clubId));
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center text-gray-400 text-sm">
        Cargando...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🔖</div>
        <h2 className="text-lg font-bold mb-2">Equipos seguidos</h2>
        <p className="text-sm text-gray-400 mb-6">Inicia sesión para seguir equipos y tenerlos a mano</p>
        <Link href="/login" className="inline-block px-6 py-2.5 bg-[#1DB954] text-white rounded-xl text-sm font-semibold">
          Iniciar sesión
        </Link>
      </div>
    );
  }

  const seguidosIds = new Set(seguidos.map((s) => s.club?.id));

  return (
    <div className="max-w-lg mx-auto pb-24">
      <header className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
        <h1 className="text-lg font-extrabold">Seguidos</h1>
        <button
          onClick={() => setShowBuscador(!showBuscador)}
          className="w-8 h-8 rounded-full bg-[#1DB954] text-white flex items-center justify-center text-lg font-bold shadow-sm"
        >
          {showBuscador ? "✕" : "+"}
        </button>
      </header>

      {showBuscador && (
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <input
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            placeholder="Buscar equipo para seguir..."
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1DB954]/30"
            autoFocus
          />
          {buscando && <p className="text-xs text-gray-400 mt-2 px-1">Buscando...</p>}
          {resultados.length > 0 && (
            <div className="mt-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
              {resultados.map((club) => (
                <button
                  key={club.id}
                  onClick={() => handleSeguir(club)}
                  disabled={seguidosIds.has(club.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b last:border-0 border-gray-100 disabled:opacity-40"
                >
                  <Escudo club={club} size="sm" />
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-semibold truncate">{club.nombre}</p>
                    <p className="text-xs text-gray-400 truncate">{[club.municipio, club.provincia].filter(Boolean).join(", ")}</p>
                  </div>
                  <span className="text-xs text-[#1DB954] font-bold shrink-0">
                    {seguidosIds.has(club.id) ? "✓ Siguiendo" : "+ Seguir"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="px-4 py-4">
        {seguidos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
              </svg>
            </div>
            <p className="text-sm font-bold text-gray-700 mb-1">Aún no sigues ningún equipo</p>
            <p className="text-xs text-gray-400">Pulsa + para añadir equipos y seguirlos fácilmente</p>
          </div>
        ) : (
          <div className="space-y-2">
            {seguidos.map((s) => (
              <div key={s.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                <Link href={`/clubes/${s.club?.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <Escudo club={s.club} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{s.club?.nombre}</p>
                    <p className="text-xs text-gray-400 truncate">{[s.club?.municipio, s.club?.provincia].filter(Boolean).join(", ")}</p>
                  </div>
                </Link>
                <button
                  onClick={() => handleDejar(s.club?.id)}
                  className="shrink-0 text-xs text-red-400 font-semibold hover:text-red-600 transition-colors"
                >
                  Dejar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Escudo({ club, size = "md" }) {
  const dim = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  if (club?.escudo_url) {
    return (
      <div className={`${dim} shrink-0 flex items-center justify-center`}>
        <img src={club.escudo_url} alt={club.nombre} className="w-full h-full object-contain" />
      </div>
    );
  }
  return (
    <div
      className={`${dim} rounded-full shrink-0 flex items-center justify-center text-sm font-bold text-white`}
      style={{ backgroundColor: club?.color_principal || "#888" }}
    >
      {club?.nombre?.[0]}
    </div>
  );
}
