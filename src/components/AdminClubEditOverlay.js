"use client";

import { useState, useEffect, useRef } from "react";
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

export default function AdminClubEditOverlay({ clubId, clubNombre }) {
  const router = useRouter();
  const supabase = createClient();

  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [partidos, setPartidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingEscudo, setUploadingEscudo] = useState(false);
  const [editingPartidoId, setEditingPartidoId] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [colorValue, setColorValue] = useState("#1DB954");
  const [savingColor, setSavingColor] = useState(false);

  const escudoInputRef = useRef(null);

  useEffect(() => {
    async function checkAdmin() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: perfil } = await supabase
        .from("perfiles")
        .select("rol")
        .eq("id", user.id)
        .single();
      if (perfil?.rol === "admin") setIsAdmin(true);
    }
    checkAdmin();
  }, []);

  async function loadPartidos() {
    setLoading(true);
    const { data } = await supabase
      .from("partidos")
      .select(
        "*, local:clubs!partidos_local_id_fkey(id, nombre, escudo_url, color_principal), visitante:clubs!partidos_visitante_id_fkey(id, nombre, escudo_url, color_principal)"
      )
      .or(`local_id.eq.${clubId},visitante_id.eq.${clubId}`)
      .order("fecha", { ascending: false })
      .limit(10);
    setPartidos(data || []);
    setLoading(false);
  }

  async function handleOpen() {
    setOpen(true);
    await loadPartidos();
  }

  async function handleEscudoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingEscudo(true);
    const ext = file.name.split(".").pop();
    const path = `clubes/${sanitizePath(clubNombre)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("escudos")
      .upload(path, file, { upsert: true });
    if (upErr) {
      alert("Error subiendo escudo: " + upErr.message);
      setUploadingEscudo(false);
      return;
    }
    const { data: urlData } = supabase.storage
      .from("escudos")
      .getPublicUrl(path);
    const publicUrl = urlData?.publicUrl;
    if (publicUrl) {
      const { error: dbErr } = await supabase
        .from("clubs")
        .update({ escudo_url: publicUrl })
        .eq("id", clubId);
      if (dbErr) alert("Error actualizando BD: " + dbErr.message);
      else {
        router.refresh();
        setOpen(false);
      }
    }
    setUploadingEscudo(false);
  }

  async function handleSaveColor() {
    setSavingColor(true);
    const { error } = await supabase
      .from("clubs")
      .update({ color_principal: colorValue })
      .eq("id", clubId);
    setSavingColor(false);
    if (error) alert("Error: " + error.message);
    else {
      router.refresh();
      setOpen(false);
    }
  }

  function startEditPartido(p) {
    setEditingPartidoId(p.id);
    setEditData({
      goles_local: p.goles_local ?? 0,
      goles_visitante: p.goles_visitante ?? 0,
      estado: p.estado || "programado",
    });
  }

  async function savePartido(partidoId) {
    setSaving(true);
    const { error } = await supabase
      .from("partidos")
      .update({
        goles_local: Number(editData.goles_local),
        goles_visitante: Number(editData.goles_visitante),
        estado: editData.estado,
      })
      .eq("id", partidoId);
    setSaving(false);
    if (error) {
      alert("Error al guardar: " + error.message);
    } else {
      setPartidos((prev) =>
        prev.map((p) =>
          p.id === partidoId
            ? {
                ...p,
                goles_local: Number(editData.goles_local),
                goles_visitante: Number(editData.goles_visitante),
                estado: editData.estado,
              }
            : p
        )
      );
      setEditingPartidoId(null);
      router.refresh();
    }
  }

  if (!isAdmin) return null;

  return (
    <>
      {/* Floating admin button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-20 left-4 z-50 px-3 py-2 rounded-full text-sm font-bold shadow-lg bg-gray-900 text-white"
      >
        ✏️ Admin
      </button>

      {/* Bottom sheet overlay */}
      {open && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />

          {/* Sheet */}
          <div className="relative bg-white rounded-t-2xl max-h-[80vh] overflow-y-auto pb-8">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            <div className="px-4 pb-2 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">
                Admin — {clubNombre}
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Escudo section */}
            <div className="px-4 py-3 border-t border-gray-100">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                Escudo
              </p>
              <button
                onClick={() => escudoInputRef.current?.click()}
                disabled={uploadingEscudo}
                className="w-full py-2 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                {uploadingEscudo ? "Subiendo..." : "📷 Subir nuevo escudo"}
              </button>
              <input
                ref={escudoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleEscudoUpload}
              />
            </div>

            {/* Color section */}
            <div className="px-4 py-3 border-t border-gray-100">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                Color del club
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={colorValue}
                  onChange={(e) => setColorValue(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200"
                />
                <span className="text-sm font-mono text-gray-600">{colorValue}</span>
                <button
                  onClick={handleSaveColor}
                  disabled={savingColor}
                  className="ml-auto px-3 py-1.5 bg-[#1DB954] text-white text-xs font-bold rounded-lg"
                >
                  {savingColor ? "..." : "Guardar color"}
                </button>
              </div>
            </div>

            {/* Partidos section */}
            <div className="px-4 py-3 border-t border-gray-100">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                Resultados recientes
              </p>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : partidos.length === 0 ? (
                <p className="text-sm text-gray-400">Sin partidos</p>
              ) : (
                <div className="space-y-2">
                  {partidos.map((p) => (
                    <div
                      key={p.id}
                      className="bg-gray-50 rounded-xl p-2.5"
                    >
                      {/* Partido summary row */}
                      <div className="flex items-center gap-2 text-xs">
                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">{p.local?.nombre}</span>
                            <span className="ml-auto font-bold tabular-nums">
                              {p.estado !== "programado" ? (p.goles_local ?? "") : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-500">{p.visitante?.nombre}</span>
                            <span className="ml-auto font-bold tabular-nums">
                              {p.estado !== "programado" ? (p.goles_visitante ?? "") : ""}
                            </span>
                          </div>
                        </div>
                        <div className="text-[10px] text-center text-gray-400 min-w-[44px]">
                          {p.estado === "en_vivo" ? (
                            <span className="text-red-500 font-bold">Vivo</span>
                          ) : p.estado === "finalizado" ? (
                            "Final"
                          ) : (
                            p.hora?.slice(0, 5)
                          )}
                        </div>
                      </div>

                      {/* Edit button */}
                      {editingPartidoId !== p.id && (
                        <button
                          onClick={() => startEditPartido(p)}
                          className="mt-1.5 text-[10px] font-bold text-[#1DB954] bg-[#1DB954]/10 px-2 py-0.5 rounded"
                        >
                          Editar resultado
                        </button>
                      )}

                      {/* Inline edit form */}
                      {editingPartidoId === p.id && (
                        <div className="mt-2 bg-white rounded-lg p-2 border border-gray-200 space-y-2">
                          <div className="flex gap-2 items-center">
                            <label className="text-[10px] text-gray-400 w-14">Local</label>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() =>
                                  setEditData((prev) => ({
                                    ...prev,
                                    goles_local: Math.max(0, Number(prev.goles_local) - 1),
                                  }))
                                }
                                className="w-5 h-5 rounded bg-gray-100 text-xs font-bold"
                              >
                                -
                              </button>
                              <span className="w-6 text-center text-xs font-bold tabular-nums">
                                {editData.goles_local}
                              </span>
                              <button
                                onClick={() =>
                                  setEditData((prev) => ({
                                    ...prev,
                                    goles_local: Number(prev.goles_local) + 1,
                                  }))
                                }
                                className="w-5 h-5 rounded bg-gray-100 text-xs font-bold"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <div className="flex gap-2 items-center">
                            <label className="text-[10px] text-gray-400 w-14">Visitante</label>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() =>
                                  setEditData((prev) => ({
                                    ...prev,
                                    goles_visitante: Math.max(0, Number(prev.goles_visitante) - 1),
                                  }))
                                }
                                className="w-5 h-5 rounded bg-gray-100 text-xs font-bold"
                              >
                                -
                              </button>
                              <span className="w-6 text-center text-xs font-bold tabular-nums">
                                {editData.goles_visitante}
                              </span>
                              <button
                                onClick={() =>
                                  setEditData((prev) => ({
                                    ...prev,
                                    goles_visitante: Number(prev.goles_visitante) + 1,
                                  }))
                                }
                                className="w-5 h-5 rounded bg-gray-100 text-xs font-bold"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <div className="flex gap-2 items-center">
                            <label className="text-[10px] text-gray-400 w-14">Estado</label>
                            <select
                              value={editData.estado}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  estado: e.target.value,
                                }))
                              }
                              className="flex-1 text-xs border border-gray-200 rounded px-1 py-0.5"
                            >
                              <option value="programado">Programado</option>
                              <option value="en_vivo">En vivo</option>
                              <option value="finalizado">Finalizado</option>
                            </select>
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => savePartido(p.id)}
                              disabled={saving}
                              className="flex-1 text-[10px] font-bold bg-[#1DB954] text-white rounded py-1"
                            >
                              {saving ? "..." : "Guardar"}
                            </button>
                            <button
                              onClick={() => setEditingPartidoId(null)}
                              className="flex-1 text-[10px] font-bold bg-gray-100 text-gray-600 rounded py-1"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
