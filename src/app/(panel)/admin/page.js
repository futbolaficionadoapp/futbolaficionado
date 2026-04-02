"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";

export default function AdminPage() {
  const [tab, setTab] = useState("categorias");
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("perfiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setPerfil(data);
      }
      setLoading(false);
    }
    check();
  }, []);

  if (loading)
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center text-gray-400 text-sm">
        Cargando...
      </div>
    );

  if (!perfil || perfil.rol !== "admin")
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <span className="text-4xl">🔒</span>
        <h1 className="text-lg font-bold mt-4">Acceso restringido</h1>
        <p className="text-sm text-gray-500 mt-2">
          Solo los administradores pueden acceder a este panel.
        </p>
      </div>
    );

  const tabs = [
    { id: "categorias", label: "Categorias" },
    { id: "equipos", label: "Equipos" },
    { id: "jugadores", label: "Jugadores" },
    { id: "colaboradores", label: "Colaboradores" },
  ];

  return (
    <div className="max-w-lg mx-auto pb-24">
      <header className="px-4 py-4 border-b border-gray-100">
        <p className="text-xs text-red-500 font-semibold">Administracion</p>
        <h1 className="text-xl font-bold">Panel de Admin</h1>
      </header>

      <div className="flex border-b border-gray-100 overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
              tab === t.id
                ? "border-[#1DB954] text-[#1DB954]"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === "categorias" && <CategoriasTab supabase={supabase} />}
        {tab === "equipos" && <EquiposTab supabase={supabase} />}
        {tab === "jugadores" && <JugadoresTab supabase={supabase} />}
        {tab === "colaboradores" && <ColaboradoresTab supabase={supabase} />}
      </div>
    </div>
  );
}

/* ===================== CATEGORIAS ===================== */

