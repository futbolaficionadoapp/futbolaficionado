import { createClient } from "@/lib/supabase-server";
import Link from "next/link";

export default async function LigasPage() {
  const supabase = await createClient();

  const { data: ligas } = await supabase
    .from("ligas")
    .select("*, temporada:temporadas(nombre), grupos(id, nombre)")
    .eq("activa", true);

  return (
    <div className="max-w-lg mx-auto">
      <header className="px-4 py-4 border-b border-gray-100">
        <h1 className="text-xl font-bold">Ligas</h1>
        <p className="text-xs text-gray-400">
          Categorías disponibles en esta temporada
        </p>
      </header>

      <div className="p-4 space-y-3">
        {(ligas || []).map((liga) => (
          <Link
            key={liga.id}
            href={`/ligas/${liga.id}`}
            className="block bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-sm">{liga.nombre}</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Temporada {liga.temporada?.nombre}
                </p>
              </div>
              <span className="text-xs font-semibold text-[#1DB954] bg-[#1DB954]/10 px-2 py-1 rounded-full">
                {liga.categoria}
              </span>
            </div>
          </Link>
        ))}

        {(!ligas || ligas.length === 0) && (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">
              No hay ligas disponibles aún
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
