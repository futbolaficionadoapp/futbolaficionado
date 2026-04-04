"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

function sanitizePath(str) {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "archivo";
}

function EscudoBadge({ club, size = "md" }) {
  const dim = size === "sm" ? "w-6 h-6 text-[8px]" : size === "lg" ? "w-14 h-14 text-xl" : "w-8 h-8 text-xs";
  if (club?.escudo_url) {
    return (
      <div className={`${dim} shrink-0 flex items-center justify-center`}>
        <img src={club.escudo_url} alt={club.nombre} className="w-full h-full object-contain" />
      </div>
    );
  }
  return (
    <div
      className={`${dim} rounded-full shrink-0 flex items-center justify-center font-bold text-white`}
      style={{ backgroundColor: club?.color_principal || "#888" }}
    >
      {club?.nombre?.[0]}
    </div>
  );
}

function FormaLabel(result) {
  if (result === "V") return <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold bg-[#1DB954]/15 text-[#1DB954]">V</span>;
  if (result === "E") return <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold bg-yellow-100 text-yellow-600">E</span>;
  return <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold bg-red-50 text-red-500">D</span>;
}

export default function ClubHome({
  club: clubProp,
  perfil,
  clasi,
  tabla,
  partidos: partidosProp,
  jornadaPartidos,
  plantilla,
  golesEv,
  asistEv,
  seguidores,
  isAdmin,
}) {
  const router = useRouter();
  const supabase = createClient();

  // Reloj para calcular minutos en vivo
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const [editMode, setEditMode] = useState(false);
  const [club, setClub] = useState(clubProp);
  const [partidos, setPartidos] = useState(partidosProp);
  const [editingPartidoId, setEditingPartidoId] = useState(null);
  const [editPartidoData, setEditPartidoData] = useState({});
  const [savingPartido, setSavingPartido] = useState(false);
  const [uploadingEscudo, setUploadingEscudo] = useState(false);
  const [tablaExpanded, setTablaExpanded] = useState(false);
  const [jornadaTab, setJornadaTab] = useState("actual");
  const [cambiandoEquipo, setCambiandoEquipo] = useState(false);

  const escudoInputRef = useRef(null);

  const hoy = new Date().toISOString().split("T")[0];

  // ---- Derived data ----

  // Forma: last 5 finalized
  const finalizados = partidos.filter((p) => p.estado === "finalizado");
  const ultimos5 = finalizados.slice(0, 5);
  const forma = ultimos5.map((p) => {
    const esLocal = p.local_id === club.id;
    const gf = esLocal ? p.goles_local : p.goles_visitante;
    const gc = esLocal ? p.goles_visitante : p.goles_local;
    if (gf > gc) return "V";
    if (gf === gc) return "E";
    return "D";
  });

  // Proximo partido
  const proximoPartido = partidos
    .filter((p) => p.estado === "programado" && p.fecha >= hoy)
    .sort((a, b) => (a.fecha + a.hora) > (b.fecha + b.hora) ? 1 : -1)[0] || null;

  // Ultimo resultado
  const ultimoResultado = finalizados[0] || null;

  // Rival proximo (for clasi row)
  const rivalId = proximoPartido
    ? (proximoPartido.local_id === club.id ? proximoPartido.visitante_id : proximoPartido.local_id)
    : null;

  const rivalTabla = rivalId ? (tabla || []).find((r) => r.club_id === rivalId) : null;
  const miTabla = (tabla || []).find((r) => r.club_id === club.id);

  // Liga from clasi
  const liga = clasi?.grupo?.liga;

  // Position
  const sorted = [...(tabla || [])].sort((a, b) => b.puntos - a.puntos || (b.gf - b.gc) - (a.gf - a.gc));
  const posicion = sorted.findIndex((r) => r.club_id === club.id) + 1;

  // Jornada activa: primero busca partidos en_vivo, si no, la última jornada con partidos jugados
  const partidos_enVivo = (jornadaPartidos || []).filter((p) => p.estado === "en_vivo");
  const partidos_jugados = (jornadaPartidos || []).filter((p) => p.estado === "finalizado" || p.estado === "en_vivo");
  const maxJornada = partidos_enVivo.length > 0
    ? partidos_enVivo[0].jornada || 0
    : partidos_jugados.length > 0
      ? Math.max(...partidos_jugados.map((p) => p.jornada || 0))
      : 0;
  const jornadaActualPartidos = (jornadaPartidos || []).filter((p) => p.jornada === maxJornada);
  const siguienteJornada = maxJornada + 1;
  const siguienteJornadaPartidos = (jornadaPartidos || []).filter((p) => p.jornada === siguienteJornada);

  // Stats from events
  const golesMap = {};
  golesEv.forEach((e) => {
    if (!e.jugador) return;
    const key = e.jugador_id;
    if (!golesMap[key]) golesMap[key] = { ...e.jugador, count: 0 };
    golesMap[key].count++;
  });
  const topGoleadores = Object.values(golesMap).sort((a, b) => b.count - a.count).slice(0, 3);
  const mvpTemporada = topGoleadores[0] || null;

  const asistMap = {};
  asistEv.forEach((e) => {
    if (!e.jugador) return;
    const key = e.jugador_id;
    if (!asistMap[key]) asistMap[key] = { ...e.jugador, count: 0 };
    asistMap[key].count++;
  });
  const topAsistentes = Object.values(asistMap).sort((a, b) => b.count - a.count).slice(0, 3);

  // ---- Handlers ----

  async function handleCambiarEquipo() {
    setCambiandoEquipo(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("perfiles")
          .update({ club_favorito_id: null })
          .eq("id", user.id);
      }
      localStorage.removeItem("club_favorito");
      localStorage.removeItem("onboarding_done");
      router.push("/onboarding");
    } catch (e) {
      console.error(e);
      setCambiandoEquipo(false);
    }
  }

  function startEditPartido(p) {
    setEditingPartidoId(p.id);
    setEditPartidoData({
      goles_local: p.goles_local ?? 0,
      goles_visitante: p.goles_visitante ?? 0,
      estado: p.estado || "programado",
    });
  }

  async function savePartido(partidoId) {
    setSavingPartido(true);
    const { error } = await supabase
      .from("partidos")
      .update({
        goles_local: Number(editPartidoData.goles_local),
        goles_visitante: Number(editPartidoData.goles_visitante),
        estado: editPartidoData.estado,
      })
      .eq("id", partidoId);
    setSavingPartido(false);
    if (!error) {
      setPartidos((prev) =>
        prev.map((p) =>
          p.id === partidoId
            ? { ...p, ...editPartidoData, goles_local: Number(editPartidoData.goles_local), goles_visitante: Number(editPartidoData.goles_visitante) }
            : p
        )
      );
      setEditingPartidoId(null);
    } else {
      alert("Error al guardar: " + error.message);
    }
  }

  async function handleEscudoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingEscudo(true);
    const ext = file.name.split(".").pop();
    const path = `clubes/${sanitizePath(club.nombre)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("escudos").upload(path, file, { upsert: true });
    if (upErr) { alert("Error subiendo escudo: " + upErr.message); setUploadingEscudo(false); return; }
    const { data: urlData } = supabase.storage.from("escudos").getPublicUrl(path);
    const publicUrl = urlData?.publicUrl;
    if (publicUrl) {
      const { error: dbErr } = await supabase.from("clubs").update({ escudo_url: publicUrl }).eq("id", club.id);
      if (!dbErr) setClub((prev) => ({ ...prev, escudo_url: publicUrl }));
      else alert("Error actualizando BD: " + dbErr.message);
    }
    setUploadingEscudo(false);
  }

  const color = club.color_principal || "#1DB954";

  return (
    <div className="max-w-lg mx-auto pb-24">
      {/* ---- Admin floating button ---- */}
      {isAdmin && (
        <button
          onClick={() => setEditMode((v) => !v)}
          className={`fixed bottom-20 right-4 z-50 px-3 py-2 rounded-full text-sm font-bold shadow-lg transition-colors ${
            editMode
              ? "bg-[#1DB954] text-white"
              : "bg-gray-900 text-white"
          }`}
        >
          {editMode ? "✓ Listo" : "✏️ Editar"}
        </button>
      )}

      {/* ---- Section 1: Club Banner ---- */}
      <section
        className="px-4 pt-4 pb-5 text-white relative overflow-hidden"
        style={{ backgroundColor: color }}
      >
        {/* decorative circles */}
        <div className="absolute right-0 top-0 w-40 h-40 rounded-full opacity-10 bg-white translate-x-12 -translate-y-12 pointer-events-none" />
        <div className="absolute right-10 bottom-0 w-24 h-24 rounded-full opacity-10 bg-white translate-y-8 pointer-events-none" />

        <div className="relative flex items-center gap-3">
          {/* Escudo */}
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center overflow-hidden">
              {club.escudo_url ? (
                <img src={club.escudo_url} alt={club.nombre} className="w-14 h-14 object-contain" />
              ) : (
                <span className="text-3xl font-black">{club.nombre?.[0]}</span>
              )}
            </div>
            {editMode && (
              <>
                <button
                  onClick={() => escudoInputRef.current?.click()}
                  disabled={uploadingEscudo}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl text-white text-lg"
                  title="Cambiar escudo"
                >
                  {uploadingEscudo ? "..." : "📷"}
                </button>
                <input
                  ref={escudoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleEscudoUpload}
                />
              </>
            )}
          </div>

          {/* Nombre + liga + seguidores */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold opacity-60 uppercase tracking-wider">Mi equipo</p>
            <h2 className="text-lg font-black truncate leading-tight">{club.nombre}</h2>
            {liga && (
              <p className="text-xs opacity-75 truncate">{liga.nombre}{liga.categoria ? ` · ${liga.categoria}` : ""}</p>
            )}
            <span className="inline-block text-[10px] font-semibold bg-white/20 rounded-full px-2 py-0.5 mt-0.5">
              👥 {seguidores} seguidores
            </span>
          </div>

          {/* Posición — grande a la derecha */}
          {posicion > 0 && (
            <div className="shrink-0 text-center">
              <p className="text-4xl font-black leading-none tabular-nums">{posicion}º</p>
              <p className="text-[9px] opacity-60 uppercase tracking-wider mt-0.5">posición</p>
            </div>
          )}
        </div>

        {/* Stats row */}
        {clasi && (
          <div className="relative flex gap-3 mt-3 pt-3 border-t border-white/20">
            {[
              { l: "PJ", v: clasi.pj },
              { l: "PG", v: clasi.pg },
              { l: "PE", v: clasi.pe },
              { l: "PP", v: clasi.pp },
              { l: "GF", v: clasi.gf },
              { l: "GC", v: clasi.gc },
              { l: "Pts", v: clasi.puntos, bold: true },
            ].map((s) => (
              <div key={s.l} className="text-center flex-1">
                <p className={`text-sm leading-none ${s.bold ? "font-black text-base" : "font-bold"}`}>
                  {s.v ?? "-"}
                </p>
                <p className="text-[9px] opacity-60 uppercase mt-0.5">{s.l}</p>
              </div>
            ))}
          </div>
        )}

        {/* Forma dentro del banner */}
        {forma.length > 0 && (
          <div className="relative flex items-center gap-2 mt-3 pt-3 border-t border-white/20">
            <span className="text-[9px] font-bold opacity-60 uppercase tracking-wider shrink-0">Forma</span>
            <div className="flex gap-1.5">
              {forma.map((r, i) => (
                <span
                  key={i}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                    r === "V" ? "bg-white/25 text-white" :
                    r === "E" ? "bg-white/15 text-white/80" :
                    "bg-black/20 text-white/70"
                  }`}
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Cambiar equipo */}
        <button
          onClick={handleCambiarEquipo}
          disabled={cambiandoEquipo}
          className="mt-3 text-[11px] opacity-70 hover:opacity-100 font-semibold"
        >
          {cambiandoEquipo ? "..." : "Cambiar equipo →"}
        </button>
      </section>

      {/* ---- Section 3: Partidos cards ---- */}
      <section className="px-4 pb-3">
        <div className="grid grid-cols-2 gap-3">
          {/* Proximo partido */}
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
              Próximo partido
            </p>
            {proximoPartido ? (
              <>
                <PartidoCard
                  partido={proximoPartido}
                  clubId={club.id}
                  editMode={editMode}
                  isEditing={editingPartidoId === proximoPartido.id}
                  editData={editPartidoData}
                  onEdit={() => startEditPartido(proximoPartido)}
                  onEditChange={(field, val) =>
                    setEditPartidoData((prev) => ({ ...prev, [field]: val }))
                  }
                  onSave={() => savePartido(proximoPartido.id)}
                  onCancel={() => setEditingPartidoId(null)}
                  saving={savingPartido}
                />
              </>
            ) : (
              <p className="text-xs text-gray-400">Sin partidos programados</p>
            )}
          </div>

          {/* Ultimo resultado */}
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
              Último resultado
            </p>
            {ultimoResultado ? (
              <PartidoCard
                partido={ultimoResultado}
                clubId={club.id}
                showResult
                editMode={editMode}
                isEditing={editingPartidoId === ultimoResultado.id}
                editData={editPartidoData}
                onEdit={() => startEditPartido(ultimoResultado)}
                onEditChange={(field, val) =>
                  setEditPartidoData((prev) => ({ ...prev, [field]: val }))
                }
                onSave={() => savePartido(ultimoResultado.id)}
                onCancel={() => setEditingPartidoId(null)}
                saving={savingPartido}
              />
            ) : (
              <p className="text-xs text-gray-400">Sin resultados aún</p>
            )}
          </div>
        </div>
      </section>

      {/* ---- Section 4: Clasificacion rows ---- */}
      {(miTabla || rivalTabla) && (
        <section className="px-4 pb-3">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
            Clasificación
          </p>
          <div className="bg-gray-50 rounded-xl overflow-hidden">
            <ClasificacionHeader />
            {miTabla && (
              <ClasificacionRow
                row={miTabla}
                pos={posicion}
                sorted={sorted}
                highlight="green"
              />
            )}
            {rivalTabla && rivalTabla.club_id !== miTabla?.club_id && (
              <ClasificacionRow
                row={rivalTabla}
                pos={sorted.findIndex((r) => r.club_id === rivalTabla.club_id) + 1}
                sorted={sorted}
                highlight="blue"
              />
            )}
          </div>
        </section>
      )}

      {/* ---- Section 5: Clasificacion completa ---- */}
      {tabla && tabla.length > 0 && (
        <section className="px-4 pb-3">
          <button
            onClick={() => setTablaExpanded((v) => !v)}
            className="text-xs font-semibold text-[#1DB954] mb-2"
          >
            {tablaExpanded ? "Ocultar clasificación ▲" : "Ver clasificación completa ▼"}
          </button>
          {tablaExpanded && (
            <div className="bg-gray-50 rounded-xl overflow-hidden">
              <ClasificacionHeader full />
              {sorted.map((row, i) => (
                <ClasificacionRow
                  key={row.id}
                  row={row}
                  pos={i + 1}
                  sorted={sorted}
                  highlight={row.club_id === club.id ? "green" : null}
                  full
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ---- Section 6: Jornada ---- */}
      {jornadaPartidos && jornadaPartidos.length > 0 && (
        <section className="px-4 pb-3">
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setJornadaTab("actual")}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                jornadaTab === "actual"
                  ? "bg-[#1DB954] text-white"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {partidos_enVivo.length > 0 && jornadaTab === "actual" && (
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
              )}
              Jornada {maxJornada}
            </button>
            {siguienteJornadaPartidos.length > 0 && (
              <button
                onClick={() => setJornadaTab("siguiente")}
                className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                  jornadaTab === "siguiente"
                    ? "bg-[#1DB954] text-white"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                Jornada {siguienteJornada}
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            {(jornadaTab === "actual" ? jornadaActualPartidos : siguienteJornadaPartidos).map(
              (p) => (
                <JornadaPartidoRow
                  key={p.id}
                  partido={p}
                  clubId={club.id}
                  now={now}
                  editMode={editMode}
                  isEditing={editingPartidoId === p.id}
                  editData={editPartidoData}
                  onEdit={() => startEditPartido(p)}
                  onEditChange={(field, val) =>
                    setEditPartidoData((prev) => ({ ...prev, [field]: val }))
                  }
                  onSave={() => savePartido(p.id)}
                  onCancel={() => setEditingPartidoId(null)}
                  saving={savingPartido}
                />
              )
            )}
          </div>
        </section>
      )}

      {/* ---- Section 7: MVP + Stats ---- */}
      <section className="px-4 pb-4">
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* MVP Temporada */}
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
              MVP Temporada
            </p>
            {mvpTemporada ? (
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-[#1DB954]/10 text-[#1DB954] flex items-center justify-center text-xs font-bold shrink-0">
                  {mvpTemporada.nombre?.[0]}{mvpTemporada.apellidos?.[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">
                    {mvpTemporada.nombre} {mvpTemporada.apellidos?.split(" ")[0]}
                  </p>
                  <p className="text-[10px] text-[#1DB954] font-bold">
                    {mvpTemporada.count} gol{mvpTemporada.count !== 1 ? "es" : ""}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400">Próximamente</p>
            )}
          </div>

          {/* MVP Último partido */}
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
              MVP Último partido
            </p>
            <p className="text-xs text-gray-400">Próximamente</p>
          </div>
        </div>

        {/* Top goleadores */}
        {topGoleadores.length > 0 && (
          <div className="bg-gray-50 rounded-xl p-3 mb-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
              Goleadores del equipo
            </p>
            <div className="space-y-2">
              {topGoleadores.map((g, i) => (
                <div key={g.id} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-300 w-4">{i + 1}</span>
                  <div className="w-7 h-7 rounded-full bg-[#1DB954]/10 text-[#1DB954] flex items-center justify-center text-[10px] font-bold shrink-0">
                    {g.nombre?.[0]}{g.apellidos?.[0]}
                  </div>
                  <span className="text-xs font-semibold flex-1 truncate">
                    {g.nombre} {g.apellidos?.split(" ")[0]}
                  </span>
                  <span className="text-sm font-bold text-[#1DB954]">{g.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top asistentes */}
        {topAsistentes.length > 0 && (
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
              Asistencias
            </p>
            <div className="space-y-2">
              {topAsistentes.map((g, i) => (
                <div key={g.id} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-300 w-4">{i + 1}</span>
                  <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                    {g.nombre?.[0]}{g.apellidos?.[0]}
                  </div>
                  <span className="text-xs font-semibold flex-1 truncate">
                    {g.nombre} {g.apellidos?.split(" ")[0]}
                  </span>
                  <span className="text-sm font-bold text-blue-400">{g.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// ---- Sub-components ----

function PartidoCard({
  partido,
  clubId,
  showResult,
  editMode,
  isEditing,
  editData,
  onEdit,
  onEditChange,
  onSave,
  onCancel,
  saving,
}) {
  const esLocal = partido.local_id === clubId;
  const rival = esLocal ? partido.visitante : partido.local;
  const golesNuestros = esLocal ? partido.goles_local : partido.goles_visitante;
  const golesRival = esLocal ? partido.goles_visitante : partido.goles_local;

  let resultado = null;
  if (showResult && partido.estado === "finalizado") {
    if (golesNuestros > golesRival) resultado = { label: "V", color: "text-[#1DB954]" };
    else if (golesNuestros === golesRival) resultado = { label: "E", color: "text-amber-500" };
    else resultado = { label: "D", color: "text-red-500" };
  }

  return (
    <div>
      {/* Rival */}
      <div className="flex items-center gap-2 mb-1">
        <EscudoBadge club={rival} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate">
            vs {rival?.nombre}
          </p>
          {partido.fecha && (
            <p className="text-[10px] text-gray-400">
              {new Date(partido.fecha + "T12:00:00").toLocaleDateString("es-ES", {
                weekday: "short", day: "numeric", month: "short",
              })}
              {partido.hora ? ` · ${partido.hora.slice(0, 5)}` : ""}
            </p>
          )}
        </div>
      </div>

      {/* Result or time */}
      {showResult && resultado && (
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-bold tabular-nums">
            {golesNuestros} - {golesRival}
          </span>
          <span className={`text-xs font-bold ${resultado.color}`}>{resultado.label}</span>
        </div>
      )}

      {/* Inline edit form */}
      {editMode && !isEditing && (
        <button
          onClick={onEdit}
          className="mt-1.5 text-[10px] font-bold text-[#1DB954] bg-[#1DB954]/10 px-2 py-0.5 rounded"
        >
          Editar
        </button>
      )}

      {editMode && isEditing && (
        <div className="mt-2 bg-white rounded-lg p-2 border border-gray-200 space-y-2">
          <div className="flex gap-2 items-center">
            <label className="text-[10px] text-gray-400 w-14">Local</label>
            <div className="flex items-center gap-1">
              <button onClick={() => onEditChange("goles_local", Math.max(0, Number(editData.goles_local) - 1))} className="w-5 h-5 rounded bg-gray-100 text-xs font-bold">-</button>
              <span className="w-6 text-center text-xs font-bold tabular-nums">{editData.goles_local}</span>
              <button onClick={() => onEditChange("goles_local", Number(editData.goles_local) + 1)} className="w-5 h-5 rounded bg-gray-100 text-xs font-bold">+</button>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-[10px] text-gray-400 w-14">Visitante</label>
            <div className="flex items-center gap-1">
              <button onClick={() => onEditChange("goles_visitante", Math.max(0, Number(editData.goles_visitante) - 1))} className="w-5 h-5 rounded bg-gray-100 text-xs font-bold">-</button>
              <span className="w-6 text-center text-xs font-bold tabular-nums">{editData.goles_visitante}</span>
              <button onClick={() => onEditChange("goles_visitante", Number(editData.goles_visitante) + 1)} className="w-5 h-5 rounded bg-gray-100 text-xs font-bold">+</button>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-[10px] text-gray-400 w-14">Estado</label>
            <select
              value={editData.estado}
              onChange={(e) => onEditChange("estado", e.target.value)}
              className="flex-1 text-xs border border-gray-200 rounded px-1 py-0.5"
            >
              <option value="programado">Programado</option>
              <option value="en_vivo">En vivo</option>
              <option value="finalizado">Finalizado</option>
            </select>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={onSave}
              disabled={saving}
              className="flex-1 text-[10px] font-bold bg-[#1DB954] text-white rounded py-1"
            >
              {saving ? "..." : "Guardar"}
            </button>
            <button
              onClick={onCancel}
              className="flex-1 text-[10px] font-bold bg-gray-100 text-gray-600 rounded py-1"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ClasificacionHeader({ full }) {
  if (full) {
    return (
      <div className="grid grid-cols-[24px_1fr_28px_28px_28px_28px_36px_36px] gap-1 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
        <span>#</span>
        <span>Equipo</span>
        <span className="text-center">PJ</span>
        <span className="text-center">PG</span>
        <span className="text-center">PE</span>
        <span className="text-center">PP</span>
        <span className="text-center">DG</span>
        <span className="text-center">Pts</span>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-[24px_1fr_28px_36px] gap-1 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
      <span>#</span>
      <span>Equipo</span>
      <span className="text-center">PJ</span>
      <span className="text-center">Pts</span>
    </div>
  );
}

function ClasificacionRow({ row, pos, sorted, highlight, full }) {
  const borderClass =
    highlight === "green"
      ? "border-l-2 border-l-[#1DB954] bg-[#1DB954]/5"
      : highlight === "blue"
      ? "border-l-2 border-l-blue-400 bg-blue-50/50"
      : "";

  if (full) {
    return (
      <Link
        href={`/clubes/${row.club?.id}`}
        className={`grid grid-cols-[24px_1fr_28px_28px_28px_28px_36px_36px] gap-1 px-3 py-2 text-xs border-t border-gray-100 items-center hover:bg-gray-100 transition-colors ${borderClass}`}
      >
        <span className="text-[10px] font-bold text-gray-400">{pos}</span>
        <span className="flex items-center gap-1.5 min-w-0">
          <EscudoBadge club={row.club} size="sm" />
          <span className="font-semibold truncate text-xs">{row.club?.nombre}</span>
        </span>
        <span className="text-center text-gray-500 text-[10px]">{row.pj}</span>
        <span className="text-center text-gray-500 text-[10px]">{row.pg}</span>
        <span className="text-center text-gray-500 text-[10px]">{row.pe}</span>
        <span className="text-center text-gray-500 text-[10px]">{row.pp}</span>
        <span className="text-center text-gray-500 text-[10px]">{(row.gf || 0) - (row.gc || 0)}</span>
        <span className="text-center font-bold text-xs">{row.puntos}</span>
      </Link>
    );
  }

  return (
    <Link
      href={`/clubes/${row.club?.id}`}
      className={`grid grid-cols-[24px_1fr_28px_36px] gap-1 px-3 py-2 text-xs border-t border-gray-100 items-center hover:bg-gray-100 transition-colors ${borderClass}`}
    >
      <span className="text-[10px] font-bold text-gray-400">{pos}</span>
      <span className="flex items-center gap-1.5 min-w-0">
        <EscudoBadge club={row.club} size="sm" />
        <span className="font-semibold truncate">{row.club?.nombre}</span>
      </span>
      <span className="text-center text-gray-500 text-[10px]">{row.pj}</span>
      <span className="text-center font-bold">{row.puntos}</span>
    </Link>
  );
}

function calcularMinutoVivo(fecha, hora, now) {
  if (!fecha || !hora) return null;
  // hora puede ser "16:00:00" o "16:00"
  const horaStr = hora.length === 5 ? hora + ":00" : hora;
  const inicio = new Date(`${fecha}T${horaStr}`);
  const diff = (now - inicio) / 60000; // minutos transcurridos
  if (diff < 0) return null; // aún no ha empezado
  if (diff <= 45) return `${Math.floor(diff)}'`;
  if (diff <= 47) return "45+'"; // 2 min de descuento primera parte
  if (diff <= 90) return `${Math.floor(diff)}'`;
  if (diff <= 95) return "90+'"; // 5 min de descuento segunda parte
  return "90+'";
}

function JornadaPartidoRow({
  partido,
  clubId,
  now,
  editMode,
  isEditing,
  editData,
  onEdit,
  onEditChange,
  onSave,
  onCancel,
  saving,
}) {
  const esNuestro =
    partido.local_id === clubId || partido.visitante_id === clubId;

  return (
    <div
      className={`bg-gray-50 rounded-lg p-2.5 text-xs ${
        esNuestro ? "ring-1 ring-[#1DB954]/30 bg-[#1DB954]/5" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-1.5">
            <EscudoBadge club={partido.local} size="sm" />
            <span className={`font-semibold ${partido.local_id === clubId ? "text-gray-900" : "text-gray-500"}`}>
              {partido.local?.nombre}
            </span>
            <span className="ml-auto font-bold tabular-nums">
              {partido.estado !== "programado" ? partido.goles_local ?? "" : ""}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <EscudoBadge club={partido.visitante} size="sm" />
            <span className={`font-semibold ${partido.visitante_id === clubId ? "text-gray-900" : "text-gray-500"}`}>
              {partido.visitante?.nombre}
            </span>
            <span className="ml-auto font-bold tabular-nums">
              {partido.estado !== "programado" ? partido.goles_visitante ?? "" : ""}
            </span>
          </div>
        </div>
        <div className="text-center min-w-[48px]">
          {partido.estado === "en_vivo" ? (
            <div>
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse inline-block mb-0.5" />
              <p className="text-xs font-black text-red-500 tabular-nums leading-none">
                {calcularMinutoVivo(partido.fecha, partido.hora, now) || "Vivo"}
              </p>
            </div>
          ) : partido.estado === "finalizado" ? (
            <span className="text-[9px] font-semibold text-gray-400 uppercase">Final</span>
          ) : (
            <div>
              {partido.fecha && (
                <p className="text-[9px] text-gray-400">
                  {new Date(partido.fecha + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                </p>
              )}
              <p className="text-[10px] font-semibold text-gray-500">
                {partido.hora?.slice(0, 5)}
              </p>
            </div>
          )}
        </div>
      </div>

      {editMode && !isEditing && (
        <button
          onClick={onEdit}
          className="mt-1.5 text-[10px] font-bold text-[#1DB954] bg-[#1DB954]/10 px-2 py-0.5 rounded"
        >
          Editar resultado
        </button>
      )}

      {editMode && isEditing && (
        <div className="mt-2 bg-white rounded-lg p-2 border border-gray-200 space-y-2">
          <div className="flex gap-2 items-center">
            <label className="text-[10px] text-gray-400 w-14">Local</label>
            <div className="flex items-center gap-1">
              <button onClick={() => onEditChange("goles_local", Math.max(0, Number(editData.goles_local) - 1))} className="w-5 h-5 rounded bg-gray-100 text-xs font-bold">-</button>
              <span className="w-6 text-center text-xs font-bold tabular-nums">{editData.goles_local}</span>
              <button onClick={() => onEditChange("goles_local", Number(editData.goles_local) + 1)} className="w-5 h-5 rounded bg-gray-100 text-xs font-bold">+</button>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-[10px] text-gray-400 w-14">Visitante</label>
            <div className="flex items-center gap-1">
              <button onClick={() => onEditChange("goles_visitante", Math.max(0, Number(editData.goles_visitante) - 1))} className="w-5 h-5 rounded bg-gray-100 text-xs font-bold">-</button>
              <span className="w-6 text-center text-xs font-bold tabular-nums">{editData.goles_visitante}</span>
              <button onClick={() => onEditChange("goles_visitante", Number(editData.goles_visitante) + 1)} className="w-5 h-5 rounded bg-gray-100 text-xs font-bold">+</button>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-[10px] text-gray-400 w-14">Estado</label>
            <select
              value={editData.estado}
              onChange={(e) => onEditChange("estado", e.target.value)}
              className="flex-1 text-xs border border-gray-200 rounded px-1 py-0.5"
            >
              <option value="programado">Programado</option>
              <option value="en_vivo">En vivo</option>
              <option value="finalizado">Finalizado</option>
            </select>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={onSave}
              disabled={saving}
              className="flex-1 text-[10px] font-bold bg-[#1DB954] text-white rounded py-1"
            >
              {saving ? "..." : "Guardar"}
            </button>
            <button
              onClick={onCancel}
              className="flex-1 text-[10px] font-bold bg-gray-100 text-gray-600 rounded py-1"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
