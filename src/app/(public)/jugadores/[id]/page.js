import { createClient } from "@/lib/supabase-server";
import Link from "next/link";

export default async function JugadorPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: jugador } = await supabase
    .from("jugadores")
    .select("*")
    .eq("id", id)
    .single();

  if (!jugador) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <p className="text-gray-400">Jugador no encontrado</p>
      </div>
    );
  }

  // Club actual
  const { data: clubActual } = await supabase
    .from("jugador_club")
    .select("dorsal, club:clubs(id, nombre, color_principal)")
    .eq("jugador_id", id)
    .eq("activo", true)
    .single();

  // Estadísticas de eventos
  const { data: eventos } = await supabase
    .from("eventos_partido")
    .select("tipo, minuto")
    .eq("jugador_id", id);

  const stats = {
    goles: 0,
    amarillas: 0,
    rojas: 0,
  };
  (eventos || []).forEach((e) => {
    if (e.tipo === "gol") stats.goles++;
    if (e.tipo === "amarilla") stats.amarillas++;
    if (e.tipo === "roja") stats.rojas++;
  });

  // Historial de clubs
  const { data: historial } = await supabase
    .from("jugador_club")
    .select("dorsal, temporada:temporadas(nombre), club:clubs(id, nombre, color_principal)")
    .eq("jugador_id", id)
    .order("created_at", { ascending: false });

  const posLabel = {
    portero: "Portero",
    defensa: "Defensa",
    centrocampista: "Centrocampista",
    delantero: "Delantero",
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Cabecera */}
      <header className="px-4 pt-4 pb-6 bg-gray-50">
        <Link
          href="/jugadores"
          className="text-xs text-[#1DB954] font-semibold hover:underline"
        >
          ← Jugadores
        </Link>

        <div className="flex items-center gap-4 mt-3">
          <div className="w-16 h-16 rounded-full bg-[#1DB954]/10 text-[#1DB954] flex items-center justify-center text-2xl font-bold">
            {jugador.nombre?.[0]}
            {jugador.apellidos?.[0]}
          </div>
          <div>
            <h1 className="text-xl font-bold">
              {jugador.nombre} {jugador.apellidos}
            </h1>
            {jugador.posicion && (
              <p className="text-sm text-gray-500">
                {posLabel[jugador.posicion] || jugador.posicion}
              </p>
            )}
            {clubActual?.club && (
              <Link
                href={`/clubes/${clubActual.club.id}`}
                className="text-sm text-[#1DB954] font-semibold hover:underline"
              >
                {clubActual.club.nombre} · #{clubActual.dorsal}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Stats */}
      <section className="px-4 py-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">
          Estadísticas temporada
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-[#1DB954]">{stats.goles}</p>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mt-1">
              Goles
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-yellow-500">
              {stats.amarillas}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mt-1">
              Amarillas
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-500">{stats.rojas}</p>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mt-1">
              Rojas
            </p>
          </div>
        </div>
      </section>

      {/* Historial */}
      {historial && historial.length > 0 && (
        <section className="px-4 pb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">
            Historial
          </h2>
          <div className="space-y-2">
            {historial.map((h, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2.5"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{
                    backgroundColor: h.club?.color_principal || "#888",
                  }}
                >
                  {h.club?.nombre?.[0]}
                </div>
                <div className="flex-1">
                  <Link
                    href={`/clubes/${h.club?.id}`}
                    className="text-sm font-semibold hover:underline"
                  >
                    {h.club?.nombre}
                  </Link>
                  <p className="text-xs text-gray-400">
                    Temporada {h.temporada?.nombre} · #{h.dorsal}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
