"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

const PROVIDER_LABEL = {
  google: "Google",
  facebook: "Facebook",
  email: "Email",
};

const PROVIDER_ICON = {
  google: (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  ),
  facebook: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
};

export default function PerfilPage() {
  const [perfil, setPerfil] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [clubFavorito, setClubFavorito] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [guardandoNombre, setGuardandoNombre] = useState(false);
  const fileInputRef = useRef(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function loadPerfil() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setAuthUser(user);

      const { data } = await supabase
        .from("perfiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setPerfil(data);
      setNuevoNombre(data?.nombre || "");

      if (data?.club_favorito_id) {
        const { data: club } = await supabase
          .from("clubs")
          .select("id, nombre")
          .eq("id", data.club_favorito_id)
          .single();
        setClubFavorito(club);
      }

      setLoading(false);
    }
    loadPerfil();
  }, []);

  // Avatar: primero foto subida manualmente, luego la del proveedor OAuth
  const avatarUrl =
    perfil?.avatar_url ||
    authUser?.user_metadata?.avatar_url ||
    authUser?.user_metadata?.picture ||
    null;

  const provider = authUser?.app_metadata?.provider || "email";

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !authUser) return;

    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${authUser.id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatares")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatares").getPublicUrl(filePath);
      const newAvatarUrl = `${data.publicUrl}?t=${Date.now()}`;

      await supabase
        .from("perfiles")
        .update({ avatar_url: newAvatarUrl })
        .eq("id", authUser.id);

      setPerfil((prev) => ({ ...prev, avatar_url: newAvatarUrl }));
    } catch (err) {
      console.error("Error subiendo avatar:", err);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleQuitarAvatar() {
    if (!authUser) return;
    await supabase
      .from("perfiles")
      .update({ avatar_url: null })
      .eq("id", authUser.id);
    setPerfil((prev) => ({ ...prev, avatar_url: null }));
  }

  async function handleGuardarNombre() {
    if (!nuevoNombre.trim() || !authUser) return;
    setGuardandoNombre(true);
    await supabase
      .from("perfiles")
      .update({ nombre: nuevoNombre.trim() })
      .eq("id", authUser.id);
    setPerfil((prev) => ({ ...prev, nombre: nuevoNombre.trim() }));
    setEditandoNombre(false);
    setGuardandoNombre(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="max-w-sm mx-auto px-4 py-12 text-center text-gray-400 text-sm">
        Cargando...
      </div>
    );
  }

  if (!perfil) return null;

  const rolLabel = {
    visitante: "Aficionado",
    colaborador: "Colaborador",
    admin: "Administrador",
  };

  return (
    <div className="max-w-sm mx-auto px-4 py-8 pb-24">
      {/* Avatar */}
      <div className="text-center mb-8">
        <div className="relative inline-block mb-3">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={perfil.nombre}
              className="w-20 h-20 rounded-full object-cover border-2 border-gray-100 shadow-sm"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-[#1DB954] text-white flex items-center justify-center text-3xl font-bold">
              {perfil.nombre?.[0]?.toUpperCase() || "?"}
            </div>
          )}

          {/* Botón cambiar foto */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Cambiar foto"
          >
            {uploadingAvatar ? (
              <span className="text-[10px] animate-spin">⟳</span>
            ) : (
              <span className="text-xs">📷</span>
            )}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarUpload}
        />

        {/* Solo mostrar "Quitar foto" si tiene foto subida manualmente */}
        {perfil.avatar_url && (
          <button
            onClick={handleQuitarAvatar}
            className="text-xs text-gray-400 hover:text-red-400 transition-colors block mx-auto mb-2"
          >
            Quitar foto personalizada
          </button>
        )}

        <h1 className="text-xl font-bold">{perfil.nombre}</h1>
        <p className="text-sm text-gray-500">{perfil.email}</p>

        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            {rolLabel[perfil.rol] || perfil.rol}
          </span>
          {/* Proveedor de login */}
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-gray-50 border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
            {PROVIDER_ICON[provider] || null}
            {PROVIDER_LABEL[provider] || provider}
          </span>
        </div>
      </div>

      {/* Datos */}
      <div className="space-y-3">
        {/* Nombre editable */}
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold text-gray-700">Nombre</h2>
            {!editandoNombre && (
              <button
                onClick={() => setEditandoNombre(true)}
                className="text-xs text-[#1DB954] font-semibold"
              >
                Editar
              </button>
            )}
          </div>
          {editandoNombre ? (
            <div className="flex gap-2 mt-1">
              <input
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1DB954]/40"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleGuardarNombre()}
              />
              <button
                onClick={handleGuardarNombre}
                disabled={guardandoNombre}
                className="text-xs font-semibold text-white bg-[#1DB954] px-3 py-1.5 rounded-lg disabled:opacity-50"
              >
                {guardandoNombre ? "..." : "Guardar"}
              </button>
              <button
                onClick={() => {
                  setEditandoNombre(false);
                  setNuevoNombre(perfil.nombre);
                }}
                className="text-xs font-semibold text-gray-500 px-2"
              >
                ✕
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500">{perfil.nombre}</p>
          )}
        </div>

        <div className="bg-gray-50 rounded-xl p-4">
          <h2 className="text-sm font-bold text-gray-700 mb-1">Email</h2>
          <p className="text-sm text-gray-500">{perfil.email}</p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4">
          <h2 className="text-sm font-bold text-gray-700 mb-1">Rol</h2>
          <p className="text-sm text-gray-500">
            {rolLabel[perfil.rol] || perfil.rol}
          </p>
        </div>
      </div>

      {/* Sección colaborador */}
      {(perfil.rol === "visitante" || !perfil.rol) && perfil.rol !== "admin" && perfil.rol !== "colaborador" && (
        <ColaboradorSection
          userId={authUser?.id}
          clubId={perfil.club_favorito_id}
          clubNombre={clubFavorito?.nombre}
          supabase={supabase}
        />
      )}
      {perfil.rol === "colaborador" && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-sm font-bold text-green-700">✓ Eres colaborador</p>
          <p className="text-xs text-green-600 mt-1">
            Puedes gestionar partidos y plantillas desde el panel de colaborador
          </p>
        </div>
      )}

      <button
        onClick={handleLogout}
        className="w-full mt-8 py-2.5 rounded-xl text-sm font-semibold text-red-500 border border-red-200 hover:bg-red-50 transition-colors"
      >
        Cerrar sesión
      </button>
    </div>
  );
}

