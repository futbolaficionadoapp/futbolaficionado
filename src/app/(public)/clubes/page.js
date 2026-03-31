import { createClient } from "@/lib/supabase-server";
import Link from "next/link";

export default async function ClubesPage() {
  const supabase = await createClient();

  const { data: clubs } = await supabase
    .from("clubs")
    .select("*")
    .order("nombre", { ascending: true });

  return (
    <div className="max-w-lg mx-auto">
      <header className="px-4 py-4 border-b border-gray-100">
        <h1 className="text-xl font-bold">Clubes</h1>
        <p className="text-xs text-gray-400">{clubs?.length || 0} equipos registrados</p>
      </header>

      <div className="p-4 space-y-2">
        {(clubs || []).map((club) => (
          <Link
            key={club.id}
            href={`/clubes/${club.id}`}
            className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 hover:bg-gray-100 transition-colors"
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ backgroundColor: club.color_principal || "#888" }}
            >
              {club.nombre?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{club.nombre}</p>
              <p className="text-xs text-gray-400">
                {club.municipio}{club.provincia ? `, ${club.provincia}` : ""}
              </p>
            </div>
            <span className="text-gray-300">›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
