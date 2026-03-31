"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import Link from "next/link";

export default function AdminPage() {
  const [tab, setTab] = useState("colaboradores");
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
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

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center text-gray-400 text-sm">
        Cargando...
      </div>
    );
  }

  if (!perfil || perfil.rol !== "admin") {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <span className="text-4xl">🔒</span>
        <h1 className="text-lg font-bold mt-4">Acceso restringido</h1>
        <p className="text-sm text-gray-500 mt-2">
          Solo los administradores pueden acceder a este panel.
        </p>
      </div>
    );
  }

  const tabs = [
    { id: "colaboradores", label: "Colaboradores" },
    { id: "clubs", label: "Clubs" },
    { id: "jugadores", label: "Jugadores" },
    { id: "usuarios", label: "Usuarios" },
  ];

  return (
    <div className="max-w-lg mx-auto">
      <header className="px-4 py-4 border-b border-gray-100">
        <p className="text-xs text-red-500 font-semibold">Administración</p>
        <h1 className="text-xl font-bold">Panel de Admin</h1>
      </header>

      {/* Tabs */}
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
        {tab === "colaboradores" && <ColaboradoresTab supabase={supabase} />}
        {tab === "clubs" && <ClubsTab supabase={supabase} />}
        {tab === "jugadores" && <JugadoresTab supabase={supabase} />}
        {tab === "usuarios" && <UsuariosTab supabase={supabase} />}
      </div>
    </div>
  );
}

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
    await supabase
      .from("colaboradores")
      .update({ aprobado: aprobar })
      .eq("id", id);

    if (aprobar) {
      const sol = solicitudes.find((s) => s.id === id);
      if (sol) {
        await supabase
          .from("perfiles")
          .update({ rol: "colaborador" })
          .eq("id", sol.usuario_id);
      }
    }

    loadSolicitudes();
  }

  if (loading) return <p className="text-gray-400 text-sm">Cargando...</p>;

  return (
    <div className="space-y-2">
      {solicitudes.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-4">
          No hay solicitudes
        </p>
      )}
      {solicitudes.map((s) => (
        <div
          key={s.id}
          className="bg-gray-50 rounded-xl p-3 flex items-center gap-3"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">
              {s.usuario?.nombre}
            </p>
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

function ClubsTab({ supabase }) {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({
    nombre: "",
    municipio: "",
    provincia: "",
    color_principal: "#1DB954",
  });

  useEffect(() => {
    loadClubs();
  }, []);

  async function loadClubs() {
    const { data } = await supabase
      .from("clubs")
      .select("*")
      .order("nombre");
    setClubs(data || []);
    setLoading(false);
  }

  async function handleGuardar() {
    if (editando === "nuevo") {
      await supabase.from("clubs").insert(form);
    } else {
      await supabase.from("clubs").update(form).eq("id", editando);
    }
    setEditando(null);
    setForm({ nombre: "", municipio: "", provincia: "", color_principal: "#1DB954" });
    loadClubs();
  }

  if (loading) return <p className="text-gray-400 text-sm">Cargando...</p>;

  return (
    <div>
      <button
        onClick={() => {
          setEditando("nuevo");
          setForm({ nombre: "", municipio: "", provincia: "", color_principal: "#1DB954" });
        }}
        className="w-full mb-3 py-2 rounded-xl text-sm font-semibold border-2 border-dashed border-gray-200 text-gray-400 hover:border-[#1DB954] hover:text-[#1DB954] transition-colors"
      >
        + Añadir club
      </button>

      {editando && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-3 space-y-3">
          <input
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Nombre del club"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1DB954]/30"
          />
          <div className="flex gap-2">
            <input
              value={form.municipio}
              onChange={(e) => setForm({ ...form, municipio: e.target.value })}
              placeholder="Municipio"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1DB954]/30"
            />
            <input
              value={form.provincia}
              onChange={(e) => setForm({ ...form, provincia: e.target.value })}
              placeholder="Provincia"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1DB954]/30"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Color:</label>
            <input
              type="color"
              value={form.color_principal}
              onChange={(e) =>
                setForm({ ...form, color_principal: e.target.value })
              }
              className="w-8 h-8 rounded border-0 cursor-pointer"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setEditando(null)}
              className="flex-1 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-600"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              disabled={!form.nombre}
              className="flex-1 py-2 rounded-lg text-sm font-semibold bg-[#1DB954] text-white disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {clubs.map((club) => (
          <div
            key={club.id}
            className="flex items-center gap-3 bg-gray-50 rounded-xl p-3"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: club.color_principal || "#888" }}
            >
              {club.nombre?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{club.nombre}</p>
              <p className="text-xs text-gray-400">
                {club.municipio}, {club.provincia}
              </p>
            </div>
            <button
              onClick={() => {
                setEditando(club.id);
                setForm({
                  nombre: club.nombre,
                  municipio: club.municipio || "",
                  provincia: club.provincia || "",
                  color_principal: club.color_principal || "#1DB954",
                });
              }}
              className="text-xs text-[#1DB954] font-semibold"
            >
              Editar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function JugadoresTab({ supabase }) {
  const [jugadores, setJugadores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("jugadores")
        .select("*")
        .order("nombre");
      setJugadores(data || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <p className="text-gray-400 text-sm">Cargando...</p>;

  return (
    <div className="space-y-1.5">
      {jugadores.map((j) => (
        <div
          key={j.id}
          className="flex items-center gap-3 bg-gray-50 rounded-xl p-3"
        >
          <div className="w-8 h-8 rounded-full bg-[#1DB954]/10 text-[#1DB954] flex items-center justify-center text-xs font-bold">
            {j.nombre?.[0]}
            {j.apellidos?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">
              {j.nombre} {j.apellidos}
            </p>
            <p className="text-xs text-gray-400">{j.posicion}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function UsuariosTab({ supabase }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("perfiles")
        .select("*")
        .order("created_at", { ascending: false });
      setUsuarios(data || []);
      setLoading(false);
    }
    load();
  }, []);

  async function cambiarRol(id, nuevoRol) {
    await supabase.from("perfiles").update({ rol: nuevoRol }).eq("id", id);
    setUsuarios((prev) =>
      prev.map((u) => (u.id === id ? { ...u, rol: nuevoRol } : u))
    );
  }

  if (loading) return <p className="text-gray-400 text-sm">Cargando...</p>;

  const rolColor = {
    visitante: "bg-gray-100 text-gray-500",
    colaborador: "bg-blue-50 text-blue-600",
    admin: "bg-red-50 text-red-500",
  };

  return (
    <div className="space-y-1.5">
      {usuarios.map((u) => (
        <div
          key={u.id}
          className="flex items-center gap-3 bg-gray-50 rounded-xl p-3"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{u.nombre}</p>
            <p className="text-xs text-gray-400 truncate">{u.email}</p>
          </div>
          <select
            value={u.rol}
            onChange={(e) => cambiarRol(u.id, e.target.value)}
            className={`text-[10px] font-bold px-2 py-1 rounded-full border-0 cursor-pointer ${rolColor[u.rol] || ""}`}
          >
            <option value="visitante">Visitante</option>
            <option value="colaborador">Colaborador</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      ))}
    </div>
  );
}
