import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import SeguirClubButton from "@/components/SeguirClubButton";
import SolicitarColaboradorButton from "@/components/SolicitarColaboradorButton";
import AdminClubEditOverlay from "@/components/AdminClubEditOverlay";

export default async function ClubPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: club } = await supabase
    .from("clubs")
    .select("*")
    .eq("id", id)
    .single();

  if (!club) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <p className="text-gray-400">Club no encontrado</p>
      </div>
    );
  }

  const [{ data: plantilla }, { data: partidos }, { data: clasificacion }] =
    await Promise.all([
      supabase
        .from("jugador_club")
        .select("dorsal, jugador:jugadores(id, nombre, apellidos, posicion)")
        .eq("club_id", id)
        .eq("activo", true)
        .order("dorsal", { ascending: true }),
      supabase
        .from("partidos")
        .select(
          "*, local:clubs!partidos_local_id_fkey(id, nombre, color_principal), visitante:clubs!partidos_visitante_id_fkey(id, nombre, color_principal)"
        )
        .or(`local_id.eq.${id},visitante_id.eq.${id}`)
        .order("fecha", { ascending: false })
        .limit(10),
      supabase
        .from("clasificacion")
        .select("*")
        .eq("club_id", id)
        .limit(1)
        .single(),
    ]);

  // Goles del club (para stats)
  const { data: goles } = await supabase
    .from("eventos_partido")
    .select(
      "jugador_id, jugador:jugadores(id, nombre, apellidos), minuto"
    )
    .eq("equipo_id", id)
    .eq("tipo", "gol");

  // Máximo goleador
  const golesMap = {};
  (goles || []).forEach((g) => {
    if (!g.jugador) return;
    if (!golesMap[g.jugador_id]) {
      golesMap[g.jugador_id] = {
        ...g.jugador,
        goles: 0,
      };
    }
    golesMap[g.jugador_id].goles++;
  });
  const maxGoleador = Object.values(golesMap).sort(
    (a, b) => b.goles - a.goles
  )[0];

  // Forma (últimos 5 partidos finalizados)
  const finalizados = (partidos || [])
    .filter((p) => p.estado === "finalizado")
    .slice(0, 5);

  const forma = finalizados.map((p) => {
    const esLocal = p.local_id === id;
    const gf = esLocal ? p.goles_local : p.goles_visitante;
    const gc = esLocal ? p.goles_visitante : p.goles_local;
    if (gf > gc) return "V";
    if (gf === gc) return "E";
    return "D";
  });

  // Agrupar plantilla por posición
  const posiciones = ["portero", "defensa", "centrocampista", "delantero"];
  const plantillaAgrupada = {};
  posiciones.forEach((pos) => {
    plantillaAgrupada[pos] = (plantilla || []).filter(
      (j) => j.jugador?.posicion === pos
    );
  });

  const posLabel = {
    portero: "Porteros",
    defensa: "Defensas",
    centrocampista: "Centrocampistas",
    delantero: "Delanteros",
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Admin inline editing overlay */}
      <AdminClubEditOverlay clubId={id} clubNombre={club.nombre} />

      {/* Cabecera con colores del club */}
      <header
        className="px-4 pt-4 pb-6 text-white"
        style={{ backgroundColor: club.color_principal || "#1DB954" }}
      >
        <Link
          href="/clubes"
          className="text-xs font-semibold opacity-80 hover:opacity-100"
        >
          ← Clubes
        </Link>
        <div className="flex items-center gap-4 mt-3">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
            {club.nombre?.[0]}
          </div>
          <div>
            <h1 className="text-xl font-bold">{club.nombre}</h1>
            <p className="text-sm opacity-80">
              {club.municipio}
              {club.provincia ? `, ${club.provincia}` : ""}
            </p>
            {club.fundacion && (
              <p className="text-xs opacity-60">
                Fundado en {club.fundacion}
              </p>
            )}
          </div>
        </div>

        {/* Botones seguir y colaborar */}
        <div className="flex gap-2 mt-4">
          <SeguirClubButton clubId={id} />
          <SolicitarColaboradorButton clubId={id} clubNombre={club.nombre} />
        </div>

        {/* Stats rápidas */}
        {clasificacion && (
          <div className="flex gap-4 mt-4">
            {[
              { label: "Posición", value: "-" },
              { label: "Puntos", value: clasificacion.puntos },
              { label: "Goles", value: clasificacion.gf },
              { label: "Victorias", value: clasificacion.pg },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-[10px] uppercase tracking-wider opacity-70">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        )}
      </header>

      {/* Resumen */}
      <section className="px-4 py-4">
        {/* Forma */}
        {forma.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              Forma reciente
            </h3>
            <div className="flex gap-1.5">
              {forma.map((r, i) => (
                <span
                  key={i}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    r === "V"
                      ? "bg-[#1DB954]/15 text-[#1DB954]"
                      : r === "E"
                        ? "bg-yellow-100 text-yellow-600"
                        : "bg-red-50 text-red-500"
                  }`}
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Máximo goleador */}
        {maxGoleador && (
          <div className="mb-4 bg-gray-50 rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1DB954]/10 text-[#1DB954] flex items-center justify-center text-sm font-bold">
              {maxGoleador.nombre?.[0]}
              {maxGoleador.apellidos?.[0]}
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-400">Máximo goleador</p>
              <Link
                href={`/jugadores/${maxGoleador.id}`}
                className="text-sm font-semibold hover:underline"
              >
                {maxGoleador.nombre} {maxGoleador.apellidos?.split(" ")[0]}
              </Link>
            </div>
            <span className="text-xl font-bold text-[#1DB954]">
              {maxGoleador.goles}
            </span>
          </div>
        )}
      </section>

      {/* Plantilla */}
      <section className="px-4 pb-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">
          Plantilla
        </h2>
        {posiciones.map((pos) =>
          plantillaAgrupada[pos]?.length > 0 ? (
            <div key={pos} className="mb-3">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                {posLabel[pos]}
              </h3>
              <div className="space-y-1">
                {plantillaAgrupada[pos].map((j) => (
                  <Link
                    key={j.jugador?.id}
                    href={`/jugadores/${j.jugador?.id}`}
                    className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-xs font-bold text-gray-400 w-6 text-center tabular-nums">
                      {j.dorsal}
                    </span>
                    <span className="text-sm font-medium">
                      {j.jugador?.nombre} {j.jugador?.apellidos?.split(" ")[0]}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null
        )}
        {(!plantilla || plantilla.length === 0) && (
          <p className="text-gray-400 text-sm">Plantilla no disponible aún</p>
        )}
      </section>

      {/* Partidos */}
      <section className="px-4 pb-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">
          Partidos
        </h2>
        <div className="space-y-1.5">
          {(partidos || []).map((p) => {
            const esLocal = p.local_id === id;
            return (
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
                      className={`font-semibold ${p.local_id === id ? "text-gray-900" : "text-gray-500"} ${p.estado === "finalizado" && p.goles_local > p.goles_visitante ? "text-[#1DB954]" : ""}`}
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
                      className={`font-semibold ${p.visitante_id === id ? "text-gray-900" : "text-gray-500"} ${p.estado === "finalizado" && p.goles_visitante > p.goles_local ? "text-[#1DB954]" : ""}`}
                    >
                      {p.visitante?.nombre}
                    </span>
                    <span className="ml-auto font-bold tabular-nums">
                      {p.estado !== "programado" ? p.goles_visitante : ""}
                    </span>
                  </div>
                </div>
                <div className="text-center min-w-[44px]">
                  {p.estado === "en_vivo" ? (
                    <span className="text-[10px] font-bold text-red-500">
                      Vivo
                    </span>
                  ) : p.estado === "finalizado" ? (
                    <span className="text-[9px] text-gray-400 uppercase">
                      J{p.jornada}
                    </span>
                  ) : (
                    <div>
                      <p className="text-[10px] font-semibold text-gray-500">
                        {p.hora?.slice(0, 5)}
                      </p>
                      <p className="text-[9px] text-gray-400">J{p.jornada}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
