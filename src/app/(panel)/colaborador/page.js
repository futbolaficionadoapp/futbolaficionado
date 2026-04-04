"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import Link from "next/link";

export default function ColaboradorPage() {
  const [club, setClub] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("partidos");
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: colab } = await supabase
        .from("colaboradores")
        .select("club:clubs(id, nombre, color_principal)")
        .eq("usuario_id", user.id)
        .eq("aprobado", true)
        .single();

      if (colab?.club) setClub(colab.club);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="max-w-lg mx-auto px-4 py-12 text-center text-gray-400 text-sm">Cargando...</div>;
  }

  if (!club) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <span className="text-4xl">🔒</span>
        <h1 className="text-lg font-bold mt-4">Sin acceso de colaborador</h1>
        <p className="text-sm text-gray-500 mt-2">
          No tienes un club asignado o tu solicitud está pendiente de aprobación.
        </p>
        <Link href="/clubes" className="inline-block mt-4 text-sm font-semibold text-[#1DB954] hover:underline">
          Buscar un club para colaborar →
        </Link>
      </div>
    );
  }

  const tabs = [
    { id: "partidos", label: "Partidos" },
    { id: "peticiones", label: "Peticiones" },
  ];

  return (
    <div className="max-w-lg mx-auto pb-24">
      <header className="px-4 py-4 border-b border-gray-100">
        <p className="text-xs text-[#1DB954] font-semibold">Panel de colaborador</p>
        <h1 className="text-xl font-bold">{club.nombre}</h1>
      </header>

      <div className="flex border-b border-gray-100">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3 text-xs font-semibold border-b-2 transition-colors ${
              tab === t.id
                ? "border-[#1DB954] text-[#1DB954]"
                : "border-transparent text-gray-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === "partidos" && <PartidosTab club={club} supabase={supabase} />}
        {tab === "peticiones" && <PeticionesTab userId={userId} supabase={supabase} />}
      </div>
    </div>
  );
}

/* ===================== PARTIDOS ===================== */

