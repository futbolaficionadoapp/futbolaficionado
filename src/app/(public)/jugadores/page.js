import { createClient } from "@/lib/supabase-server";
import Link from "next/link";

export default async function JugadoresPage() {
  const supabase = await createClient();

  const { data: jugadores } = await supabase
    .from("jugador_club")
    .select(
      "dorsal, jugador:jugadores(id, nombre, apellidos, posicion), club:clubs(id, nombre, color_principal)"
    )
    .eq("activo", true)
    .order("dorsal", { ascending: true });

  const posLabel = {
    portero: "POR",
    defensa: "DEF",
    centrocampista: "MED",
    delantero: "DEL",
  };

  return (
    <div className="max-w-lg mx-auto">
      <header className="px-4 py-4 border-b border-gray-100">
        <h1 className="text-xl font-bold">Jugadores</h1>
        <p className="text-xs text-gray-400">
          {jugadores?.length || 0} jugadores registrados
        </p>
      </header>

      <div className="p-4 space-y-2">
        {(jugadores || []).map((jc) => (
          <Link
            key={jc.jugador?.id}
            href={`/jugadores/${jc.jugador?.id}`}
            className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 hover:bg-gray-100 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-[#1DB954]/10 text-[#1DB954] flex items-center justify-center text-sm font-bold">
              {jc.jugador?.nombre?.[0]}
              {jc.jugador?.apellidos?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">
                {jc.jugador?.nombre} {jc.jugador?.apellidos?.split(" ")[0]}
              </p>
              <p className="text-xs text-gray-400">
                {jc.club?.nombre} · #{jc.dorsal}
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
              {posLabel[jc.jugador?.posicion] || "—"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
