"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

export default function MiEquipo() {
  const [club, setClub] = useState(null);
  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      // Leer equipo favorito: primero BD (si hay sesión), si no localStorage
      let clubId = null;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: perfil } = await supabase
          .from("perfiles")
          .select("club_favorito_id")
          .eq("id", user.id)
          .single();
        clubId = perfil?.club_favorito_id;
      }

      if (!clubId) {
        const local = localStorage.getItem("club_favorito");
        if (local) {
          try { clubId = JSON.parse(local).id; } catch {}
        }
      }

      if (!clubId) {
        setLoading(false);
        return;
      }

      // Datos del club
      const { data: clubData } = await supabase
        .from("clubs")
        .select("*")
        .eq("id", clubId)
        .single();

      if (!clubData) { setLoading(false); return; }
      setClub(clubData);

      // Próximo partido
      const hoy = new Date().toISOString().split("T")[0];
      const { data: proximo } = await supabase
        .from("partidos")
        .select("*, local:clubs!partidos_local_id_fkey(id, nombre, color_principal), visitante:clubs!partidos_visitante_id_fkey(id, nombre, color_principal)")
        .or(`local_id.eq.${clubId},visitante_id.eq.${clubId}`)
        .eq("estado", "programado")
        .gte("fecha", hoy)
        .order("fecha", { ascending: true })
        .limit(1)
        .maybeSingle();

      // Último resultado
      const { data: ultimo } = await supabase
        .from("partidos")
        .select("*, local:clubs!partidos_local_id_fkey(id, nombre, color_principal), visitante:clubs!partidos_visitante_id_fkey(id, nombre, color_principal)")
        .or(`local_id.eq.${clubId},visitante_id.eq.${clubId}`)
        .eq("estado", "finalizado")
        .order("fecha", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Posición en clasificación
      const { data: pos } = await supabase
        .from("clasificacion")
        .select("*, grupo:grupos(liga:ligas(id, nombre))")
        .eq("club_id", clubId)
        .maybeSingle();

      // Calcular posición real
      let posicion = null;
      if (pos?.grupo_id) {
        const { data: tabla } = await supabase
          .from("clasificacion")
          .select("club_id, puntos, gf, gc")
          .eq("grupo_id", pos.grupo_id)
          .order("puntos", { ascending: false });

        if (tabla) {
          const sorted = tabla.sort((a, b) =>
            b.puntos - a.puntos || (b.gf - b.gc) - (a.gf - a.gc)
          );
          posicion = sorted.findIndex((r) => r.club_id === clubId) + 1;
        }
      }

      setDatos({ proximo, ultimo, clasificacion: pos, posicion });
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="mx-4 mb-4 h-32 bg-gray-100 rounded-2xl animate-pulse" />
    );
  }

  if (!club) return null;

  const color = club.color_principal || "#1DB954";

  return (
    <section className="px-4 mb-4">
      {/* Cabecera del equipo */}
      <Link href={`/clubes/${club.id}`}>
        <div
          className="rounded-2xl p-4 text-white mb-3 relative overflow-hidden"
          style={{ backgroundColor: color }}
        >
          {/* Fondo decorativo */}
          <div className="absolute right-0 top-0 w-32 h-32 rounded-full opacity-10 bg-white translate-x-8 -translate-y-8" />
          <div className="absolute right-8 bottom-0 w-20 h-20 rounded-full opacity-10 bg-white translate-y-6" />

          <div className="relative flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center text-2xl font-black shrink-0">
              {club.escudo_url
                ? <img src={club.escudo_url} alt="" className="w-12 h-12 object-contain" />
                : club.nombre[0]
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold opacity-75">Mi equipo</p>
              <h2 className="text-lg font-black truncate leading-tight">{club.nombre}</h2>
              {datos?.posicion && (
                <p className="text-xs opacity-80 mt-0.5">
                  {datos.posicion}º en {datos.clasificacion?.grupo?.liga?.nombre || "la liga"}
                </p>
              )}
            </div>
            {datos?.posicion && (
              <div className="text-center">
                <p className="text-3xl font-black leading-none">{datos.posicion}º</p>
                <p className="text-[10px] opacity-75 uppercase">pos.</p>
              </div>
            )}
          </div>

          {/* Stats rápidas */}
          {datos?.clasificacion && (
            <div className="relative flex gap-4 mt-3 pt-3 border-t border-white/20">
              <Stat label="PJ" value={datos.clasificacion.pj} />
              <Stat label="PG" value={datos.clasificacion.pg} />
              <Stat label="PE" value={datos.clasificacion.pe} />
              <Stat label="PP" value={datos.clasificacion.pp} />
              <Stat label="GF" value={datos.clasificacion.gf} />
              <Stat label="GC" value={datos.clasificacion.gc} />
              <Stat label="Pts" value={datos.clasificacion.puntos} bold />
            </div>
          )}
        </div>
      </Link>

      {/* Próximo partido */}
      {datos?.proximo && (
        <div className="bg-gray-50 rounded-xl p-3 mb-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
            Próximo partido
          </p>
          <PartidoRow partido={datos.proximo} clubId={club.id} />
        </div>
      )}

      {/* Último resultado */}
      {datos?.ultimo && (
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
            Último resultado
          </p>
          <PartidoRow partido={datos.ultimo} clubId={club.id} mostrarResultado />
        </div>
      )}

      {/* Cambiar equipo */}
      <button
        onClick={() => {
          localStorage.removeItem("club_favorito");
          localStorage.removeItem("onboarding_done");
          window.location.href = "/onboarding";
        }}
        className="text-[11px] text-gray-400 mt-2 block w-full text-right"
      >
        Cambiar equipo →
      </button>
    </section>
  );
}