function PartidosTab({ club, supabase }) {
  const [partidos, setPartidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [partidoActivo, setPartidoActivo] = useState(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("partidos")
      .select("*, local:clubs!partidos_local_id_fkey(id, nombre), visitante:clubs!partidos_visitante_id_fkey(id, nombre)")
      .or(`local_id.eq.${club.id},visitante_id.eq.${club.id}`)
      .order("fecha", { ascending: false })
      .limit(15);
    setPartidos(data || []);
    setLoading(false);
  }, [supabase, club.id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p className="text-gray-400 text-sm">Cargando partidos...</p>;

  return (
    <div className="space-y-2">
      {partidos.map((p) => (
        <div key={p.id}>
          <button
            onClick={() => setPartidoActivo(partidoActivo === p.id ? null : p.id)}
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
              {p.fecha && (
                <p className="text-[10px] text-gray-400">
                  {new Date(p.fecha).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })}
                  {p.hora && ` · ${p.hora.slice(0, 5)}`}
                </p>
              )}
            </div>
            <div className="text-center min-w-[52px]">
              <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                p.estado === "en_vivo" ? "bg-red-50 text-red-500"
                : p.estado === "finalizado" ? "bg-gray-100 text-gray-400"
                : "bg-blue-50 text-blue-500"
              }`}>
                {p.estado === "en_vivo" ? "Vivo" : p.estado === "finalizado" ? "Final" : "Prog."}
              </span>
            </div>
          </button>

          {partidoActivo === p.id && (
            <PartidoEditor
              partido={p}
              clubId={club.id}
              supabase={supabase}
              onUpdate={(updated) => {
                setPartidos((prev) => prev.map((pp) => pp.id === updated.id ? { ...pp, ...updated } : pp));
              }}
            />
          )}
        </div>
      ))}
      {partidos.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-8">No hay partidos registrados</p>
      )}
    </div>
  );
}

function PartidoEditor({ partido, clubId, supabase, onUpdate }) {
  const [golesLocal, setGolesLocal] = useState(partido.goles_local ?? 0);
  const [golesVisitante, setGolesVisitante] = useState(partido.goles_visitante ?? 0);
  const [estado, setEstado] = useState(partido.estado);
  const [fecha, setFecha] = useState(partido.fecha || "");
  const [hora, setHora] = useState(partido.hora ? partido.hora.slice(0, 5) : "");
  const [eventos, setEventos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [nuevoEvento, setNuevoEvento] = useState({ tipo: "gol", minuto: "" });

  useEffect(() => { loadEventos(); }, []);

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
    const payload = {
      goles_local: golesLocal,
      goles_visitante: golesVisitante,
      estado,
      fecha: fecha || null,
      hora: hora || null,
    };
    await supabase.from("partidos").update(payload).eq("id", partido.id);
    onUpdate({ id: partido.id, ...payload });
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

  async function eliminarEvento(id) {
    await supabase.from("eventos_partido").delete().eq("id", id);
    loadEventos();
  }

  const tipoIcon = { gol: "⚽", amarilla: "🟨", roja: "🟥", cambio: "🔄" };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mt-1 mb-2 space-y-4">
      {/* Fecha y hora */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Fecha y hora</h4>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-gray-500 block mb-1">Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1DB954]/30"
            />
          </div>
          <div className="w-28">
            <label className="text-xs text-gray-500 block mb-1">Hora</label>
            <input
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1DB954]/30"
            />
          </div>
        </div>
      </div>

      {/* Resultado */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Resultado</h4>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs text-gray-500 block mb-1">{partido.local?.nombre}</label>
            <input
              type="number" min="0" value={golesLocal}
              onChange={(e) => setGolesLocal(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-[#1DB954]/30"
            />
          </div>
          <span className="text-gray-300 font-bold text-lg mt-5">-</span>
          <div className="flex-1">
            <label className="text-xs text-gray-500 block mb-1">{partido.visitante?.nombre}</label>
            <input
              type="number" min="0" value={golesVisitante}
              onChange={(e) => setGolesVisitante(parseInt(e.target.value) || 0)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-[#1DB954]/30"
            />
          </div>
        </div>
      </div>

      {/* Estado */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">Estado</label>
        <div className="flex gap-2">
          {["programado", "en_vivo", "finalizado"].map((e) => (
            <button key={e} onClick={() => setEstado(e)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                estado === e
                  ? e === "en_vivo" ? "bg-red-500 text-white"
                    : e === "finalizado" ? "bg-gray-800 text-white"
                    : "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {e === "programado" ? "Programado" : e === "en_vivo" ? "En vivo" : "Finalizado"}
            </button>
          ))}
        </div>
      </div>

      <button onClick={guardarResultado} disabled={saving}
        className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[#1DB954] text-white hover:bg-[#17a34a] disabled:opacity-50"
      >
        {saving ? "Guardando..." : "Guardar cambios"}
      </button>

      {/* Eventos */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Eventos</h4>
        {eventos.length > 0 && (
          <div className="space-y-1 mb-3">
            {eventos.map((ev) => (
              <div key={ev.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5 text-xs">
                <span>{tipoIcon[ev.tipo] || "📝"}</span>
                <span className="font-semibold tabular-nums">{ev.minuto}&apos;</span>
                <span className="text-gray-500 flex-1">
                  {ev.jugador ? `${ev.jugador.nombre} ${ev.jugador.apellidos?.split(" ")[0] || ""}` : ev.tipo}
                </span>
                <button onClick={() => eliminarEvento(ev.id)} className="text-gray-300 hover:text-red-400 ml-auto">✕</button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <select
            value={nuevoEvento.tipo}
            onChange={(e) => setNuevoEvento((prev) => ({ ...prev, tipo: e.target.value }))}
            className="border border-gray-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1DB954]/30"
          >
            <option value="gol">⚽ Gol</option>
            <option value="amarilla">🟨 Amarilla</option>
            <option value="roja">🟥 Roja</option>
            <option value="cambio">🔄 Cambio</option>
          </select>
          <input
            type="number" placeholder="Min" min="1" max="120"
            value={nuevoEvento.minuto}
            onChange={(e) => setNuevoEvento((prev) => ({ ...prev, minuto: e.target.value }))}
            className="w-16 border border-gray-200 rounded-lg px-2 py-2 text-xs text-center focus:outline-none focus:ring-2 focus:ring-[#1DB954]/30"
          />
          <button onClick={agregarEvento} disabled={saving || !nuevoEvento.minuto}
            className="flex-1 py-2 rounded-lg text-xs font-semibold bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50"
          >
            Añadir
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================== PETICIONES ===================== */

const TIPO_LABEL = { competicion: "Competición", equipo: "Equipo", jugador: "Jugador" };
const TIPO_ICON = { competicion: "🏆", equipo: "🏟️", jugador: "👤" };
const ESTADO_STYLE = {
  pendiente: "bg-yellow-50 text-yellow-700 border-yellow-200",
  aprobado: "bg-green-50 text-green-700 border-green-200",
  rechazado: "bg-red-50 text-red-600 border-red-200",
};

function PeticionesTab({ userId, supabase }) {
  const [peticiones, setPeticiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creando, setCreando] = useState(null); // null | 'competicion' | 'equipo' | 'jugador'

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("peticiones")
      .select("*")
      .eq("usuario_id", userId)
      .order("created_at", { ascending: false });
    setPeticiones(data || []);
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p className="text-gray-400 text-sm">Cargando...</p>;

  return (
    <div>
      {/* Botones crear */}
      {!creando && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-3">
            Solicita al administrador crear nuevos registros. Sin petición puedes editar fechas, resultados y eventos directamente en la pestaña Partidos.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {["competicion", "equipo", "jugador"].map((tipo) => (
              <button key={tipo} onClick={() => setCreando(tipo)}
                className="flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-[#1DB954] hover:text-[#1DB954] transition-colors"
              >
                <span className="text-2xl">{TIPO_ICON[tipo]}</span>
                <span className="text-[10px] font-semibold">Nueva {TIPO_LABEL[tipo]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Formularios */}
      {creando === "competicion" && (
        <FormPeticionCompeticion
          supabase={supabase} userId={userId}
          onCancel={() => setCreando(null)}
          onSent={() => { setCreando(null); load(); }}
        />
      )}
      {creando === "equipo" && (
        <FormPeticionEquipo
          supabase={supabase} userId={userId}
          onCancel={() => setCreando(null)}
          onSent={() => { setCreando(null); load(); }}
        />
      )}
      {creando === "jugador" && (
        <FormPeticionJugador
          supabase={supabase} userId={userId}
          onCancel={() => setCreando(null)}
          onSent={() => { setCreando(null); load(); }}
        />
      )}

      {/* Lista de peticiones */}
      {!creando && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Mis peticiones ({peticiones.length})
          </p>
          {peticiones.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-6">Todavía no has enviado ninguna petición</p>
          )}
          {peticiones.map((p) => (
            <div key={p.id} className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{TIPO_ICON[p.tipo]}</span>
                <p className="text-sm font-semibold flex-1">{p.datos?.nombre || TIPO_LABEL[p.tipo]}</p>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${ESTADO_STYLE[p.estado]}`}>
                  {p.estado}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {new Date(p.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
              </p>
              {p.notas_admin && (
                <p className="text-xs text-red-500 mt-1 bg-red-50 rounded-lg px-2 py-1">
                  Admin: {p.notas_admin}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---- Formularios de petición ---- */

function FormPeticionCompeticion({ supabase, userId, onCancel, onSent }) {
  const [form, setForm] = useState({ nombre: "", categoria: "", comunidad_autonoma: "", provincia: "" });
  const [sending, setSending] = useState(false);

  async function handleEnviar() {
    if (!form.nombre || !form.categoria) return;
    setSending(true);
    await supabase.from("peticiones").insert({ tipo: "competicion", datos: form, usuario_id: userId });
    onSent();
  }

  return (
    <PeticionFormWrapper titulo="Solicitar nueva competición" onCancel={onCancel} onSend={handleEnviar} canSend={!!form.nombre && !!form.categoria} sending={sending}>
      <PInput label="Nombre de la competición *" value={form.nombre} onChange={(v) => setForm({ ...form, nombre: v })} placeholder="Ej: 4ª Provincial Grupo 2" />
      <PInput label="Categoría *" value={form.categoria} onChange={(v) => setForm({ ...form, categoria: v })} placeholder="Ej: Provincial, Tercera RFEF..." />
      <div className="flex gap-2">
        <PInput label="Comunidad Autónoma" value={form.comunidad_autonoma} onChange={(v) => setForm({ ...form, comunidad_autonoma: v })} placeholder="Andalucía" />
        <PInput label="Provincia" value={form.provincia} onChange={(v) => setForm({ ...form, provincia: v })} placeholder="Cádiz" />
      </div>
    </PeticionFormWrapper>
  );
}

function FormPeticionEquipo({ supabase, userId, onCancel, onSent }) {
  const [form, setForm] = useState({
    nombre: "", comunidad_autonoma: "", provincia: "", municipio: "",
    presidente: "", telefono: "", email_contacto: "", fundacion: "", color_principal: "#1DB954",
  });
  const [sending, setSending] = useState(false);

  async function handleEnviar() {
    if (!form.nombre) return;
    setSending(true);
    await supabase.from("peticiones").insert({ tipo: "equipo", datos: form, usuario_id: userId });
    onSent();
  }

  return (
    <PeticionFormWrapper titulo="Solicitar nuevo equipo" onCancel={onCancel} onSend={handleEnviar} canSend={!!form.nombre} sending={sending}>
      <PInput label="Nombre del equipo *" value={form.nombre} onChange={(v) => setForm({ ...form, nombre: v })} />
      <div className="flex gap-2">
        <PInput label="Comunidad Autónoma" value={form.comunidad_autonoma} onChange={(v) => setForm({ ...form, comunidad_autonoma: v })} />
        <PInput label="Provincia" value={form.provincia} onChange={(v) => setForm({ ...form, provincia: v })} />
      </div>
      <div className="flex gap-2">
        <PInput label="Municipio" value={form.municipio} onChange={(v) => setForm({ ...form, municipio: v })} />
        <PInput label="Año fundación" value={form.fundacion} onChange={(v) => setForm({ ...form, fundacion: v })} type="number" />
      </div>
      <div className="flex gap-2">
        <PInput label="Presidente" value={form.presidente} onChange={(v) => setForm({ ...form, presidente: v })} />
        <PInput label="Teléfono" value={form.telefono} onChange={(v) => setForm({ ...form, telefono: v })} />
      </div>
      <PInput label="Email contacto" value={form.email_contacto} onChange={(v) => setForm({ ...form, email_contacto: v })} placeholder="club@email.com" />
      <div className="flex items-center gap-3">
        <label className="text-xs text-gray-500">Color principal:</label>
        <input type="color" value={form.color_principal}
          onChange={(e) => setForm({ ...form, color_principal: e.target.value })}
          className="w-8 h-8 rounded border-0 cursor-pointer"
        />
      </div>
    </PeticionFormWrapper>
  );
}

function FormPeticionJugador({ supabase, userId, onCancel, onSent }) {
  const [form, setForm] = useState({
    nombre: "", apellidos: "", nombre_futbolistico: "",
    posicion: "MED", posicion_especifica: "", pie_dominante: "Diestro",
    fecha_nacimiento: "", lugar_nacimiento: "", nacionalidad: "",
    altura: "", peso: "", equipo_procedencia: "",
  });
  const [sending, setSending] = useState(false);

  const posicionesEspecificas = {
    POR: ["Portero"],
    DEF: ["Lateral derecho", "Lateral izquierdo", "Central"],
    MED: ["Pivote", "Mediocentro", "Interior", "Mediapunta", "Extremo derecho", "Extremo izquierdo"],
    DEL: ["Delantero centro", "Segunda punta", "Extremo derecho", "Extremo izquierdo"],
  };

  const edad = form.fecha_nacimiento
    ? Math.floor((Date.now() - new Date(form.fecha_nacimiento)) / (365.25 * 24 * 3600 * 1000))
    : null;

  async function handleEnviar() {
    if (!form.nombre) return;
    setSending(true);
    await supabase.from("peticiones").insert({ tipo: "jugador", datos: form, usuario_id: userId });
    onSent();
  }

  return (
    <PeticionFormWrapper titulo="Solicitar nuevo jugador" onCancel={onCancel} onSend={handleEnviar} canSend={!!form.nombre} sending={sending}>
      <div className="flex gap-2">
        <PInput label="Nombre *" value={form.nombre} onChange={(v) => setForm({ ...form, nombre: v })} />
        <PInput label="Apellidos" value={form.apellidos} onChange={(v) => setForm({ ...form, apellidos: v })} />
      </div>
      <PInput label="Apodo / Nombre futbolístico" value={form.nombre_futbolistico} onChange={(v) => setForm({ ...form, nombre_futbolistico: v })} />
      <div className="flex gap-2">
        <PSelect label="Posición" value={form.posicion}
          onChange={(v) => setForm({ ...form, posicion: v, posicion_especifica: "" })}
          options={[{ value: "POR", label: "Portero" }, { value: "DEF", label: "Defensa" }, { value: "MED", label: "Centrocampista" }, { value: "DEL", label: "Delantero" }]}
        />
        <PSelect label="Posición específica" value={form.posicion_especifica}
          onChange={(v) => setForm({ ...form, posicion_especifica: v })}
          options={[{ value: "", label: "— Sin especificar —" }, ...(posicionesEspecificas[form.posicion] || []).map((p) => ({ value: p, label: p }))]}
        />
      </div>
      <div className="flex gap-2">
        <PSelect label="Pie dominante" value={form.pie_dominante}
          onChange={(v) => setForm({ ...form, pie_dominante: v })}
          options={[{ value: "Diestro", label: "Diestro" }, { value: "Zurdo", label: "Zurdo" }, { value: "Ambidiestro", label: "Ambidiestro" }]}
        />
        <div className="flex-1">
          <label className="text-xs text-gray-500 mb-1 block">Fecha nacimiento</label>
          <div className="relative">
            <input type="date" value={form.fecha_nacimiento}
              onChange={(e) => setForm({ ...form, fecha_nacimiento: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1DB954]/30"
            />
            {edad !== null && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#1DB954] font-bold">
                {edad} años
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <PInput label="Lugar de nacimiento" value={form.lugar_nacimiento} onChange={(v) => setForm({ ...form, lugar_nacimiento: v })} />
        <PInput label="Nacionalidad" value={form.nacionalidad} onChange={(v) => setForm({ ...form, nacionalidad: v })} />
      </div>
      <div className="flex gap-2">
        <PInput label="Altura (cm)" value={form.altura} onChange={(v) => setForm({ ...form, altura: v })} type="number" />
        <PInput label="Peso (kg)" value={form.peso} onChange={(v) => setForm({ ...form, peso: v })} type="number" />
      </div>
      <PInput label="Equipo de procedencia" value={form.equipo_procedencia} onChange={(v) => setForm({ ...form, equipo_procedencia: v })} />
    </PeticionFormWrapper>
  );
}

/* ---- Componentes auxiliares de formulario ---- */

function PeticionFormWrapper({ titulo, children, onCancel, onSend, canSend, sending }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 space-y-3">
      <h3 className="text-sm font-bold text-gray-800">{titulo}</h3>
      {children}
      <p className="text-[10px] text-gray-400">Un administrador revisará y aprobará tu petición</p>
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-600">
          Cancelar
        </button>
        <button onClick={onSend} disabled={!canSend || sending}
          className="flex-1 py-2 rounded-lg text-sm font-semibold bg-[#1DB954] text-white disabled:opacity-50"
        >
          {sending ? "Enviando..." : "Enviar petición"}
        </button>
      </div>
    </div>
  );
}

function PInput({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div className="flex-1">
      {label && <label className="text-xs text-gray-500 mb-1 block">{label}</label>}
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1DB954]/30"
      />
    </div>
  );
}

function PSelect({ label, value, onChange, options }) {
  return (
    <div className="flex-1">
      {label && <label className="text-xs text-gray-500 mb-1 block">{label}</label>}
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1DB954]/30 bg-white"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
