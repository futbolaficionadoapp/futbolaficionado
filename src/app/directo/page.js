import { createClient } from "@/lib/supabase-server";
import Link from "next/link";

export const revalidate = 30;

export default async function DirectoPage() {
  const supabase = await createClient();

  const { data: partidos } = await supabase
    .from("partidos")
    .select(
      "*, local:clubs!partidos_local_id_fkey(id, nombre, escudo_url, color_principal), visitante:clubs!partidos_visitante_id_fkey(id, nombre, escudo_url, color_principal), grupo:grupos(id, nombre, liga:ligas(id, nombre, categoria))"
    )
    .eq("estado", "en_vivo")
    .order("hora", { ascending: true });

  return (
    <div className="max-w-lg mx-auto pb-24">
      <header className="px-4 py-4 border-b border-gray-100 flex items-center gap-3">
        <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shrink-0" />
        <h1 className="text-lg font-extrabold">En Directo</h1>
      </header>

      <div className="px-4 py-4">
        {!partidos || partidos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.55a11 11 0 0114.08 0" />
                <path d="M1.42 9a16 16 0 0121.16 0" />
                <path d="M8.53 16.11a6 6 0 016.95 0" />
                <circle cx="12" cy="20" r="1" fill="#9ca3af" stroke="none" />
              </svg>
            </div>
            <p className="text-base font-bold text-gray-700 mb-1">No hay partidos en juego</p>
            <p className="text-sm text-gray-400">Cuando haya partidos en directo aparecerán aquí</p>
          </div>
        ) : (
          <div className="space-y-3">
            {partidos.map((partido) => (
              <PartidoEnVivo key={partido.id} partido={partido} />
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
      className={`${dim} rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white`}
      style={{ backgroundColor: club?.color_principal || "#888" }}
    >
      {club?.nombre?.[0]}
    </div>
  );
}

function PartidoEnVivo({ partido }) {
  return (
    <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
      {/* Competición */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-1">
        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
        <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">En vivo</span>
        {partido.grupo?.liga && (
          <span className="text-[10px] text-gray-400 ml-auto truncate">
            {partido.grupo.liga.nombre}
          </span>
        )}
      </div>

      {/* Marcador */}
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2.5">
          <Escudo club={partido.local} />
          <span className="font-bold text-sm flex-1 min-w-0 truncate">{partido.local?.nombre}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-2xl font-extrabold tabular-nums">{partido.goles_local ?? 0}</span>
          <span className="text-gray-300 text-lg">—</span>
          <span className="text-2xl font-extrabold tabular-nums">{partido.goles_visitante ?? 0}</span>
        </div>
        <div className="flex-1 flex items-center gap-2.5 flex-row-reverse">
          <Escudo club={partido.visitante} />
          <span className="font-bold text-sm flex-1 min-w-0 truncate text-right">{partido.visitante?.nombre}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-3 flex items-center justify-between">
        <span className="text-xs text-gray-400">{partido.hora?.slice(0, 5)}</span>
        <Link
          href={`/partidos/${partido.id}`}
          className="text-xs font-semibold text-[#1DB954] hover:underline"
        >
          Ver detalles →
        </Link>
      </div>
    </div>
  );
}
