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
    { id: "partidos", label: "Partidos" },
    { id: "colaboradores", label: "Colaboradores" },
    { id: "peticiones", label: "Peticiones" },
    ...(perfil.is_ceo ? [{ id: "admins", label: "⚙ Admins" }] : []),
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
        {tab === "partidos" && <PartidosAdminTab supabase={supabase} />}
        {tab === "colaboradores" && <ColaboradoresTab supabase={supabase} />}
        {tab === "peticiones" && <PeticionesAdminTab supabase={supabase} adminId={perfil.id} />}
        {tab === "admins" && perfil.is_ceo && <AdminsTab supabase={supabase} ceoId={perfil.id} />}
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
    logo_url: "",
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
            logo_url: "",
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
          <Row>
            <Input label="Comunidad Autonoma" value={form.comunidad_autonoma} onChange={(v) => setForm({ ...form, comunidad_autonoma: v })} placeholder="Ej: Andalucia" />
            <Input label="Provincia" value={form.provincia} onChange={(v) => setForm({ ...form, provincia: v })} placeholder="Ej: Cadiz" />
          </Row>
          <Select
            label="Temporada"
            value={form.temporada_id}
            onChange={(v) => setForm({ ...form, temporada_id: v })}
            options={temporadas.map((t) => ({ value: t.id, label: t.nombre }))}
          />
          <ImageUpload
            label="Logo de la competicion"
            value={form.logo_url}
            onChange={(v) => setForm({ ...form, logo_url: v })}
            bucket="escudos"
            path={`ligas/${sanitizePath(form.nombre) || "liga"}`}
            supabase={supabase}
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
                      logo_url: liga.logo_url || "",
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
  const [creandoEquipo, setCreandoEquipo] = useState(false);
  const [formNuevoClub, setFormNuevoClub] = useState({ nombre: "", provincia: "", municipio: "", color_principal: "#1DB954" });
  const [savingClub, setSavingClub] = useState(false);

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

  async function crearYAniadirEquipo() {
    if (!formNuevoClub.nombre) return;
    setSavingClub(true);
    const { data: club } = await supabase.from("clubs").insert({
      nombre: formNuevoClub.nombre,
      provincia: formNuevoClub.provincia || liga.provincia || "",
      municipio: formNuevoClub.municipio,
      comunidad_autonoma: liga.comunidad_autonoma || "",
      color_principal: formNuevoClub.color_principal,
    }).select().single();
    if (club) await addClub(club.id);
    setCreandoEquipo(false);
    setFormNuevoClub({ nombre: "", provincia: "", municipio: "", color_principal: "#1DB954" });
    setSavingClub(false);
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
            {clubsFiltrados.length === 0 && buscar && !creandoEquipo && (
              <div className="border-t border-gray-100 pt-2 mt-1">
                <p className="text-xs text-gray-400 mb-1">No existe en la base de datos</p>
                <button
                  onClick={() => { setCreandoEquipo(true); setFormNuevoClub((f) => ({ ...f, nombre: buscar })); }}
                  className="w-full text-xs font-semibold text-[#1DB954] py-2 rounded-lg hover:bg-[#1DB954]/5"
                >
                  + Crear equipo &ldquo;{buscar}&rdquo;
                </button>
              </div>
            )}
            {clubsFiltrados.length === 0 && !buscar && (
              <p className="text-xs text-gray-400 text-center py-2">Escribe para buscar</p>
            )}
          </div>
        </div>
      )}

      {creandoEquipo && (
        <div className="bg-white border border-[#1DB954]/30 rounded-xl p-4 mb-3 space-y-3">
          <h4 className="text-sm font-bold text-gray-800">Crear nuevo equipo</h4>
          <Input label="Nombre *" value={formNuevoClub.nombre} onChange={(v) => setFormNuevoClub({ ...formNuevoClub, nombre: v })} />
          <Row>
            <Input label="Municipio" value={formNuevoClub.municipio} onChange={(v) => setFormNuevoClub({ ...formNuevoClub, municipio: v })} />
            <Input label="Provincia" value={formNuevoClub.provincia} onChange={(v) => setFormNuevoClub({ ...formNuevoClub, provincia: v })} placeholder={liga.provincia || ""} />
          </Row>
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-500">Color:</label>
            <input type="color" value={formNuevoClub.color_principal}
              onChange={(e) => setFormNuevoClub({ ...formNuevoClub, color_principal: e.target.value })}
              className="w-8 h-8 rounded border-0 cursor-pointer"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setCreandoEquipo(false)} className="flex-1 py-2 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600">Cancelar</button>
            <button onClick={crearYAniadirEquipo} disabled={!formNuevoClub.nombre || savingClub}
              className="flex-1 py-2 rounded-lg text-xs font-semibold bg-[#1DB954] text-white disabled:opacity-50">
              {savingClub ? "Creando..." : "Crear y añadir"}
            </button>
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
    nombre: "", estadio: "", localidad: "", municipio: "", provincia: "", comunidad_autonoma: "",
    fundacion: "", color_principal: "#1DB954", presidente: "", telefono: "", email_contacto: "",
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
      comunidad_autonoma: club.comunidad_autonoma || "",
      fundacion: club.fundacion?.toString() || "",
      color_principal: club.color_principal || "#1DB954",
      presidente: club.presidente || "",
      telefono: club.telefono || "",
      email_contacto: club.email_contacto || "",
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
            <Input label="Comunidad Autonoma" value={form.comunidad_autonoma} onChange={(v) => setForm({ ...form, comunidad_autonoma: v })} />
            <Input label="Provincia" value={form.provincia} onChange={(v) => setForm({ ...form, provincia: v })} />
          </Row>
          <Row>
            <Input label="Año fundacion" value={form.fundacion} onChange={(v) => setForm({ ...form, fundacion: v })} type="number" />
            <Input label="Presidente" value={form.presidente} onChange={(v) => setForm({ ...form, presidente: v })} />
          </Row>
          <Row>
            <Input label="Telefono" value={form.telefono} onChange={(v) => setForm({ ...form, telefono: v })} placeholder="+34 600 000 000" />
            <Input label="Email contacto" value={form.email_contacto} onChange={(v) => setForm({ ...form, email_contacto: v })} placeholder="club@email.com" />
          </Row>
          <ImageUpload
            label="Escudo del club"
            value={form.escudo_url}
            onChange={(v) => setForm({ ...form, escudo_url: v })}
            bucket="escudos"
            path={`clubs/${sanitizePath(form.nombre) || "club"}`}
            supabase={supabase}
          />
          <Row>
            <ImageUpload
              label="Equipación local"
              value={form.equipacion_local_url}
              onChange={(v) => setForm({ ...form, equipacion_local_url: v })}
              bucket="escudos"
              path={`equipaciones/${sanitizePath(form.nombre) || "club"}-local`}
              supabase={supabase}
            />
            <ImageUpload
              label="Equipación visitante"
              value={form.equipacion_visitante_url}
              onChange={(v) => setForm({ ...form, equipacion_visitante_url: v })}
              bucket="escudos"
              path={`equipaciones/${sanitizePath(form.nombre) || "club"}-visitante`}
              supabase={supabase}
            />
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
  // Competiciones
  const [ligasDelClub, setLigasDelClub] = useState([]);
  const [todasLigas, setTodasLigas] = useState([]);
  const [showLigas, setShowLigas] = useState(false);
  const [buscarLiga, setBuscarLiga] = useState("");
  // Crear jugador rápido
  const [creandoJugador, setCreandoJugador] = useState(false);
  const [formJugador, setFormJugador] = useState({ nombre: "", apellidos: "", posicion: "MED" });
  const [savingJugador, setSavingJugador] = useState(false);

  const load = useCallback(async () => {
    const [{ data: jc }, { data: all }, { data: cl }, { data: ligas }] = await Promise.all([
      supabase.from("jugador_club").select("*, jugador:jugadores(*)").eq("club_id", club.id).eq("activo", true),
      supabase.from("jugadores").select("*").order("nombre"),
      supabase.from("club_liga").select("*, grupo:grupos(id, liga:ligas(id, nombre, categoria))").eq("club_id", club.id),
      supabase.from("ligas").select("id, nombre, categoria, grupos(id)").eq("activa", true).order("nombre"),
    ]);
    setJugadores(jc || []);
    setTodosJugadores(all || []);
    setLigasDelClub(cl || []);
    setTodasLigas(ligas || []);
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

  async function addALiga(grupoId) {
    const { data: temp } = await supabase.from("temporadas").select("id").limit(1).single();
    await supabase.from("club_liga").insert({ club_id: club.id, grupo_id: grupoId, temporada_id: temp?.id });
    setShowLigas(false);
    setBuscarLiga("");
    load();
  }

  async function quitarDeLiga(clId) {
    await supabase.from("club_liga").delete().eq("id", clId);
    load();
  }

  async function crearJugadorRapido() {
    if (!formJugador.nombre) return;
    setSavingJugador(true);
    const { data: j } = await supabase.from("jugadores").insert({
      nombre: formJugador.nombre,
      apellidos: formJugador.apellidos,
      posicion: formJugador.posicion,
    }).select().single();
    if (j) await addJugador(j.id);
    setCreandoJugador(false);
    setFormJugador({ nombre: "", apellidos: "", posicion: "MED" });
    setSavingJugador(false);
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

      {/* Competiciones del equipo */}
      <div className="mb-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Competiciones</p>
        {ligasDelClub.length > 0 && (
          <div className="space-y-1 mb-2">
            {ligasDelClub.map((cl) => (
              <div key={cl.id} className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2">
                <span className="text-xs font-semibold flex-1 text-blue-700">{cl.grupo?.liga?.nombre}</span>
                <BtnSmall label="Quitar" color="red" onClick={() => quitarDeLiga(cl.id)} />
              </div>
            ))}
          </div>
        )}
        <button onClick={() => setShowLigas(!showLigas)}
          className="w-full py-2 rounded-xl text-xs font-semibold border-2 border-dashed border-gray-200 text-gray-400 hover:border-blue-400 hover:text-blue-400 transition-colors">
          + Añadir a competición
        </button>
        {showLigas && (
          <div className="bg-white border border-gray-200 rounded-xl p-3 mt-2">
            <input value={buscarLiga} onChange={(e) => setBuscarLiga(e.target.value)}
              placeholder="Buscar competición..." autoFocus
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-[#1DB954]/30"
            />
            <div className="max-h-40 overflow-y-auto space-y-1">
              {todasLigas
                .filter((l) => !ligasDelClub.some((cl) => cl.grupo?.liga?.id === l.id))
                .filter((l) => l.nombre.toLowerCase().includes(buscarLiga.toLowerCase()))
                .slice(0, 10)
                .map((l) => (
                  <button key={l.id} onClick={() => addALiga(l.grupos?.[0]?.id)}
                    className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-[#1DB954]/10">
                    {l.nombre}
                    <span className="text-xs text-gray-400 ml-2">{l.categoria}</span>
                  </button>
                ))}
              {todasLigas.filter((l) => l.nombre.toLowerCase().includes(buscarLiga.toLowerCase())).length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">No se encontraron competiciones</p>
              )}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => setShowBuscador(!showBuscador)}
        className="w-full mb-3 py-2 rounded-xl text-sm font-semibold border-2 border-dashed border-gray-200 text-gray-400 hover:border-[#1DB954] hover:text-[#1DB954] transition-colors"
      >
        + Añadir jugador existente
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
            {jugsFiltrados.length === 0 && buscar && !creandoJugador && (
              <div className="border-t border-gray-100 pt-2 mt-1">
                <p className="text-xs text-gray-400 mb-1">No existe en la base de datos</p>
                <button onClick={() => { setCreandoJugador(true); setFormJugador((f) => ({ ...f, nombre: buscar.split(" ")[0], apellidos: buscar.split(" ").slice(1).join(" ") })); }}
                  className="w-full text-xs font-semibold text-[#1DB954] py-2 rounded-lg hover:bg-[#1DB954]/5">
                  + Crear jugador &ldquo;{buscar}&rdquo;
                </button>
              </div>
            )}
            {jugsFiltrados.length === 0 && !buscar && (
              <p className="text-xs text-gray-400 text-center py-2">Escribe para buscar</p>
            )}
          </div>
        </div>
      )}

      {creandoJugador && (
        <div className="bg-white border border-[#1DB954]/30 rounded-xl p-4 mb-3 space-y-3">
          <h4 className="text-sm font-bold text-gray-800">Crear nuevo jugador</h4>
          <Row>
            <Input label="Nombre *" value={formJugador.nombre} onChange={(v) => setFormJugador({ ...formJugador, nombre: v })} />
            <Input label="Apellidos" value={formJugador.apellidos} onChange={(v) => setFormJugador({ ...formJugador, apellidos: v })} />
          </Row>
          <Select label="Posición" value={formJugador.posicion} onChange={(v) => setFormJugador({ ...formJugador, posicion: v })}
            options={[{ value: "POR", label: "Portero" }, { value: "DEF", label: "Defensa" }, { value: "MED", label: "Centrocampista" }, { value: "DEL", label: "Delantero" }]}
          />
          <div className="flex gap-2">
            <button onClick={() => setCreandoJugador(false)} className="flex-1 py-2 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600">Cancelar</button>
            <button onClick={crearJugadorRapido} disabled={!formJugador.nombre || savingJugador}
              className="flex-1 py-2 rounded-lg text-xs font-semibold bg-[#1DB954] text-white disabled:opacity-50">
              {savingJugador ? "Creando..." : "Crear y añadir"}
            </button>
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
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [asignandoEquipo, setAsignandoEquipo] = useState(null); // jugador id
  const [busquedaClub, setBusquedaClub] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const emptyForm = {
    nombre: "", apellidos: "", nombre_futbolistico: "", posicion: "MED",
    posicion_especifica: "", pie_dominante: "Diestro",
    fecha_nacimiento: "", lugar_nacimiento: "", nacionalidad: "",
    altura: "", peso: "", foto_url: "",
    equipo_procedencia: "", observaciones: "",
  };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    const [{ data }, { data: clubsData }] = await Promise.all([
      supabase.from("jugadores").select("*, jugador_club(id, club:clubs(id, nombre), activo)").order("nombre"),
      supabase.from("clubs").select("id, nombre").order("nombre"),
    ]);
    setJugadores(data || []);
    setClubs(clubsData || []);
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

  async function asignarAClub(jugadorId, clubId) {
    const { data: temp } = await supabase.from("temporadas").select("id").limit(1).single();
    // Desactivar equipo anterior
    await supabase.from("jugador_club").update({ activo: false }).eq("jugador_id", jugadorId).eq("activo", true);
    // Insertar en nuevo equipo
    await supabase.from("jugador_club").insert({ jugador_id: jugadorId, club_id: clubId, temporada_id: temp?.id, activo: true });
    setAsignandoEquipo(null);
    setBusquedaClub("");
    load();
  }

  async function quitarDeEquipo(jugadorId) {
    await supabase.from("jugador_club").update({ activo: false }).eq("jugador_id", jugadorId).eq("activo", true);
    load();
  }

  function editarJugador(j) {
    setEditando(j.id);
    setForm({
      nombre: j.nombre || "",
      apellidos: j.apellidos || "",
      nombre_futbolistico: j.nombre_futbolistico || "",
      posicion: j.posicion || "MED",
      posicion_especifica: j.posicion_especifica || "",
      pie_dominante: j.pie_dominante || "Diestro",
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
            <Input label="Apodo / Nombre futbolistico" value={form.nombre_futbolistico} onChange={(v) => setForm({ ...form, nombre_futbolistico: v })} placeholder="Nombre conocido" />
            <Select
              label="Posicion"
              value={form.posicion}
              onChange={(v) => setForm({ ...form, posicion: v, posicion_especifica: "" })}
              options={[
                { value: "POR", label: "Portero" },
                { value: "DEF", label: "Defensa" },
                { value: "MED", label: "Centrocampista" },
                { value: "DEL", label: "Delantero" },
              ]}
            />
          </Row>
          <Row>
            <Select
              label="Posicion especifica"
              value={form.posicion_especifica}
              onChange={(v) => setForm({ ...form, posicion_especifica: v })}
              options={[
                { value: "", label: "— Sin especificar —" },
                ...{
                  POR: [{ value: "Portero", label: "Portero" }],
                  DEF: [
                    { value: "Lateral derecho", label: "Lateral derecho" },
                    { value: "Lateral izquierdo", label: "Lateral izquierdo" },
                    { value: "Central", label: "Central" },
                  ],
                  MED: [
                    { value: "Pivote", label: "Pivote" },
                    { value: "Mediocentro", label: "Mediocentro" },
                    { value: "Interior", label: "Interior" },
                    { value: "Mediapunta", label: "Mediapunta" },
                    { value: "Extremo derecho", label: "Extremo derecho" },
                    { value: "Extremo izquierdo", label: "Extremo izquierdo" },
                  ],
                  DEL: [
                    { value: "Delantero centro", label: "Delantero centro" },
                    { value: "Segunda punta", label: "Segunda punta" },
                    { value: "Extremo derecho", label: "Extremo derecho" },
                    { value: "Extremo izquierdo", label: "Extremo izquierdo" },
                  ],
                }[form.posicion] || [],
              ]}
            />
            <Select
              label="Pie dominante"
              value={form.pie_dominante}
              onChange={(v) => setForm({ ...form, pie_dominante: v })}
              options={[
                { value: "Diestro", label: "Diestro" },
                { value: "Zurdo", label: "Zurdo" },
                { value: "Ambidiestro", label: "Ambidiestro" },
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
          <ImageUpload
            label="Foto del jugador"
            value={form.foto_url}
            onChange={(v) => setForm({ ...form, foto_url: v })}
            bucket="escudos"
            path={`jugadores/${sanitizePath(form.nombre) || "jugador"}-${sanitizePath(form.apellidos) || Date.now()}`}
            supabase={supabase}
          />
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
          const esteAsignando = asignandoEquipo === j.id;
          return (
            <div key={j.id} className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1DB954]/10 text-[#1DB954] flex items-center justify-center text-xs font-bold shrink-0">
                  {j.posicion?.slice(0, 3)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {j.nombre_futbolistico || `${j.nombre} ${j.apellidos}`}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {clubActivo ? (
                      <>
                        <span className="text-xs text-gray-500">{clubActivo.club?.nombre}</span>
                        <button onClick={() => quitarDeEquipo(j.id)}
                          className="text-[10px] text-red-400 hover:text-red-600 font-semibold">
                          Sin equipo
                        </button>
                      </>
                    ) : (
                      <button onClick={() => { setAsignandoEquipo(j.id); setBusquedaClub(""); }}
                        className="text-[10px] text-[#1DB954] font-semibold">
                        + Asignar equipo
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <BtnSmall label="Editar" color="green" onClick={() => editarJugador(j)} />
                  <BtnSmall label="Eliminar" color="red" onClick={() => handleEliminar(j.id)} />
                </div>
              </div>

              {esteAsignando && (
                <div className="mt-2 bg-white border border-gray-200 rounded-lg p-2">
                  <input value={busquedaClub} onChange={(e) => setBusquedaClub(e.target.value)}
                    placeholder="Buscar equipo..." autoFocus
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs mb-1 focus:outline-none focus:ring-2 focus:ring-[#1DB954]/30"
                  />
                  <div className="max-h-32 overflow-y-auto space-y-0.5">
                    {clubs.filter((c) => c.nombre.toLowerCase().includes(busquedaClub.toLowerCase())).slice(0, 8).map((c) => (
                      <button key={c.id} onClick={() => asignarAClub(j.id, c.id)}
                        className="w-full text-left text-xs px-3 py-1.5 rounded-lg hover:bg-[#1DB954]/10">
                        {c.nombre}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setAsignandoEquipo(null)} className="text-xs text-gray-400 mt-1 hover:text-gray-600">Cancelar</button>
                </div>
              )}
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

/* ===================== PETICIONES ===================== */

const TIPO_ICON_ADMIN = { competicion: "🏆", equipo: "🏟️", jugador: "👤" };
const TIPO_LABEL_ADMIN = { competicion: "Competición", equipo: "Equipo", jugador: "Jugador" };

function PeticionesAdminTab({ supabase, adminId }) {
  const [peticiones, setPeticiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("pendiente");
  const [rechazando, setRechazando] = useState(null);
  const [notaRechazo, setNotaRechazo] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("peticiones")
      .select("*, usuario:perfiles(nombre, email, avatar_url)")
      .order("created_at", { ascending: false });
    setPeticiones(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  async function aprobar(peticion) {
    const d = peticion.datos;
    let entidadId = null;

    if (peticion.tipo === "competicion") {
      const { data: temporadas } = await supabase.from("temporadas").select("id").limit(1).single();
      const { data } = await supabase.from("ligas").insert({
        nombre: d.nombre, categoria: d.categoria,
        comunidad_autonoma: d.comunidad_autonoma, provincia: d.provincia,
        logo_url: d.logo_url || null, activa: true,
        temporada_id: temporadas?.id,
      }).select().single();
      if (data) {
        await supabase.from("grupos").insert({ liga_id: data.id, nombre: "Grupo Único" });
        entidadId = data.id;
      }
    }

    if (peticion.tipo === "equipo") {
      const { data } = await supabase.from("clubs").insert({
        nombre: d.nombre, comunidad_autonoma: d.comunidad_autonoma,
        provincia: d.provincia, municipio: d.municipio,
        presidente: d.presidente, telefono: d.telefono,
        email_contacto: d.email_contacto,
        fundacion: d.fundacion ? parseInt(d.fundacion) : null,
        color_principal: d.color_principal || "#1DB954",
        escudo_url: d.escudo_url || null,
      }).select().single();
      if (data) entidadId = data.id;
    }

    if (peticion.tipo === "jugador") {
      const { data } = await supabase.from("jugadores").insert({
        nombre: d.nombre, apellidos: d.apellidos,
        nombre_futbolistico: d.nombre_futbolistico,
        posicion: d.posicion, posicion_especifica: d.posicion_especifica,
        pie_dominante: d.pie_dominante,
        fecha_nacimiento: d.fecha_nacimiento || null,
        lugar_nacimiento: d.lugar_nacimiento, nacionalidad: d.nacionalidad,
        altura: d.altura ? parseInt(d.altura) : null,
        peso: d.peso ? parseInt(d.peso) : null,
        equipo_procedencia: d.equipo_procedencia,
        foto_url: d.foto_url || null,
      }).select().single();
      if (data) entidadId = data.id;
    }

    await supabase.from("peticiones").update({
      estado: "aprobado", admin_id: adminId,
      entidad_creada_id: entidadId, updated_at: new Date().toISOString(),
    }).eq("id", peticion.id);

    load();
  }

  async function rechazar(id) {
    await supabase.from("peticiones").update({
      estado: "rechazado", admin_id: adminId,
      notas_admin: notaRechazo || null, updated_at: new Date().toISOString(),
    }).eq("id", id);
    setRechazando(null);
    setNotaRechazo("");
    load();
  }

  if (loading) return <p className="text-gray-400 text-sm">Cargando...</p>;

  const filtradas = peticiones.filter((p) => p.estado === filtro);

  const counts = {
    pendiente: peticiones.filter((p) => p.estado === "pendiente").length,
    aprobado: peticiones.filter((p) => p.estado === "aprobado").length,
    rechazado: peticiones.filter((p) => p.estado === "rechazado").length,
  };

  return (
    <div>
      {/* Filtro */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
        {["pendiente", "aprobado", "rechazado"].map((e) => (
          <button key={e} onClick={() => setFiltro(e)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filtro === e ? "bg-white shadow-sm text-gray-800" : "text-gray-400"
            }`}
          >
            {e.charAt(0).toUpperCase() + e.slice(1)}
            {counts[e] > 0 && <span className={`ml-1 ${e === "pendiente" ? "text-yellow-600" : ""}`}>({counts[e]})</span>}
          </button>
        ))}
      </div>

      {filtradas.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-8">No hay peticiones {filtro}s</p>
      )}

      <div className="space-y-3">
        {filtradas.map((p) => (
          <div key={p.id} className="bg-gray-50 rounded-xl p-4">
            {/* Cabecera */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{TIPO_ICON_ADMIN[p.tipo]}</span>
              <div className="flex-1">
                <p className="text-sm font-bold">{p.datos?.nombre || TIPO_LABEL_ADMIN[p.tipo]}</p>
                <p className="text-xs text-gray-400">
                  {p.usuario?.nombre} · {new Date(p.created_at).toLocaleDateString("es-ES")}
                </p>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                p.estado === "pendiente" ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                : p.estado === "aprobado" ? "bg-green-50 text-green-700 border-green-200"
                : "bg-red-50 text-red-600 border-red-200"
              }`}>
                {p.estado}
              </span>
            </div>

            {/* Datos */}
            <div className="bg-white rounded-lg p-3 text-xs space-y-1 mb-3">
              {Object.entries(p.datos || {}).map(([k, v]) => {
                if (!v || k === "color_principal") return null;
                return (
                  <div key={k} className="flex gap-2">
                    <span className="text-gray-400 capitalize min-w-[100px]">{k.replace(/_/g, " ")}:</span>
                    <span className="text-gray-700 font-medium">{v}</span>
                  </div>
                );
              })}
              {p.datos?.color_principal && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 min-w-[100px]">Color:</span>
                  <span className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: p.datos.color_principal }} />
                  <span className="text-gray-700 font-medium">{p.datos.color_principal}</span>
                </div>
              )}
            </div>

            {/* Acciones */}
            {p.estado === "pendiente" && (
              <>
                {rechazando === p.id ? (
                  <div className="space-y-2">
                    <input
                      value={notaRechazo}
                      onChange={(e) => setNotaRechazo(e.target.value)}
                      placeholder="Motivo del rechazo (opcional)"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setRechazando(null)}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600">
                        Cancelar
                      </button>
                      <button onClick={() => rechazar(p.id)}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold bg-red-500 text-white">
                        Confirmar rechazo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => { setRechazando(p.id); setNotaRechazo(""); }}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold border border-red-200 text-red-500">
                      Rechazar
                    </button>
                    <button onClick={() => aprobar(p)}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold bg-[#1DB954] text-white">
                      Aprobar y crear
                    </button>
                  </div>
                )}
              </>
            )}
            {p.estado === "rechazado" && p.notas_admin && (
              <p className="text-xs text-red-500 bg-red-50 rounded-lg px-2 py-1">Motivo: {p.notas_admin}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===================== ADMINS (solo CEO) ===================== */

function AdminsTab({ supabase, ceoId }) {
  const [usuarios, setUsuarios] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("perfiles")
      .select("id, nombre, email, rol, is_ceo, avatar_url")
      .order("nombre");
    setUsuarios(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  async function promoverAdmin(id) {
    if (!confirm("¿Dar permisos de administrador a este usuario?")) return;
    await supabase.from("perfiles").update({ rol: "admin" }).eq("id", id);
    load();
  }

  async function degradar(id) {
    if (!confirm("¿Quitar permisos de administrador? El usuario pasará a ser visitante.")) return;
    await supabase.from("perfiles").update({ rol: "visitante" }).eq("id", id);
    load();
  }

  const filtrados = usuarios.filter((u) =>
    `${u.nombre} ${u.email}`.toLowerCase().includes(busqueda.toLowerCase())
  );

  if (loading) return <p className="text-gray-400 text-sm">Cargando...</p>;

  const admins = filtrados.filter((u) => u.rol === "admin");
  const resto = filtrados.filter((u) => u.rol !== "admin");

  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">
        Solo tú (CEO) puedes gestionar los administradores de la plataforma.
      </p>

      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar usuario..."
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[#1DB954]/30"
      />

      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
        Administradores ({admins.length})
      </p>
      <div className="space-y-1.5 mb-5">
        {admins.map((u) => (
          <div key={u.id} className="flex items-center gap-3 bg-red-50 rounded-xl p-3">
            {u.avatar_url ? (
              <img src={u.avatar_url} className="w-8 h-8 rounded-full object-cover shrink-0" alt="" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-red-200 text-red-700 flex items-center justify-center text-xs font-bold shrink-0">
                {u.nombre?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">
                {u.nombre} {u.is_ceo && <span className="text-[10px] text-red-500 font-bold ml-1">CEO</span>}
              </p>
              <p className="text-xs text-gray-400 truncate">{u.email}</p>
            </div>
            {u.id !== ceoId && (
              <BtnSmall label="Quitar admin" color="red" onClick={() => degradar(u.id)} />
            )}
          </div>
        ))}
        {admins.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-2">No hay administradores</p>
        )}
      </div>

      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
        Otros usuarios ({resto.length})
      </p>
      <div className="space-y-1.5">
        {resto.slice(0, 30).map((u) => (
          <div key={u.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
            {u.avatar_url ? (
              <img src={u.avatar_url} className="w-8 h-8 rounded-full object-cover shrink-0" alt="" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold shrink-0">
                {u.nombre?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{u.nombre}</p>
              <p className="text-xs text-gray-400 truncate">{u.email} · {u.rol}</p>
            </div>
            <BtnSmall label="Hacer admin" color="green" onClick={() => promoverAdmin(u.id)} />
          </div>
        ))}
        {resto.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-2">No hay más usuarios</p>
        )}
      </div>
    </div>
  );
}

/* ===================== PARTIDOS ADMIN ===================== */

function PartidosAdminTab({ supabase }) {
  const [partidos, setPartidos] = useState([]);
  const [ligas, setLigas] = useState([]);
  const [ligaFiltro, setLigaFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null); // partido seleccionado

  const load = useCallback(async () => {
    const [{ data: ps }, { data: ls }] = await Promise.all([
      supabase
        .from("partidos")
        .select("*, local:clubs!partidos_local_id_fkey(id, nombre, escudo_url, color_principal), visitante:clubs!partidos_visitante_id_fkey(id, nombre, escudo_url, color_principal), grupo:grupos(id, nombre, liga:ligas(id, nombre))")
        .order("fecha", { ascending: false })
        .order("hora", { ascending: true })
        .limit(100),
      supabase.from("ligas").select("id, nombre").eq("activa", true).order("nombre"),
    ]);
    setPartidos(ps || []);
    setLigas(ls || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const filtrados = partidos.filter((p) => {
    if (ligaFiltro && p.grupo?.liga?.id !== ligaFiltro) return false;
    if (estadoFiltro && p.estado !== estadoFiltro) return false;
    return true;
  });

  if (editando) {
    return (
      <PartidoEditor
        partido={editando}
        supabase={supabase}
        onBack={() => { setEditando(null); load(); }}
      />
    );
  }

  if (loading) return <p className="text-gray-400 text-sm">Cargando...</p>;

  return (
    <div>
      {/* Filtros */}
      <div className="flex gap-2 mb-4">
        <select
          value={ligaFiltro}
          onChange={(e) => setLigaFiltro(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-xs bg-white focus:outline-none"
        >
          <option value="">Todas las competiciones</option>
          {ligas.map((l) => (
            <option key={l.id} value={l.id}>{l.nombre}</option>
          ))}
        </select>
        <select
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-xs bg-white focus:outline-none"
        >
          <option value="">Todos los estados</option>
          <option value="programado">Programado</option>
          <option value="en_vivo">En vivo</option>
          <option value="finalizado">Finalizado</option>
        </select>
      </div>

      <p className="text-xs text-gray-400 mb-3">{filtrados.length} partido(s)</p>

      <div className="space-y-2">
        {filtrados.map((p) => (
          <button
            key={p.id}
            onClick={() => setEditando(p)}
            className="w-full bg-gray-50 rounded-xl p-3 text-left hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-400">{p.fecha} {p.hora?.slice(0, 5)}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                p.estado === "en_vivo" ? "bg-red-100 text-red-600" :
                p.estado === "finalizado" ? "bg-gray-200 text-gray-500" :
                "bg-blue-50 text-blue-500"
              }`}>
                {p.estado === "en_vivo" ? "En vivo" : p.estado === "finalizado" ? "Final" : "Programado"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm flex-1 truncate">{p.local?.nombre}</span>
              <span className="font-bold text-sm tabular-nums shrink-0">
                {p.estado !== "programado" ? `${p.goles_local ?? 0} - ${p.goles_visitante ?? 0}` : "vs"}
              </span>
              <span className="font-semibold text-sm flex-1 text-right truncate">{p.visitante?.nombre}</span>
            </div>
            {p.grupo?.liga && (
              <p className="text-[10px] text-gray-400 mt-0.5">{p.grupo.liga.nombre}</p>
            )}
          </button>
        ))}
        {filtrados.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">No hay partidos</p>
        )}
      </div>
    </div>
  );
}

function PartidoEditor({ partido, supabase, onBack }) {
  const [estado, setEstado] = useState(partido.estado || "programado");
  const [golesLocal, setGolesLocal] = useState(partido.goles_local ?? 0);
  const [golesVisitante, setGolesVisitante] = useState(partido.goles_visitante ?? 0);
  const [eventos, setEventos] = useState([]);
  const [jugadoresLocal, setJugadoresLocal] = useState([]);
  const [jugadoresVisitante, setJugadoresVisitante] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [minuto, setMinuto] = useState(partido.minuto_actual || 0);
  const [timerActivo, setTimerActivo] = useState(false);
  const [showFormEvento, setShowFormEvento] = useState(false);
  const [formEvento, setFormEvento] = useState({ tipo: "gol", equipo_id: partido.local?.id || "", jugador_id: "", minuto: "" });

  useEffect(() => {
    async function loadData() {
      const [{ data: evs }, { data: jl }, { data: jv }] = await Promise.all([
        supabase
          .from("eventos_partido")
          .select("*, jugador:jugadores!eventos_partido_jugador_id_fkey(id, nombre, apellidos), equipo:clubs(id, nombre)")
          .eq("partido_id", partido.id)
          .order("minuto", { ascending: true }),
        supabase
          .from("jugador_club")
          .select("jugador:jugadores(id, nombre, apellidos)")
          .eq("club_id", partido.local?.id)
          .eq("activo", true),
        supabase
          .from("jugador_club")
          .select("jugador:jugadores(id, nombre, apellidos)")
          .eq("club_id", partido.visitante?.id)
          .eq("activo", true),
      ]);
      setEventos(evs || []);
      setJugadoresLocal((jl || []).map((j) => j.jugador).filter(Boolean));
      setJugadoresVisitante((jv || []).map((j) => j.jugador).filter(Boolean));
      setLoading(false);
    }
    loadData();
  }, [partido.id]);

  // Timer automático para partidos en vivo
  useEffect(() => {
    if (!timerActivo) return;
    const interval = setInterval(() => {
      setMinuto((m) => m + 1);
    }, 60000); // cada minuto real
    return () => clearInterval(interval);
  }, [timerActivo]);

  async function guardarEstado() {
    setGuardando(true);
    await supabase
      .from("partidos")
      .update({ estado, goles_local: golesLocal, goles_visitante: golesVisitante, minuto_actual: minuto })
      .eq("id", partido.id);
    setGuardando(false);
  }

  async function addEvento() {
    if (!formEvento.tipo || !formEvento.equipo_id) return;
    const { data } = await supabase
      .from("eventos_partido")
      .insert({
        partido_id: partido.id,
        tipo: formEvento.tipo,
        equipo_id: formEvento.equipo_id,
        jugador_id: formEvento.jugador_id || null,
        minuto: formEvento.minuto ? parseInt(formEvento.minuto) : null,
      })
      .select("*, jugador:jugadores!eventos_partido_jugador_id_fkey(id, nombre, apellidos), equipo:clubs(id, nombre)")
      .single();
    if (data) {
      setEventos((prev) => [...prev, data].sort((a, b) => (a.minuto || 0) - (b.minuto || 0)));
      // Si es gol, actualizar contador
      if (formEvento.tipo === "gol") {
        if (formEvento.equipo_id === partido.local?.id) setGolesLocal((g) => g + 1);
        else setGolesVisitante((g) => g + 1);
      }
    }
    setShowFormEvento(false);
    setFormEvento({ tipo: "gol", equipo_id: partido.local?.id || "", jugador_id: "", minuto: "" });
  }

  async function deleteEvento(eventoId, tipo, equipoId) {
    await supabase.from("eventos_partido").delete().eq("id", eventoId);
    setEventos((prev) => prev.filter((e) => e.id !== eventoId));
    if (tipo === "gol") {
      if (equipoId === partido.local?.id) setGolesLocal((g) => Math.max(0, g - 1));
      else setGolesVisitante((g) => Math.max(0, g - 1));
    }
  }

  const jugadoresEquipoSeleccionado =
    formEvento.equipo_id === partido.local?.id ? jugadoresLocal : jugadoresVisitante;

  const tipoLabel = { gol: "⚽ Gol", asistencia: "🅰️ Asistencia", tarjeta_amarilla: "🟨 Amarilla", tarjeta_roja: "🟥 Roja" };

  if (loading) return <p className="text-gray-400 text-sm">Cargando...</p>;

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 font-semibold mb-4 hover:text-gray-700">
        ← Volver
      </button>

      {/* Marcador */}
      <div className="bg-gray-50 rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            estado === "en_vivo" ? "bg-red-100 text-red-600" :
            estado === "finalizado" ? "bg-gray-200 text-gray-600" :
            "bg-blue-50 text-blue-500"
          }`}>
            {estado === "en_vivo" ? "En vivo" : estado === "finalizado" ? "Finalizado" : "Programado"}
          </span>
          {estado === "en_vivo" && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={minuto}
                onChange={(e) => setMinuto(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-14 border border-gray-200 rounded-lg px-2 py-1 text-xs text-center focus:outline-none"
                min="0"
                max="120"
              />
              <span className="text-xs text-gray-400">min</span>
              <button
                onClick={() => setTimerActivo(!timerActivo)}
                className={`text-xs font-bold px-2 py-1 rounded-lg ${timerActivo ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}
              >
                {timerActivo ? "⏸ Pausar" : "▶ Auto"}
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 text-center">
            <p className="text-xs text-gray-400 mb-1 truncate">{partido.local?.nombre}</p>
            <div className="flex items-center justify-center gap-1">
              <button onClick={() => setGolesLocal((g) => Math.max(0, g - 1))} className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 font-bold text-sm flex items-center justify-center">−</button>
              <span className="text-3xl font-extrabold w-10 text-center tabular-nums">{golesLocal}</span>
              <button onClick={() => setGolesLocal((g) => g + 1)} className="w-6 h-6 rounded-full bg-[#1DB954]/20 text-[#1DB954] font-bold text-sm flex items-center justify-center">+</button>
            </div>
          </div>
          <span className="text-gray-300 text-2xl font-light">—</span>
          <div className="flex-1 text-center">
            <p className="text-xs text-gray-400 mb-1 truncate">{partido.visitante?.nombre}</p>
            <div className="flex items-center justify-center gap-1">
              <button onClick={() => setGolesVisitante((g) => Math.max(0, g - 1))} className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 font-bold text-sm flex items-center justify-center">−</button>
              <span className="text-3xl font-extrabold w-10 text-center tabular-nums">{golesVisitante}</span>
              <button onClick={() => setGolesVisitante((g) => g + 1)} className="w-6 h-6 rounded-full bg-[#1DB954]/20 text-[#1DB954] font-bold text-sm flex items-center justify-center">+</button>
            </div>
          </div>
        </div>

        {/* Estado */}
        <div className="flex gap-2 mb-3">
          {["programado", "en_vivo", "finalizado"].map((s) => (
            <button
              key={s}
              onClick={() => {
                setEstado(s);
                if (s === "en_vivo" && minuto === 0) setMinuto(1);
                if (s !== "en_vivo") setTimerActivo(false);
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                estado === s
                  ? s === "en_vivo" ? "bg-red-500 text-white" : s === "finalizado" ? "bg-gray-600 text-white" : "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {s === "en_vivo" ? "En vivo" : s === "finalizado" ? "Final" : "Progr."}
            </button>
          ))}
        </div>

        <button
          onClick={guardarEstado}
          disabled={guardando}
          className="w-full py-2 rounded-xl text-sm font-semibold bg-[#1DB954] text-white disabled:opacity-50"
        >
          {guardando ? "Guardando..." : "Guardar marcador"}
        </button>
      </div>

      {/* Eventos */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-gray-700">Eventos ({eventos.length})</h3>
          <button
            onClick={() => setShowFormEvento(!showFormEvento)}
            className="text-xs font-bold text-[#1DB954]"
          >
            {showFormEvento ? "Cancelar" : "+ Añadir"}
          </button>
        </div>

        {showFormEvento && (
          <div className="bg-white border border-gray-200 rounded-xl p-3 mb-3 space-y-2">
            <Row>
              <Select
                label="Tipo"
                value={formEvento.tipo}
                onChange={(v) => setFormEvento({ ...formEvento, tipo: v })}
                options={[
                  { value: "gol", label: "⚽ Gol" },
                  { value: "asistencia", label: "🅰️ Asistencia" },
                  { value: "tarjeta_amarilla", label: "🟨 Amarilla" },
                  { value: "tarjeta_roja", label: "🟥 Roja" },
                ]}
              />
              <Input
                label="Minuto"
                type="number"
                value={formEvento.minuto}
                onChange={(v) => setFormEvento({ ...formEvento, minuto: v })}
                placeholder="ej: 23"
              />
            </Row>
            <Select
              label="Equipo"
              value={formEvento.equipo_id}
              onChange={(v) => setFormEvento({ ...formEvento, equipo_id: v, jugador_id: "" })}
              options={[
                { value: partido.local?.id || "", label: partido.local?.nombre || "Local" },
                { value: partido.visitante?.id || "", label: partido.visitante?.nombre || "Visitante" },
              ]}
            />
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Jugador (opcional)</label>
              <select
                value={formEvento.jugador_id}
                onChange={(e) => setFormEvento({ ...formEvento, jugador_id: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1DB954]/30 bg-white"
              >
                <option value="">Sin jugador</option>
                {jugadoresEquipoSeleccionado.map((j) => (
                  <option key={j.id} value={j.id}>{j.nombre} {j.apellidos}</option>
                ))}
              </select>
            </div>
            <button
              onClick={addEvento}
              className="w-full py-2 rounded-xl text-sm font-semibold bg-[#1DB954] text-white"
            >
              Añadir evento
            </button>
          </div>
        )}

        {eventos.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">Sin eventos registrados</p>
        ) : (
          <div className="space-y-1.5">
            {eventos.map((ev) => (
              <div key={ev.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                <span className="text-sm shrink-0">
                  {ev.tipo === "gol" ? "⚽" : ev.tipo === "asistencia" ? "🅰️" : ev.tipo === "tarjeta_amarilla" ? "🟨" : "🟥"}
                </span>
                <span className="text-xs text-gray-400 w-8 shrink-0">{ev.minuto ? `${ev.minuto}'` : "—"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">
                    {ev.jugador ? `${ev.jugador.nombre} ${ev.jugador.apellidos || ""}` : ev.equipo?.nombre || "—"}
                  </p>
                  {ev.jugador && <p className="text-[10px] text-gray-400 truncate">{ev.equipo?.nombre}</p>}
                </div>
                <button
                  onClick={() => deleteEvento(ev.id, ev.tipo, ev.equipo_id)}
                  className="text-red-400 text-xs font-bold shrink-0 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ===================== IMAGE UPLOAD ===================== */

function ImageUpload({ label, value, onChange, bucket, path, supabase }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");

    const ext = file.name.split(".").pop();
    const filePath = `${path}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { upsert: true });

    if (upErr) {
      setError("Error al subir: " + upErr.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    onChange(data.publicUrl);
    setUploading(false);
  }

  return (
    <div className="flex-1">
      {label && <label className="text-xs text-gray-500 mb-1 block">{label}</label>}
      <div className="flex items-center gap-2">
        {value ? (
          <img src={value} alt="" className="w-10 h-10 object-contain rounded border border-gray-200 bg-gray-50 shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded border border-dashed border-gray-300 bg-gray-50 shrink-0 flex items-center justify-center text-gray-300 text-lg">
            +
          </div>
        )}
        <label className={`flex-1 text-center py-2 rounded-lg text-xs font-semibold border border-gray-200 cursor-pointer transition-colors ${uploading ? "opacity-50" : "hover:border-[#1DB954] hover:text-[#1DB954]"}`}>
          {uploading ? "Subiendo..." : value ? "Cambiar imagen" : "Subir imagen"}
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
        {value && (
          <button onClick={() => onChange("")} className="text-red-400 text-xs font-semibold shrink-0">
            Quitar
          </button>
        )}
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
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

function sanitizePath(str) {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "archivo";
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