function Stat({ label, value, bold }) {
  return (
    <div className="text-center flex-1">
      <p className={`text-sm ${bold ? "font-black text-base" : "font-bold"} leading-none`}>
        {value ?? "-"}
      </p>
      <p className="text-[9px] opacity-60 uppercase mt-0.5">{label}</p>
    </div>
  );
}

function PartidoRow({ partido, clubId, mostrarResultado }) {
  const esLocal = partido.local_id === clubId;
  const rival = esLocal ? partido.visitante : partido.local;
  const golesNuestros = esLocal ? partido.goles_local : partido.goles_visitante;
  const golesRival = esLocal ? partido.goles_visitante : partido.goles_local;

  let resultado = null;
  let colorResultado = "text-gray-500";
  if (mostrarResultado) {
    if (golesNuestros > golesRival) { resultado = "V"; colorResultado = "text-[#1DB954]"; }
    else if (golesNuestros === golesRival) { resultado = "E"; colorResultado = "text-amber-500"; }
    else { resultado = "D"; colorResultado = "text-red-500"; }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 shrink-0 flex items-center justify-center">
        {rival?.color_principal && !rival?.escudo_url ? (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white"
            style={{ backgroundColor: rival.color_principal }}
          >
            {rival.nombre?.[0]}
          </div>
        ) : rival?.escudo_url ? (
          <img src={rival.escudo_url} alt={rival.nombre} className="w-7 h-7 object-contain" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-[10px] font-black text-white">
            {rival?.nombre?.[0]}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">
          {esLocal ? "vs " : "@ "}{rival?.nombre}
        </p>
        {partido.fecha && (
          <p className="text-xs text-gray-400">
            {new Date(partido.fecha + "T12:00:00").toLocaleDateString("es-ES", {
              weekday: "short", day: "numeric", month: "short"
            })}
            {partido.hora && ` · ${partido.hora.slice(0, 5)}`}
          </p>
        )}
      </div>
      {mostrarResultado ? (
        <div className="text-right">
          <p className="text-sm font-bold tabular-nums">
            {golesNuestros} - {golesRival}
          </p>
          <p className={`text-[10px] font-bold ${colorResultado}`}>{resultado}</p>
        </div>
      ) : (
        partido.hora && (
          <p className="text-sm font-bold text-gray-600">{partido.hora.slice(0, 5)}</p>
        )
      )}
    </div>
  );
}
