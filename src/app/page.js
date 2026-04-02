import { createClient } from "@/lib/supabase-server";
import AuthButton from "@/components/AuthButton";
import Link from "next/link";
import MiEquipo from "@/components/MiEquipo";

export default async function Home() {
  const supabase = await createClient();

  const hoy = new Date().toISOString().split("T")[0];

  const [
    { data: partidos },
    { data: clasificacion },
    { data: ligas },
    { data: goleadores },
  ] = await Promise.all([
    supabase
      .from("partidos")
      .select(
        "*, local:clubs!partidos_local_id_fkey(id, nombre, escudo_url, color_principal), visitante:clubs!partidos_visitante_id_fkey(id, nombre, escudo_url, color_principal)"
      )
      .eq("fecha", hoy)
      .order("hora", { ascending: true }),
    supabase
      .from("clasificacion")
      .select("*, club:clubs(id, nombre, escudo_url, color_principal)")
      .order("puntos", { ascending: false })
      .limit(6),
    supabase.from("ligas").select("id, nombre, categoria").eq("activa", true),
    supabase
      .from("eventos_partido")
      .select(
        "jugador_id, jugador:jugadores(id, nombre, apellidos), equipo:clubs!eventos_partido_equipo_id_fkey(id, nombre)"
      )
      .eq("tipo", "gol"),
  ]);

  // Agrupar goles por jugador
  const golesMap = {};
  (goleadores || []).forEach((e) => {
    if (!e.jugador) return;
    const id = e.jugador_id;
    if (!golesMap[id]) {
      golesMap[id] = {
        id: e.jugador.id,
        nombre: e.jugador.nombre,
        apellidos: e.jugador.apellidos,
        equipo: e.equipo?.nombre,
        equipo_id: e.equipo?.id,
        goles: 0,
      };
    }
    golesMap[id].goles++;
  });
  const topGoleadores = Object.values(golesMap)
    .sort((a, b) => b.goles - a.goles)
    .slice(0, 5);

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <header className="px-4 py-4 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚽</span>
          <h1 className="text-lg font-extrabold tracking-tight">
            <span className="text-[#1DB954]">Fútbol</span>Aficionado
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider bg-[#1DB954] text-white px-2 py-0.5 rounded-full">
            Beta
          </span>
          <AuthButton />
        </div>
      </header>

      {/* Buscador */}
      <div className="px-4 py-3">
        <Link href="/buscar" className="block">
          <div className="relative">
            <div className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-400">
              Buscar clubes o jugadores...
            </div>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              🔍
            </span>
          </div>
        </Link>
      </div>

      {/* Mi equipo */}
      <MiEquipo />

      {/* Pills de categorías */}
      <div className="px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
        {(ligas || []).map((liga) => (
          <Link
            key={liga.id}
            href={`/ligas/${liga.id}`}
            className="whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-[#1DB954]/10 hover:text-[#1DB954] transition-colors"
          >
            {liga.categoria}
          </Link>
        ))}
      </div>

      {/* Partidos del día */}
      <section className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
            Partidos del día
          </h2>
          {partidos && partidos.some((p) => p.estado === "en_vivo") && (
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              En vivo
            </span>
          )}
        </div>

        {!partidos || partidos.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-6 text-center">
            <p className="text-gray-400 text-sm">
              No hay partidos programados hoy
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {partidos.map((partido) => (
              <div
                key={partido.id}
                className={`bg-gray-50 rounded-xl p-3 flex items-center gap-3 ${
                  partido.estado === "en_vivo"
                    ? "ring-1 ring-red-200 bg-red-50/30"
                    : ""
                }`}
              >
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                      style={{
                        backgroundColor:
                          partido.local?.color_principal || "#888",
                      }}
                    >
                      {partido.local?.nombre?.[0]}
                    </div>
                    <Link
                      href={`/clubes/${partido.local?.id}`}
                      className={`text-sm font-semibold hover:underline ${
                        partido.estado === "finalizado" &&
                        partido.goles_local > partido.goles_visitante
                          ? "text-[#1DB954]"
                          : ""
                      }`}
                    >
                      {partido.local?.nombre}
                    </Link>
                    <span className="ml-auto font-bold text-sm tabular-nums">
                      {partido.estado === "programado"
                        ? ""
                        : partido.goles_local}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                      style={{
                        backgroundColor:
                          partido.visitante?.color_principal || "#888",
                      }}
                    >
                      {partido.visitante?.nombre?.[0]}
                    </div>
                    <Link
                      href={`/clubes/${partido.visitante?.id}`}
                      className={`text-sm font-semibold hover:underline ${
                        partido.estado === "finalizado" &&
                        partido.goles_visitante > partido.goles_local
                          ? "text-[#1DB954]"
                          : ""
                      }`}
                    >
                      {partido.visitante?.nombre}
                    </Link>
                    <span className="ml-auto font-bold text-sm tabular-nums">
                      {partido.estado === "programado"
                        ? ""
                        : partido.goles_visitante}
                    </span>
                  </div>
                </div>
                <div className="text-center min-w-[48px]">
                  {partido.estado === "en_vivo" ? (
                    <span className="text-xs font-bold text-red-500 animate-pulse">
                      En vivo
                    </span>
                  ) : partido.estado === "finalizado" ? (
                    <span className="text-[10px] font-semibold text-gray-400 uppercase">
                      Final
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-gray-500">
                      {partido.hora?.slice(0, 5)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Clasificación compacta */}
      <section className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
            Clasificación
          </h2>
          <Link
            href="/ligas"
            className="text-xs font-semibold text-[#1DB954] hover:underline"
          >
            Ver completa →
          </Link>
        </div>

        {!clasificacion || clasificacion.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-6 text-center">
            <p className="text-gray-400 text-sm">
              Clasificación no disponible aún
            </p>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl overflow-hidden">
            <div className="grid grid-cols-[32px_1fr_32px_32px_32px_40px] gap-1 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              <span>#</span>
              <span>Equipo</span>
              <span className="text-center">PJ</span>
              <span className="text-center">GF</span>
              <span className="text-center">GC</span>
              <span className="text-center">Pts</span>
            </div>
            {clasificacion.map((row, i) => (
              <Link
                key={row.id}
                href={`/clubes/${row.club?.id}`}
                className="grid grid-cols-[32px_1fr_32px_32px_32px_40px] gap-1 px-3 py-2 text-sm border-t border-gray-100 items-center hover:bg-gray-100 transition-colors"
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i < 2
                      ? "bg-[#1DB954]/10 text-[#1DB954]"
                      : i >= 4
                        ? "bg-red-50 text-red-400"
                        : "text-gray-400"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="font-semibold truncate">
                  {row.club?.nombre}
                </span>
                <span className="text-center text-gray-500 text-xs">
                  {row.pj}
                </span>
                <span className="text-center text-gray-500 text-xs">
                  {row.gf}
                </span>
                <span className="text-center text-gray-500 text-xs">
                  {row.gc}
                </span>
                <span className="text-center font-bold">{row.puntos}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Goleadores */}
      {topGoleadores.length > 0 && (
        <section className="px-4 pb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">
            Goleadores
          </h2>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {topGoleadores.map((g, i) => (
              <Link
                key={g.id}
                href={`/jugadores/${g.id}`}
                className="flex-shrink-0 w-32 bg-gray-50 rounded-xl p-3 text-center hover:bg-gray-100 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[#1DB954]/10 text-[#1DB954] flex items-center justify-center text-sm font-bold mx-auto mb-2">
                  {g.nombre?.[0]}
                  {g.apellidos?.[0]}
                </div>
                <p className="text-xs font-semibold truncate">
                  {g.nombre} {g.apellidos?.split(" ")[0]}
                </p>
                <p className="text-[10px] text-gray-400 truncate">
                  {g.equipo}
                </p>
                <p className="text-lg font-bold text-[#1DB954] mt-1">
                  {g.goles}
                </p>
                <p className="text-[9px] text-gray-400 uppercase tracking-wider">
                  goles
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