function CategoriasTab({ supabase }) {
  const [ligas, setLigas] = useState([]);
  const [temporadas, setTemporadas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [form, setForm] = useState({
    nombre: "",
    categoria: "",
    comunidad_autonoma: "",
    provincia: "",
    temporada_id: "",
  });

  const load = useCallback(async () => {
    const [{ data: l }, { data: t }] = await Promise.all([
      supabase
        .from("ligas")
        .select("*, temporada:temporadas(nombre), grupos(id, nombre)")
        .order("nombre"),
      supabase.from("temporadas").select("*").order("nombre"),
    ]);
    setLigas(l || []);
    setTemporadas(t || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleGuardar() {
    const payload = { ...form, activa: true };
    if (editando === "nuevo") {
      const { data } = await supabase
        .from("ligas")
        .insert(payload)
        .select()
        .single();
      if (data) {
        await supabase
          .from("grupos")
          .insert({ liga_id: data.id, nombre: "Grupo Unico" });
      }
    } else {
      await supabase.from("ligas").update(payload).eq("id", editando);
    }
    setEditando(null);
    load();
  }

  async function handleEliminar(id) {
    if (!confirm("Eliminar esta categoria y todos sus datos asociados?"))
      return;
    const { data: grupos } = await supabase
      .from("grupos")
      .select("id")
      .eq("liga_id", id);
    for (const g of grupos || []) {
      await supabase.from("clasificacion").delete().eq("grupo_id", g.id);
      await supabase.from("partidos").delete().eq("grupo_id", g.id);
      await supabase.from("club_liga").delete().eq("grupo_id", g.id);
    }
    await supabase.from("grupos").delete().eq("liga_id", id);
    await supabase.from("ligas").delete().eq("id", id);
    load();
  }

  if (loading) return <p className="text-gray-400 text-sm">Cargando...</p>;

  if (detalle) {
    return (
      <CategoriaDetalle
        supabase={supabase}
        liga={detalle}
        onBack={() => {
          setDetalle(null);
          load();
        }}
      />
    );
  }

  return (
    <div>
      <button
        onClick={() => {
          setEditando("nuevo");
          setForm({
            nombre: "",
            categoria: "",
            comunidad_autonoma: "",
            provincia: "",
            temporada_id: temporadas[0]?.id || "",
          });
        }}
        className="w-full mb-3 py-2 rounded-xl text-sm font-semibold border-2 border-dashed border-gray-200 text-gray-400 hover:border-[#1DB954] hover:text-[#1DB954] transition-colors"
      >
        + Nueva categoria
      </button>

      {editando && (
        <FormCard onCancel={() => setEditando(null)} onSave={handleGuardar} canSave={form.nombre && form.categoria}>
          <Input label="Competicion" value={form.nombre} onChange={(v) => setForm({ ...form, nombre: v })} placeholder="Ej: 4a Provincial Grupo 1" />
          <Input label="Categoria" value={form.categoria} onChange={(v) => setForm({ ...form, categoria: v })} placeholder="Ej: Provincial, Tercera RFEF..." />
          <Input label="Comunidad Autonoma" value={form.comunidad_autonoma} onChange={(v) => setForm({ ...form, comunidad_autonoma: v })} placeholder="Ej: Andalucia" />
          <Input label="Provincia" value={form.provincia} onChange={(v) => setForm({ ...form, provincia: v })} placeholder="Ej: Cadiz" />
          <Select
            label="Temporada"
            value={form.temporada_id}
            onChange={(v) => setForm({ ...form, temporada_id: v })}
            options={temporadas.map((t) => ({ value: t.id, label: t.nombre }))}
          />
        </FormCard>
      )}

      <div className="space-y-2">
        {ligas.map((liga) => (
          <div
            key={liga.id}
            className="bg-gray-50 rounded-xl p-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setDetalle(liga)}>
                <p className="text-sm font-semibold truncate">{liga.nombre}</p>
                <p className="text-xs text-gray-400">
                  {[liga.categoria, liga.provincia, liga.comunidad_autonoma]
                    .filter(Boolean)
                    .join(" - ")}
                </p>
                <p className="text-xs text-gray-300 mt-0.5">
                  {liga.temporada?.nombre} - {liga.grupos?.length || 0} grupo(s)
                </p>
              </div>
              <div className="flex gap-1.5">
                <BtnSmall
                  label="Editar"
                  color="green"
                  onClick={() => {
                    setEditando(liga.id);
                    setForm({
                      nombre: liga.nombre,
                      categoria: liga.categoria,
                      comunidad_autonoma: liga.comunidad_autonoma || "",
                      provincia: liga.provincia || "",
                      temporada_id: liga.temporada_id || "",
                    });
                  }}
                />
                <BtnSmall label="Eliminar" color="red" onClick={() => handleEliminar(liga.id)} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- Detalle de una categoria: equipos asignados ---- */

function CategoriaDetalle({ supabase, liga, onBack }) {
  const [clubsEnLiga, setClubsEnLiga] = useState([]);
  const [todosClubs, setTodosClubs] = useState([]);
  const [grupoId, setGrupoId] = useState(null);
  const [buscar, setBuscar] = useState("");
  const [showBuscador, setShowBuscador] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: grupos } = await supabase
      .from("grupos")
      .select("id")
      .eq("liga_id", liga.id);
    const gid = grupos?.[0]?.id;
    setGrupoId(gid);

    if (gid) {
      const { data: cl } = await supabase
        .from("club_liga")
        .select("*, club:clubs(*)")
        .eq("grupo_id", gid);
      setClubsEnLiga(cl || []);
    }
    const { data: all } = await supabase.from("clubs").select("*").order("nombre");
    setTodosClubs(all || []);
    setLoading(false);
  }, [supabase, liga.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function addClub(clubId) {
    if (!grupoId) return;
    const { data: temp } = await supabase.from("temporadas").select("id").limit(1).single();
    await supabase.from("club_liga").insert({
      club_id: clubId,
      grupo_id: grupoId,
      temporada_id: temp?.id,
    });
    setShowBuscador(false);
    setBuscar("");
    load();
  }

  async function removeClub(clId) {
    await supabase.from("club_liga").delete().eq("id", clId);
    load();
  }

  const clubIdsEnLiga = new Set(clubsEnLiga.map((c) => c.club_id));
  const clubsFiltrados = todosClubs.filter(
    (c) =>
      !clubIdsEnLiga.has(c.id) &&
      c.nombre.toLowerCase().includes(buscar.toLowerCase())
  );

  if (loading) return <p className="text-gray-400 text-sm">Cargando...</p>;

  return (
    <div>
      <button onClick={onBack} className="text-xs text-[#1DB954] font-semibold mb-3">
        ← Volver a categorias
      </button>
      <h2 className="text-lg font-bold mb-1">{liga.nombre}</h2>
      <p className="text-xs text-gray-400 mb-4">
        {[liga.categoria, liga.provincia, liga.comunidad_autonoma].filter(Boolean).join(" - ")}
      </p>

      <button
        onClick={() => setShowBuscador(!showBuscador)}
        className="w-full mb-3 py-2 rounded-xl text-sm font-semibold border-2 border-dashed border-gray-200 text-gray-400 hover:border-[#1DB954] hover:text-[#1DB954] transition-colors"
      >
        + Añadir equipo a esta categoria
      </button>

      {showBuscador && (
        <div className="bg-white border border-gray-200 rounded-xl p-3 mb-3">
          <input
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            placeholder="Buscar equipo por nombre..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-[#1DB954]/30"
            autoFocus
          />
          <div className="max-h-40 overflow-y-auto space-y-1">
            {clubsFiltrados.slice(0, 10).map((c) => (
              <button
                key={c.id}
                onClick={() => addClub(c.id)}
                className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-[#1DB954]/10 transition-colors"
              >
                {c.nombre}
                <span className="text-xs text-gray-400 ml-2">{c.municipio}</span>
              </button>
            ))}
            {clubsFiltrados.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-2">
                No se encontraron equipos
              </p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {clubsEnLiga.map((cl) => (
          <div key={cl.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ backgroundColor: cl.club?.color_principal || "#888" }}
            >
              {cl.club?.nombre?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{cl.club?.nombre}</p>
              <p className="text-xs text-gray-400">{cl.club?.municipio}</p>
            </div>
            <BtnSmall label="Quitar" color="red" onClick={() => removeClub(cl.id)} />
          </div>
        ))}
        {clubsEnLiga.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-4">
            No hay equipos en esta categoria
          </p>
        )}
      </div>
    </div>
  );
}

/* ===================== EQUIPOS ===================== */

function EquiposTab({ supabase }) {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const emptyForm = {
    nombre: "", estadio: "", localidad: "", municipio: "", provincia: "",
    fundacion: "", color_principal: "#1DB954",
    escudo_url: "", direccion: "", google_maps_url: "",
    equipacion_local_url: "", equipacion_visitante_url: "",
    redes_sociales: { instagram: "", twitter: "", facebook: "", web: "", youtube: "", tiktok: "" },
  };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    const { data } = await supabase.from("clubs").select("*").order("nombre");
    setClubs(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleGuardar() {
    const payload = {
      ...form,
      fundacion: form.fundacion ? parseInt(form.fundacion) : null,
      redes_sociales: form.redes_sociales,
    };
    if (editando === "nuevo") {
      await supabase.from("clubs").insert(payload);
    } else {
      await supabase.from("clubs").update(payload).eq("id", editando);
    }
    setEditando(null);
    setForm(emptyForm);
    load();
  }

  async function handleEliminar(id) {
    if (!confirm("Eliminar este equipo y todos sus datos?")) return;
    await supabase.from("jugador_club").delete().eq("club_id", id);
    await supabase.from("club_liga").delete().eq("club_id", id);
    await supabase.from("clubs").delete().eq("id", id);
    load();
  }

  function editarClub(club) {
    setEditando(club.id);
    const redes = club.redes_sociales || {};
    setForm({
      nombre: club.nombre || "",
      estadio: club.estadio || "",
      localidad: club.localidad || "",
      municipio: club.municipio || "",
      provincia: club.provincia || "",
      fundacion: club.fundacion?.toString() || "",
      color_principal: club.color_principal || "#1DB954",
      escudo_url: club.escudo_url || "",
      direccion: club.direccion || "",
      google_maps_url: club.google_maps_url || "",
      equipacion_local_url: club.equipacion_local_url || "",
      equipacion_visitante_url: club.equipacion_visitante_url || "",
      redes_sociales: {
        instagram: redes.instagram || "",
        twitter: redes.twitter || "",
        facebook: redes.facebook || "",
        web: redes.web || "",
        youtube: redes.youtube || "",
        tiktok: redes.tiktok || "",
      },
    });
  }

  if (loading) return <p className="text-gray-400 text-sm">Cargando...</p>;

  if (detalle) {
    return (
      <EquipoDetalle
        supabase={supabase}
        club={detalle}
        onBack={() => {
          setDetalle(null);
          load();
        }}
      />
    );
  }

  return (
    <div>
      <button
        onClick={() => {
          setEditando("nuevo");
          setForm(emptyForm);
        }}
        className="w-full mb-3 py-2 rounded-xl text-sm font-semibold border-2 border-dashed border-gray-200 text-gray-400 hover:border-[#1DB954] hover:text-[#1DB954] transition-colors"
      >
        + Nuevo equipo
      </button>

      {editando && (
        <FormCard onCancel={() => { setEditando(null); setForm(emptyForm); }} onSave={handleGuardar} canSave={!!form.nombre}>
          <Input label="Nombre del club" value={form.nombre} onChange={(v) => setForm({ ...form, nombre: v })} />
          <Input label="Estadio" value={form.estadio} onChange={(v) => setForm({ ...form, estadio: v })} />
          <Row>
            <Input label="Localidad" value={form.localidad} onChange={(v) => setForm({ ...form, localidad: v })} />
            <Input label="Municipio" value={form.municipio} onChange={(v) => setForm({ ...form, municipio: v })} />
          </Row>
          <Row>
            <Input label="Provincia" value={form.provincia} onChange={(v) => setForm({ ...form, provincia: v })} />
            <Input label="Año fundacion" value={form.fundacion} onChange={(v) => setForm({ ...form, fundacion: v })} type="number" />
          </Row>
          <Input label="URL escudo" value={form.escudo_url} onChange={(v) => setForm({ ...form, escudo_url: v })} placeholder="https://..." />
          <Row>
            <Input label="Equipacion local (URL)" value={form.equipacion_local_url} onChange={(v) => setForm({ ...form, equipacion_local_url: v })} />
            <Input label="Equipacion visitante (URL)" value={form.equipacion_visitante_url} onChange={(v) => setForm({ ...form, equipacion_visitante_url: v })} />
          </Row>
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-500">Color principal:</label>
            <input
              type="color"
              value={form.color_principal}
              onChange={(e) => setForm({ ...form, color_principal: e.target.value })}
              className="w-8 h-8 rounded border-0 cursor-pointer"
            />
          </div>
          <Input label="Direccion del campo" value={form.direccion} onChange={(v) => setForm({ ...form, direccion: v })} />
          <Input label="Google Maps URL" value={form.google_maps_url} onChange={(v) => setForm({ ...form, google_maps_url: v })} placeholder="https://maps.google.com/..." />
          <p className="text-xs font-semibold text-gray-500 mt-2">Redes sociales</p>
          <Row>
            <Input label="Instagram" value={form.redes_sociales.instagram} onChange={(v) => setForm({ ...form, redes_sociales: { ...form.redes_sociales, instagram: v } })} />
            <Input label="Twitter/X" value={form.redes_sociales.twitter} onChange={(v) => setForm({ ...form, redes_sociales: { ...form.redes_sociales, twitter: v } })} />
          </Row>
          <Row>
            <Input label="Facebook" value={form.redes_sociales.facebook} onChange={(v) => setForm({ ...form, redes_sociales: { ...form.redes_sociales, facebook: v } })} />
            <Input label="Web" value={form.redes_sociales.web} onChange={(v) => setForm({ ...form, redes_sociales: { ...form.redes_sociales, web: v } })} />
          </Row>
          <Row>
            <Input label="YouTube" value={form.redes_sociales.youtube} onChange={(v) => setForm({ ...form, redes_sociales: { ...form.redes_sociales, youtube: v } })} />
            <Input label="TikTok" value={form.redes_sociales.tiktok} onChange={(v) => setForm({ ...form, redes_sociales: { ...form.redes_sociales, tiktok: v } })} />
          </Row>
        </FormCard>
      )}

      <div className="space-y-1.5">
        {clubs.map((club) => (
          <div key={club.id} className="bg-gray-50 rounded-xl p-3">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 cursor-pointer"
                style={{ backgroundColor: club.color_principal || "#888" }}
                onClick={() => setDetalle(club)}
              >
                {club.nombre?.[0]}
              </div>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setDetalle(club)}>
                <p className="text-sm font-semibold truncate">{club.nombre}</p>
                <p className="text-xs text-gray-400">
                  {[club.localidad || club.municipio, club.provincia].filter(Boolean).join(", ")}
                </p>
              </div>
              <div className="flex gap-1.5">
                <BtnSmall label="Editar" color="green" onClick={() => editarClub(club)} />
                <BtnSmall label="Eliminar" color="red" onClick={() => handleEliminar(club.id)} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- Detalle de un equipo: plantilla ---- */

function EquipoDetalle({ supabase, club, onBack }) {
  const [jugadores, setJugadores] = useState([]);
  const [todosJugadores, setTodosJugadores] = useState([]);
  const [buscar, setBuscar] = useState("");
  const [showBuscador, setShowBuscador] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: jc } = await supabase
      .from("jugador_club")
      .select("*, jugador:jugadores(*)")
      .eq("club_id", club.id)
      .eq("activo", true);
    setJugadores(jc || []);

    const { data: all } = await supabase.from("jugadores").select("*").order("nombre");
    setTodosJugadores(all || []);
    setLoading(false);
  }, [supabase, club.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function addJugador(jugadorId) {
    const { data: temp } = await supabase.from("temporadas").select("id").limit(1).single();
    await supabase.from("jugador_club").insert({
      jugador_id: jugadorId,
      club_id: club.id,
      temporada_id: temp?.id,
      activo: true,
    });
    setShowBuscador(false);
    setBuscar("");
    load();
  }

  async function removeJugador(jcId) {
    await supabase.from("jugador_club").update({ activo: false }).eq("id", jcId);
    load();
  }

  async function updateDorsal(jcId, dorsal) {
    await supabase
      .from("jugador_club")
      .update({ dorsal: dorsal ? parseInt(dorsal) : null })
      .eq("id", jcId);
  }

  const jugadorIdsEnClub = new Set(jugadores.map((j) => j.jugador_id));
  const jugsFiltrados = todosJugadores.filter(
    (j) =>
      !jugadorIdsEnClub.has(j.id) &&
      `${j.nombre} ${j.apellidos}`.toLowerCase().includes(buscar.toLowerCase())
  );

  const posOrder = { POR: 1, DEF: 2, MED: 3, DEL: 4 };
  const sorted = [...jugadores].sort(
    (a, b) =>
      (posOrder[a.jugador?.posicion] || 5) - (posOrder[b.jugador?.posicion] || 5)
  );

  if (loading) return <p className="text-gray-400 text-sm">Cargando...</p>;

  return (
    <div>
      <button onClick={onBack} className="text-xs text-[#1DB954] font-semibold mb-3">
        ← Volver a equipos
      </button>
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
          style={{ backgroundColor: club.color_principal || "#888" }}
        >
          {club.nombre?.[0]}
        </div>
        <div>
          <h2 className="text-lg font-bold">{club.nombre}</h2>
          <p className="text-xs text-gray-400">Plantilla actual</p>
        </div>
      </div>

      <button
        onClick={() => setShowBuscador(!showBuscador)}
        className="w-full mb-3 py-2 rounded-xl text-sm font-semibold border-2 border-dashed border-gray-200 text-gray-400 hover:border-[#1DB954] hover:text-[#1DB954] transition-colors"
      >
        + Añadir jugador
      </button>

      {showBuscador && (
        <div className="bg-white border border-gray-200 rounded-xl p-3 mb-3">
          <input
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            placeholder="Buscar jugador por nombre..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-[#1DB954]/30"
            autoFocus
          />
          <div className="max-h-40 overflow-y-auto space-y-1">
            {jugsFiltrados.slice(0, 10).map((j) => (
              <button
                key={j.id}
                onClick={() => addJugador(j.id)}
                className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-[#1DB954]/10 transition-colors"
              >
                {j.nombre} {j.apellidos}
                <span className="text-xs text-gray-400 ml-2">{j.posicion}</span>
              </button>
            ))}
            {jugsFiltrados.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-2">
                No se encontraron jugadores
              </p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {sorted.map((jc) => (
          <div key={jc.id} className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
            <input
              type="number"
              defaultValue={jc.dorsal || ""}
              onBlur={(e) => updateDorsal(jc.id, e.target.value)}
              placeholder="#"
              className="w-10 text-center text-sm font-bold bg-white border border-gray-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-[#1DB954]/30"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">
                {jc.jugador?.nombre_futbolistico || `${jc.jugador?.nombre} ${jc.jugador?.apellidos}`}
              </p>
              <p className="text-xs text-gray-400">{jc.jugador?.posicion}</p>
            </div>
            <BtnSmall label="Quitar" color="red" onClick={() => removeJugador(jc.id)} />
          </div>
        ))}
        {jugadores.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-4">
            No hay jugadores en la plantilla
          </p>
        )}
      </div>
    </div>
  );
}

/* ===================== JUGADORES ===================== */

function JugadoresTab({ supabase }) {
  const [jugadores, setJugadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const emptyForm = {
    nombre: "", apellidos: "", nombre_futbolistico: "", posicion: "MED",
    fecha_nacimiento: "", lugar_nacimiento: "", nacionalidad: "",
    altura: "", peso: "", foto_url: "",
    equipo_procedencia: "", observaciones: "",
  };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("jugadores")
      .select("*, jugador_club(club:clubs(nombre), activo)")
      .order("nombre");
    setJugadores(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleGuardar() {
    const payload = {
      ...form,
      altura: form.altura ? parseInt(form.altura) : null,
      peso: form.peso ? parseInt(form.peso) : null,
      fecha_nacimiento: form.fecha_nacimiento || null,
    };
    if (editando === "nuevo") {
      await supabase.from("jugadores").insert(payload);
    } else {
      await supabase.from("jugadores").update(payload).eq("id", editando);
    }
    setEditando(null);
    setForm(emptyForm);
    load();
  }

  async function handleEliminar(id) {
    if (!confirm("Eliminar este jugador?")) return;
    await supabase.from("jugador_club").delete().eq("jugador_id", id);
    await supabase.from("jugadores").delete().eq("id", id);
    load();
  }

  function editarJugador(j) {
    setEditando(j.id);
    setForm({
      nombre: j.nombre || "",
      apellidos: j.apellidos || "",
      nombre_futbolistico: j.nombre_futbolistico || "",
      posicion: j.posicion || "MED",
      fecha_nacimiento: j.fecha_nacimiento || "",
      lugar_nacimiento: j.lugar_nacimiento || "",
      nacionalidad: j.nacionalidad || "",
      altura: j.altura?.toString() || "",
      peso: j.peso?.toString() || "",
      foto_url: j.foto_url || "",
      equipo_procedencia: j.equipo_procedencia || "",
      observaciones: j.observaciones || "",
    });
  }

  const filtrados = jugadores.filter((j) =>
    `${j.nombre} ${j.apellidos} ${j.nombre_futbolistico || ""}`
      .toLowerCase()
      .includes(busqueda.toLowerCase())
  );

  if (loading) return <p className="text-gray-400 text-sm">Cargando...</p>;

  return (
    <div>
      <button
        onClick={() => {
          setEditando("nuevo");
          setForm(emptyForm);
        }}
        className="w-full mb-3 py-2 rounded-xl text-sm font-semibold border-2 border-dashed border-gray-200 text-gray-400 hover:border-[#1DB954] hover:text-[#1DB954] transition-colors"
      >
        + Nuevo jugador
      </button>

      {editando && (
        <FormCard onCancel={() => { setEditando(null); setForm(emptyForm); }} onSave={handleGuardar} canSave={!!form.nombre}>
          <Row>
            <Input label="Nombre" value={form.nombre} onChange={(v) => setForm({ ...form, nombre: v })} />
            <Input label="Apellidos" value={form.apellidos} onChange={(v) => setForm({ ...form, apellidos: v })} />
          </Row>
          <Row>
            <Input label="Nombre futbolistico" value={form.nombre_futbolistico} onChange={(v) => setForm({ ...form, nombre_futbolistico: v })} placeholder="Apodo o nombre conocido" />
            <Select
              label="Posicion"
              value={form.posicion}
              onChange={(v) => setForm({ ...form, posicion: v })}
              options={[
                { value: "POR", label: "Portero" },
                { value: "DEF", label: "Defensa" },
                { value: "MED", label: "Centrocampista" },
                { value: "DEL", label: "Delantero" },
              ]}
            />
          </Row>
          <Row>
            <Input label="Fecha nacimiento" value={form.fecha_nacimiento} onChange={(v) => setForm({ ...form, fecha_nacimiento: v })} type="date" />
            <Input label="Lugar nacimiento" value={form.lugar_nacimiento} onChange={(v) => setForm({ ...form, lugar_nacimiento: v })} />
          </Row>
          <Row>
            <Input label="Nacionalidad" value={form.nacionalidad} onChange={(v) => setForm({ ...form, nacionalidad: v })} />
            <Input label="Equipo procedencia" value={form.equipo_procedencia} onChange={(v) => setForm({ ...form, equipo_procedencia: v })} />
          </Row>
          <Row>
            <Input label="Altura (cm)" value={form.altura} onChange={(v) => setForm({ ...form, altura: v })} type="number" />
            <Input label="Peso (kg)" value={form.peso} onChange={(v) => setForm({ ...form, peso: v })} type="number" />
          </Row>
          <Input label="URL foto" value={form.foto_url} onChange={(v) => setForm({ ...form, foto_url: v })} placeholder="https://..." />
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Observaciones</label>
            <textarea
              value={form.observaciones}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1DB954]/30 resize-none"
            />
          </div>
        </FormCard>
      )}

      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar jugador..."
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[#1DB954]/30"
      />

      <p className="text-xs text-gray-400 mb-2">{filtrados.length} jugadores</p>

      <div className="space-y-1.5">
        {filtrados.slice(0, 50).map((j) => {
          const clubActivo = j.jugador_club?.find((jc) => jc.activo);
          return (
            <div key={j.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
              <div className="w-8 h-8 rounded-full bg-[#1DB954]/10 text-[#1DB954] flex items-center justify-center text-xs font-bold shrink-0">
                {j.posicion?.slice(0, 3)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {j.nombre_futbolistico || `${j.nombre} ${j.apellidos}`}
                </p>
                <p className="text-xs text-gray-400">
                  {clubActivo?.club?.nombre || "Sin equipo"}
                  {j.nombre_futbolistico && (
                    <span className="ml-1">({j.nombre} {j.apellidos})</span>
                  )}
                </p>
              </div>
              <div className="flex gap-1.5">
                <BtnSmall label="Editar" color="green" onClick={() => editarJugador(j)} />
                <BtnSmall label="Eliminar" color="red" onClick={() => handleEliminar(j.id)} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===================== COLABORADORES ===================== */

function ColaboradoresTab({ supabase }) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSolicitudes();
  }, []);

  async function loadSolicitudes() {
    const { data } = await supabase
      .from("colaboradores")
      .select("*, usuario:perfiles(nombre, email), club:clubs(nombre)")
      .order("fecha_solicitud", { ascending: false });
    setSolicitudes(data || []);
    setLoading(false);
  }

  async function handleAprobar(id, aprobar) {
    await supabase.from("colaboradores").update({ aprobado: aprobar }).eq("id", id);
    if (aprobar) {
      const sol = solicitudes.find((s) => s.id === id);
      if (sol) {
        await supabase.from("perfiles").update({ rol: "colaborador" }).eq("id", sol.usuario_id);
      }
    }
    loadSolicitudes();
  }

  if (loading) return <p className="text-gray-400 text-sm">Cargando...</p>;

  return (
    <div className="space-y-2">
      {solicitudes.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-4">No hay solicitudes</p>
      )}
      {solicitudes.map((s) => (
        <div key={s.id} className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{s.usuario?.nombre}</p>
            <p className="text-xs text-gray-400 truncate">
              {s.usuario?.email} → {s.club?.nombre}
            </p>
          </div>
          {s.aprobado ? (
            <span className="text-[10px] font-bold text-[#1DB954] bg-[#1DB954]/10 px-2 py-1 rounded-full">
              Aprobado
            </span>
          ) : (
            <div className="flex gap-1">
              <button
                onClick={() => handleAprobar(s.id, true)}
                className="text-[10px] font-bold text-white bg-[#1DB954] px-2.5 py-1 rounded-full"
              >
                Aprobar
              </button>
              <button
                onClick={() => handleAprobar(s.id, false)}
                className="text-[10px] font-bold text-red-500 bg-red-50 px-2.5 py-1 rounded-full"
              >
                Rechazar
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ===================== COMPONENTES REUTILIZABLES ===================== */

function FormCard({ children, onCancel, onSave, canSave }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 space-y-3">
      {children}
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-600">
          Cancelar
        </button>
        <button onClick={onSave} disabled={!canSave} className="flex-1 py-2 rounded-lg text-sm font-semibold bg-[#1DB954] text-white disabled:opacity-50">
          Guardar
        </button>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div className="flex-1">
      {label && <label className="text-xs text-gray-500 mb-1 block">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1DB954]/30"
      />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div className="flex-1">
      {label && <label className="text-xs text-gray-500 mb-1 block">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1DB954]/30 bg-white"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Row({ children }) {
  return <div className="flex gap-2">{children}</div>;
}

function BtnSmall({ label, color, onClick }) {
  const colors = {
    green: "text-[#1DB954]",
    red: "text-red-500",
  };
  return (
    <button onClick={onClick} className={`text-[10px] font-bold ${colors[color] || ""}`}>
      {label}
    </button>
  );
}
