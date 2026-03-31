"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase-browser";
import Link from "next/link";

export default function BuscarPage() {
  const [query, setQuery] = useState("");
  const [clubs, setClubs] = useState([]);
  const [jugadores, setJugadores] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const supabase = createClient();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        buscar(query.trim());
      } else {
        setClubs([]);
        setJugadores([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  async function buscar(q) {
    setLoading(true);
    const [{ data: clubsData }, { data: jugadoresData }] = await Promise.all([
      supabase
        .from("clubs")
        .select("id, nombre, municipio, provincia, color_principal")
        .ilike("nombre", `%${q}%`)
        .limit(8),
      supabase
        .from("jugadores")
        .select("id, nombre, apellidos, posicion")
        .or(`nombre.ilike.%${q}%,apellidos.ilike.%${q}%`)
        .limit(8),
    ]);
    setClubs(clubsData || []);
    setJugadores(jugadoresData || []);
    setLoading(false);
  }

  const posLabel = {
    portero: "POR",
    defensa: "DEF",
    centrocampista: "MED",
    delantero: "DEL",
  };

  const hayResultados = clubs.length > 0 || jugadores.length > 0;

  return (
    <div className="max-w-lg mx-auto">
      <header className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-400 text-lg">
            ←
          </Link>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar clubes o jugadores..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1DB954]/30 focus:border-[#1DB954]"
          />
        </div>
      </header>

      <div className="p-4">
        {loading && (
          <p className="text-center text-gray-400 text-sm py-4">Buscando...</p>
        )}

        {!loading && query.length >= 2 && !hayResultados && (
          <p className="text-center text-gray-400 text-sm py-8">
            No se encontraron resultados para &ldquo;{query}&rdquo;
          </p>
        )}

        {!loading && query.length < 2 && (
          <p className="text-center text-gray-400 text-sm py-8">
            Escribe al menos 2 caracteres para buscar
          </p>
        )}

        {clubs.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              Clubes
            </h2>
            <div className="space-y-1.5">
              {clubs.map((club) => (
                <Link
                  key={club.id}
                  href={`/clubes/${club.id}`}
                  className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 hover:bg-gray-100 transition-colors"
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{
                      backgroundColor: club.color_principal || "#888",
                    }}
                  >
                    {club.nombre?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {club.nombre}
                    </p>
                    <p className="text-xs text-gray-400">
                      {club.municipio}
                      {club.provincia ? `, ${club.provincia}` : ""}
                    </p>
                  </div>
                  <span className="text-gray-300">›</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {jugadores.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              Jugadores
            </h2>
            <div className="space-y-1.5">
              {jugadores.map((j) => (
                <Link
                  key={j.id}
                  href={`/jugadores/${j.id}`}
                  className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 hover:bg-gray-100 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-[#1DB954]/10 text-[#1DB954] flex items-center justify-center text-sm font-bold">
                    {j.nombre?.[0]}
                    {j.apellidos?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {j.nombre} {j.apellidos}
                    </p>
                    <p className="text-xs text-gray-400">
                      {posLabel[j.posicion] || j.posicion}
                    </p>
                  </div>
                  <span className="text-gray-300">›</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
