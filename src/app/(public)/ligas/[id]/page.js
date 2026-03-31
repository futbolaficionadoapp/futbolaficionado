import { createClient } from "@/lib/supabase-server";
import Link from "next/link";

export default async function LigaPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: liga } = await supabase
    .from("ligas")
    .select("*, temporada:temporadas(nombre)")
    .eq("id", id)
    .single();

  if (!liga) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <p className="text-gray-400">Liga no encontrada</p>
      </div>
    );
  }

  // Obtener grupo de esta liga
  const { data: grupos } = await supabase
    .from("grupos")
    .select("id, nombre")
    .eq("liga_id", id);

  const grupoId = grupos?.[0]?.id;

  const [{ data: clasificacion }, { data: partidos }, { data: goleadores }] =
    await Promise.all([
      supabase
        .from("clasificacion")
        .select("*, club:clubs(id, nombre, color_principal)")
        .eq("grupo_id", grupoId)
        .order("puntos", { ascending: false }),
      supabase
        .from("partidos")
        .select(
          "*, local:clubs!partidos_local_id_fkey(id, nombre, color_principal), visitante:clubs!partidos_visitante_id_fkey(id, nombre, color_principal)"
        )
        .eq("grupo_id", grupoId)
        .order("jornada", { ascending: false })
        .order("hora", { ascending: true })
        .limit(20),
      supabase
        .from("eventos_partido")
        .select(
          "jugador_id, jugador:jugadores(id, nombre, apellidos), equipo:clubs!eventos_partido_equipo_id_fkey(id, nombre), partido:partidos!inner(grupo_id)"
        )
        .eq("tipo", "gol")
        .eq("partido.grupo_id", grupoId),
    ]);

  // Agrupar goles
  const golesMap = {};
  (goleadores || []).forEach((e) => {
    if (!e.jugador) return;
    const jid = e.jugador_id;
    if (!golesMap[jid]) {
      golesMap[jid] = {
        id: e.jugador.id,
        nombre: e.jugador.nombre,
        apellidos: e.jugador.apellidos,
        equipo: e.equipo?.nombre,
        goles: 0,
      };
    }
    golesMap[jid].goles++;
  });
  const topGoleadores = Object.values(golesMap)
    .sort((a, b) => b.goles - a.goles)
    .slice(0, 10);

  // Agrupar partidos por jornada
  const jornadasMap = {};
  (partidos || []).forEach((p) => {
    if (!jornadasMap[p.jornada]) jornadasMap[p.jornada] = [];
    jornadasMap[p.jornada].push(p);
  });
  const jornadas = Object.entries(jornadasMap).sort(
    ([a], [b]) => Number(b) - Number(a)
  );

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <header className="px-4 py-4 border-b border-gray-100">
        <Link
          href="/ligas"
          className="text-xs text-[#1DB954] font-semibold hover:underline"
        >
          ← Ligas
        </Link>
        <h1 className="text-xl font-bold mt-1">{liga.nombre}</h1>
        <p className="text-xs text-gray-400">
          Temporada {liga.temporada?.nombre}
        </p>
      </header>

      {/* Clasificación completa */}
      <section className="px-4 py-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">
          Clasificación
        </h2>
        <div className="bg-gray-50 rounded-xl overflow-hidden">
          <div className="grid grid-cols-[28px_1fr_28px_28px_28px_28px_28px_36px] gap-0.5 px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-gray-400">
            <span>#</span>
            <span>Equipo</span>
            <span className="text-center">PJ</span>
            <span className="text-center">PG</span>
            <span className="text-center">PE</span>
            <span className="text-center">PP</span>
            <span className="text-center">DG</span>
            <span className="text-center">Pts</span>
          </div>
          {(clasificacion || []).map((row, i) => (
            <Link
              key={row.id}
              href={`/clubes/${row.club?.id}`}
              className="grid grid-cols-[28px_1fr_28px_28px_28px_28px_28px_36px] gap-0.5 px-3 py-2.5 text-xs border-t border-gray-100 items-center hover:bg-gray-100 transition-colors"
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  i < 2
                    ? "bg-[#1DB954]/10 text-[#1DB954]"
                    : i >= (clasificacion?.length || 0) - 2
                      ? "bg-red-50 text-red-400"
                      : "text-gray-400"
                }`}
              >
                {i + 1}
              </span>
              <div className="flex items-center gap-1.5 overflow-hidden">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: row.club?.color_principal || "#888",
                  }}
                />
                <span className="font-semibold truncate">
                  {row.club?.nombre}
                </span>
              </div>
              <span className="text-center text-gray-500">{row.pj}</span>
              <span className="text-center text-gray-500">{row.pg}</span>
              <span className="text-center text-gray-500">{row.pe}</span>
              <span className="text-center text-gray-500">{row.pp}</span>
              <span
                className={`text-center font-medium ${row.gf - row.gc > 0 ? "text-[#1DB954]" : row.gf - row.gc < 0 ? "text-red-400" : "text-gray-400"}`}
              >
                {row.gf - row.gc > 0 ? "+" : ""}
                {row.gf - row.gc}
              </span>
              <span className="text-center font-bold text-gray-900">
                {row.puntos}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Jornadas */}
      <section className="px-4 pb-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">
          Resultados por jornada
        </h2>
        {jornadas.map(([jornada, partidos]) => (
          <div key={jornada} className="mb-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Jornada {jornada}
            </h3>
            <div className="space-y-1.5">
              {partidos.map((p) => (
                <div
                  key={p.id}
                  className="bg-gray-50 rounded-lg p-2.5 flex items-center gap-2 text-xs"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-3.5 h-3.5 rounded-full"
                        style={{
                          backgroundColor:
                            p.local?.color_principal || "#888",
                        }}
                      />
                      <span
                        className={`font-semibold ${p.estado === "finalizado" && p.goles_local > p.goles_visitante ? "text-[#1DB954]" : ""}`}
                      >
                        {p.local?.nombre}
                      </span>
                      <span className="ml-auto font-bold tabular-nums">
                        {p.estado !== "programado" ? p.goles_local : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-3.5 h-3.5 rounded-full"
                        style={{
                          backgroundColor:
                            p.visitante?.color_principal || "#888",
                        }}
                      />
                      <span
                        className={`font-semibold ${p.estado === "finalizado" && p.goles_visitante > p.goles_local ? "text-[#1DB954]" : ""}`}
                      >
                        {p.visitante?.nombre}
                      </span>
                      <span className="ml-auto font-bold tabular-nums">
                        {p.estado !== "programado" ? p.goles_visitante : ""}
                      </span>
                    </div>
                  </div>
                  <div className="text-center min-w-[40px]">
                    {p.estado === "en_vivo" ? (
                      <span className="text-[10px] font-bold text-red-500">
                        Vivo
                      </span>
                    ) : p.estado === "finalizado" ? (
                      <span className="text-[9px] font-semibold text-gray-400 uppercase">
                        Final
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-gray-500">
                        {p.hora?.slice(0, 5)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Goleadores */}
      {topGoleadores.length > 0 && (
        <section className="px-4 pb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">
            Goleadores
          </h2>
          <div className="bg-gray-50 rounded-xl overflow-hidden">
            {topGoleadores.map((g, i) => (
              <Link
                key={g.id}
                href={`/jugadores/${g.id}`}
                className="flex items-center gap-3 px-3 py-2.5 border-t border-gray-100 first:border-0 hover:bg-gray-100 transition-colors"
              >
                <span className="text-xs font-bold text-gray-400 w-5 text-center">
                  {i + 1}
                </span>
                <div className="w-8 h-8 rounded-full bg-[#1DB954]/10 text-[#1DB954] flex items-center justify-center text-xs font-bold">
                  {g.nombre?.[0]}
                  {g.apellidos?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {g.nombre} {g.apellidos?.split(" ")[0]}
                  </p>
                  <p className="text-[10px] text-gray-400">{g.equipo}</p>
                </div>
                <span className="text-lg font-bold text-[#1DB954]">
                  {g.goles}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
