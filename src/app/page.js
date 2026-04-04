import { createClient } from "@/lib/supabase-server";
import AuthButton from "@/components/AuthButton";
import ClubHome from "@/components/ClubHome";
import Link from "next/link";

export default async function Home() {
  const supabase = await createClient();

  // Get user + perfil server-side
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let perfil = null;
  if (user) {
    const { data } = await supabase
      .from("perfiles")
      .select("id, club_favorito_id, rol")
      .eq("id", user.id)
      .single();
    perfil = data;
  }

  const clubId = perfil?.club_favorito_id;
  const isAdmin = perfil?.rol === "admin";

  // ---- Club selected: fetch all club data server-side ----
  if (clubId) {
    const [
      { data: club },
      { data: clasi },
      { data: partidos },
      { data: plantilla },
      { data: golesEv },
      { data: asistEv },
      { count: seguidosCount },
      { count: favoritosCount },
    ] = await Promise.all([
      supabase.from("clubs").select("*").eq("id", clubId).single(),

      supabase
        .from("clasificacion")
        .select(
          "*, grupo:grupos(id, liga:ligas(id, nombre, logo_url, categoria))"
        )
        .eq("club_id", clubId)
        .maybeSingle(),

      supabase
        .from("partidos")
        .select(
          "*, local:clubs!partidos_local_id_fkey(id, nombre, escudo_url, color_principal), visitante:clubs!partidos_visitante_id_fkey(id, nombre, escudo_url, color_principal)"
        )
        .or(`local_id.eq.${clubId},visitante_id.eq.${clubId}`)
        .order("fecha", { ascending: false })
        .limit(30),

      supabase
        .from("jugador_club")
        .select(
          "dorsal, jugador:jugadores(id, nombre, apellidos, posicion)"
        )
        .eq("club_id", clubId)
        .eq("activo", true)
        .order("dorsal", { ascending: true }),

      supabase
        .from("eventos_partido")
        .select("jugador_id, jugador:jugadores(id, nombre, apellidos)")
        .eq("equipo_id", clubId)
        .eq("tipo", "gol"),

      supabase
        .from("eventos_partido")
        .select("jugador_id, jugador:jugadores(id, nombre, apellidos)")
        .eq("equipo_id", clubId)
        .eq("tipo", "asistencia"),

      supabase
        .from("equipos_seguidos")
        .select("*", { count: "exact", head: true })
        .eq("club_id", clubId),

      supabase
        .from("perfiles")
        .select("*", { count: "exact", head: true })
        .eq("club_favorito_id", clubId),
    ]);

    let tabla = [];
    let jornadaPartidos = [];

    if (clasi?.grupo_id) {
      const [{ data: tablaData }, { data: jornadaData }] = await Promise.all([
        supabase
          .from("clasificacion")
          .select(
            "*, club:clubs(id, nombre, escudo_url, color_principal)"
          )
          .eq("grupo_id", clasi.grupo_id)
          .order("puntos", { ascending: false }),

        supabase
          .from("partidos")
          .select(
            "*, local:clubs!partidos_local_id_fkey(id, nombre, escudo_url, color_principal), visitante:clubs!partidos_visitante_id_fkey(id, nombre, escudo_url, color_principal)"
          )
          .eq("grupo_id", clasi.grupo_id)
          .order("jornada", { ascending: true })
          .order("hora", { ascending: true }),
      ]);
      tabla = tablaData || [];
      jornadaPartidos = jornadaData || [];
    }

    if (!club) {
      // Club was deleted or inaccessible — fall through to generic home
    } else {
      return (
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <header className="px-4 py-4 flex items-center justify-between border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold tracking-tight">
                <span className="text-[#1a2744]">FÚTBOL</span>
                <span className="text-[#1DB954]"> AFICIONADO</span>
              </h1>
            </div>
            <div className="flex items-center gap-2">
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

          {/* Full club dashboard */}
          <ClubHome
            club={club}
            perfil={perfil}
            clasi={clasi}
            tabla={tabla}
            partidos={partidos || []}
            jornadaPartidos={jornadaPartidos}
            plantilla={plantilla || []}
            golesEv={golesEv || []}
            asistEv={asistEv || []}
            seguidores={(seguidosCount || 0) + (favoritosCount || 0)}
            isAdmin={isAdmin}
          />
        </div>
      );
    }
  }

  // ---- Generic home (no club selected) ----
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
      .gte("fecha", hoy)
      .order("fecha", { ascending: true })
      .order("hora", { ascending: true })
      .limit(30),
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
          <h1 className="text-lg font-extrabold tracking-tight">
            <span className="text-[#1a2744]">FÚTBOL</span>
            <span className="text-[#1DB954]"> AFICIONADO</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Próximos partidos */}
      <ProximosPartidos partidos={partidos} hoy={hoy} />

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
                <span className="flex items-center gap-1.5 min-w-0">
                  <Escudo club={row.club} size="sm" />
                  <span className="font-semibold truncate">{row.club?.nombre}</span>
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
            {topGoleadores.map((g) => (
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

function Escudo({ club, size = "sm" }) {
  const dim = size === "sm" ? "w-6 h-6" : "w-8 h-8";
  if (club?.escudo_url) {
    return (
      <div className={`${dim} shrink-0 flex items-center justify-center`}>
        <img src={club.escudo_url} alt={club.nombre} className="w-full h-full object-contain" />
      </div>
    );
  }
  return (
    <div
      className={`${dim} rounded-full shrink-0 flex items-center justify-center text-[8px] font-bold text-white`}
      style={{ backgroundColor: club?.color_principal || "#888" }}
    >
      {club?.nombre?.[0]}
    </div>
  );
}

function ProximosPartidos({ partidos, hoy }) {
  if (!partidos || partidos.length === 0) {
    return (
      <section className="px-4 pb-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">
          Próximos partidos
        </h2>
        <div className="bg-gray-50 rounded-xl p-6 text-center">
          <p className="text-gray-400 text-sm">No hay partidos programados</p>
        </div>
      </section>
    );
  }

  // Agrupar por fecha
  const grupos = {};
  for (const p of partidos) {
    if (!grupos[p.fecha]) grupos[p.fecha] = [];
    grupos[p.fecha].push(p);
  }

  const hayEnVivo = partidos.some((p) => p.estado === "en_vivo");

  return (
    <section className="px-4 pb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
          Próximos partidos
        </h2>
        {hayEnVivo && (
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            En vivo
          </span>
        )}
      </div>

      <div className="space-y-4">
        {Object.entries(grupos).map(([fecha, ps]) => {
          const esHoy = fecha === hoy;
          const labelFecha = esHoy
            ? "Hoy"
            : new Date(fecha + "T12:00:00").toLocaleDateString("es-ES", {
                weekday: "short",
                day: "numeric",
                month: "short",
              });

          return (
            <div key={fecha}>
              <p
                className={`text-xs font-bold uppercase tracking-wider mb-2 ${
                  esHoy ? "text-[#1DB954]" : "text-gray-400"
                }`}
              >
                {labelFecha}
              </p>
              <div className="space-y-2">
                {ps.map((partido) => (
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
                        <Escudo club={partido.local} size="sm" />
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
                          {partido.estado !== "programado"
                            ? partido.goles_local
                            : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Escudo club={partido.visitante} size="sm" />
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
                          {partido.estado !== "programado"
                            ? partido.goles_visitante
                            : ""}
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
            </div>
          );
        })}
      </div>
    </section>
  );
}