/* ---- Sección de solicitud de colaborador ---- */
function ColaboradorSection({ userId, clubId, clubNombre, supabase }) {
  const [estado, setEstado] = useState(null); // null | "none" | "pending" | "approved" | "modal"
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!userId || !clubId) {
      setEstado("none");
      return;
    }
    supabase
      .from("colaboradores")
      .select("aprobado")
      .eq("usuario_id", userId)
      .eq("club_id", clubId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) setEstado("none");
        else setEstado(data.aprobado ? "approved" : "pending");
      });
  }, [userId, clubId]);

  async function confirmar() {
    setEnviando(true);
    await supabase
      .from("colaboradores")
      .insert({ usuario_id: userId, club_id: clubId });
    setEstado("pending");
    setEnviando(false);
  }

  if (estado === null) return null;

  return (
    <div className="mt-4 bg-gray-50 rounded-xl p-4">
      <h2 className="text-sm font-bold text-gray-700 mb-3">¿Quieres colaborar?</h2>

      {!clubId && (
        <p className="text-xs text-gray-400">
          Selecciona un equipo favorito primero para poder solicitar ser colaborador de ese club.
        </p>
      )}

      {clubId && estado === "none" && (
        <>
          <p className="text-xs text-gray-500 mb-3">
            Colabora con <span className="font-semibold">{clubNombre}</span> introduciendo resultados, alineaciones, goles y más.
          </p>
          <button
            onClick={() => setEstado("modal")}
            className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[#1DB954] text-white hover:bg-[#17a34a] transition-colors"
          >
            Solicitar ser colaborador
          </button>
        </>
      )}

      {estado === "pending" && (
        <div className="flex items-center gap-2 text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
          <span className="text-base">⏳</span>
          <p className="text-xs font-semibold">Solicitud enviada — pendiente de aprobación</p>
        </div>
      )}

      {estado === "approved" && (
        <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <span className="text-base">✓</span>
          <p className="text-xs font-semibold">Solicitud aprobada para {clubNombre}</p>
        </div>
      )}

      {estado === "modal" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-1">Colaborar con {clubNombre}</h3>
            <p className="text-sm text-gray-500 mb-4">Como colaborador podrás:</p>
            <ul className="text-sm text-gray-600 space-y-1.5 mb-6">
              {["Introducir resultados en directo", "Registrar goles y tarjetas", "Gestionar alineaciones y cambios", "Actualizar la plantilla"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-[#1DB954] font-bold">✓</span> {item}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <button
                onClick={() => setEstado("none")}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={confirmar}
                disabled={enviando}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#1DB954] text-white disabled:opacity-50"
              >
                {enviando ? "Enviando..." : "Solicitar"}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-3">
              Un administrador revisará tu solicitud
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
