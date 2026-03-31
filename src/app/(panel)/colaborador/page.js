"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import Link from "next/link";

export default function ColaboradorPage() {
  const [club, setClub] = useState(null);
  const [partidos, setPartidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [partidoActivo, setPartidoActivo] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obtener club del colaborador
      const { data: colab } = await supabase
        .from("colaboradores")
        .select("club:clubs(id, nombre, color_principal)")
        .eq("usuario_id", user.id)
        .eq("aprobado", true)
        .single();

      if (!colab?.club) {
        setLoading(false);
        return;
      }

      setClub(colab.club);

      // Partidos del club
      const { data: partidosData } = await supabase
        .from("partidos")
        .select(
          "*, local:clubs!partidos_local_id_fkey(id, nombre), visitante:clubs!partidos_visitante_id_fkey(id, nombre)"
        )
        .or(
          `local_id.eq.${colab.club.id},visitante_id.eq.${colab.club.id}`
        )
        .order("fecha", { ascending: false })
        .limit(10);

      setPartidos(partidosData || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center text-gray-400 text-sm">
        Cargando...
      </div>
    );
  }

  if (!club) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <span className="text-4xl">🔒</span>
        <h1 className="text-lg font-bold mt-4">Sin acceso de colaborador</h1>
        <p className="text-sm text-gray-500 mt-2">
          No tienes un club asignado como colaborador, o tu solicitud aún está
          pendiente de aprobación.
        </p>
        <Link
          href="/clubes"
          className="inline-block mt-4 text-sm font-semibold text-[#1DB954] hover:underline"
        >
          Buscar un club para colaborar →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <header className="px-4 py-4 border-b border-gray-100">
        <p className="text-xs text-[#1DB954] font-semibold">Panel de colaborador</p>
        <h1 className="text-xl font-bold">{club.nombre}</h1>
      </header>

      {/* Partidos */}
      <section className="p-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">
          Partidos
        </h2>
        <div className="space-y-2">
          {partidos.map((p) => (
            <div key={p.id}>
              <button
                onClick={() =>
                  setPartidoActivo(partidoActivo === p.id ? null : p.id)
                }
                className="w-full bg-gray-50 rounded-xl p-3 flex items-center gap-3 hover:bg-gray-100 transition-colors text-left"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold">{p.local?.nombre}</span>
                    <span className="ml-auto font-bold tabular-nums">
                      {p.estado !== "programado" ? p.goles_local : "-"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold">{p.visitante?.nombre}</span>
                    <span className="ml-auto font-bold tabular-nums">
                      {p.estado !== "programado" ? p.goles_visitante : "-"}
                    </span>
                  </div>
                </div>
                <div className="text-center min-w-[52px]">
                  <span
                    className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                      p.estado === "en_vivo"
                        ? "bg-red-50 text-red-500"
                        : p.estado === "finalizado"
                          ? "bg-gray-100 text-gray-400"
                          : "bg-blue-50 text-blue-500"
                    }`}
                  >
                    {p.estado === "en_vivo"
                      ? "Vivo"
                      : p.estado === "finalizado"
                        ? "Final"
                        : "Prog."}
                  </span>
                </div>
              </button>

              {partidoActivo === p.id && (
                <PartidoEditor
                  partido={p}
                  clubId={club.id}
                  supabase={supabase}
                  onUpdate={(updated) => {
                    setPartidos((prev) =>
                      prev.map((pp) =>
                        pp.id === updated.id ? { ...pp, ...updated } : pp
                      )
                    );
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PartidoEditor({ partido, clubId, supabase, onUpdate }) {
  const [golesLocal, setGolesLocal] = useState(partido.goles_local || 0);
  const [golesVisitante, setGolesVisitante] = useState(partido.goles_visitante || 0);
  const [estado, setEstado] = useState(partido.estado);
  const [eventos, setEventos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [nuevoEvento, setNuevoEvento] = useState({
    tipo: "gol",
    minuto: "",
  });

  useEffect(() => {
    loadEventos();
  }, []);

  async function loadEventos() {
    const { data } = await supabase
      .from("eventos_partido")
      .select("*, jugador:jugadores(nombre, apellidos)")
      .eq("partido_id", partido.id)
      .order("minuto", { ascending: true });
    setEventos(data || []);
  }

  async function guardarResultado() {
    setSaving(true);
    await supabase
      .from("partidos")
      .update({
        goles_local: golesLocal,
        goles_visitante: golesVisitante,
        estado,
      })
      .eq("id", partido.id);

    onUpdate({
      id: partido.id,
      goles_local: golesLocal,
      goles_visitante: golesVisitante,
      estado,
    });
    setSaving(false);
  }

  async function agregarEvento() {
    if (!nuevoEvento.minuto) return;
    setSaving(true);
    await supabase.from("eventos_partido").insert({
      partido_id: partido.id,
      tipo: nuevoEvento.tipo,
      minuto: parseInt(nuevoEvento.minuto),
      equipo_id: clubId,
    });
    setNuevoEvento({ tipo: "gol", minuto: "" });
    await loadEventos();
    setSaving(false);
  }

  const tipoIcon = { gol: "⚽", amarilla: "🟨", roja: "🟥", cambio: "🔄" };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mt-1 mb-2 space-y-4">
      {/* Resultado */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
          Resultado
        </h4>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs text-gray-500 block mb-1">
              {partido.local?.nombre}
            </label>
            <input
              type="number"
              min="0"
              value={golesLocal}
              onChange={(e) => setGolesLocal(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-[#1DB954]/30"
            />
          </div>
          <span className="text-gray-300 font-bold text-lg mt-5">-</span>
          <div className="flex-1">
            <label className="text-xs text-gray-500 block mb-1">
              {partido.visitante?.nombre}
            </label>
            <input
              type="number"
              min="0"
              value={golesVisitante}
              onChange={(e) => setGolesVisitante(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-[#1DB954]/30"
            />
          </div>
        </div>
      </div>

      {/* Estado */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">
          Estado
        </label>
        <div className="flex gap-2">
          {["programado", "en_vivo", "finalizado"].map((e) => (
            <button
              key={e}
              onClick={() => setEstado(e)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                estado === e
                  ? e === "en_vivo"
                    ? "bg-red-500 text-white"
                    : e === "finalizado"
                      ? "bg-gray-800 text-white"
                      : "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {e === "programado"
                ? "Programado"
                : e === "en_vivo"
                  ? "En vivo"
                  : "Finalizado"}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={guardarResultado}
        disabled={saving}
        className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[#1DB954] text-white hover:bg-[#17a34a] disabled:opacity-50"
      >
        {saving ? "Guardando..." : "Guardar resultado"}
      </button>

      {/* Eventos */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
          Eventos
        </h4>

        {eventos.length > 0 && (
          <div className="space-y-1 mb-3">
            {eventos.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5 text-xs"
              >
                <span>{tipoIcon[ev.tipo] || "📝"}</span>
                <span className="font-semibold tabular-nums">{ev.minuto}&apos;</span>
                <span className="text-gray-500">
                  {ev.jugador
                    ? `${ev.jugador.nombre} ${ev.jugador.apellidos?.split(" ")[0] || ""}`
                    : ev.tipo}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Nuevo evento rápido */}
        <div className="flex gap-2">
          <select
            value={nuevoEvento.tipo}
            onChange={(e) =>
              setNuevoEvento((prev) => ({ ...prev, tipo: e.target.value }))
            }
            className="border border-gray-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1DB954]/30"
          >
            <option value="gol">⚽ Gol</option>
            <option value="amarilla">🟨 Amarilla</option>
            <option value="roja">🟥 Roja</option>
            <option value="cambio">🔄 Cambio</option>
          </select>
          <input
            type="number"
            placeholder="Min"
            min="1"
            max="120"
            value={nuevoEvento.minuto}
            onChange={(e) =>
              setNuevoEvento((prev) => ({ ...prev, minuto: e.target.value }))
            }
            className="w-16 border border-gray-200 rounded-lg px-2 py-2 text-xs text-center focus:outline-none focus:ring-2 focus:ring-[#1DB954]/30"
          />
          <button
            onClick={agregarEvento}
            disabled={saving || !nuevoEvento.minuto}
            className="flex-1 py-2 rounded-lg text-xs font-semibold bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50"
          >
            Añadir
          </button>
        </div>
      </div>
    </div>
  );
}
