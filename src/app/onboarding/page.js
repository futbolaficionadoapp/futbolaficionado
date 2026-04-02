"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

const STEPS = ["bienvenida", "equipo", "registro", "colaborar"];

export default function OnboardingPage() {
  const [step, setStep] = useState("bienvenida");
  const [clubSeleccionado, setClubSeleccionado] = useState(null);
  const [user, setUser] = useState(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  async function finalizarOnboarding() {
    if (user && clubSeleccionado) {
      await supabase
        .from("perfiles")
        .update({ club_favorito_id: clubSeleccionado.id, onboarding_done: true })
        .eq("id", user.id);
    } else if (user) {
      await supabase
        .from("perfiles")
        .update({ onboarding_done: true })
        .eq("id", user.id);
    }
    // Guardar equipo en localStorage para usuarios sin cuenta
    if (clubSeleccionado) {
      localStorage.setItem("club_favorito", JSON.stringify(clubSeleccionado));
    }
    localStorage.setItem("onboarding_done", "1");
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto">
      {step === "bienvenida" && (
        <StepBienvenida
          onElegirEquipo={() => setStep("equipo")}
          onSinEquipo={finalizarOnboarding}
        />
      )}
      {step === "equipo" && (
        <StepEquipo
          clubSeleccionado={clubSeleccionado}
          onSeleccionar={(club) => {
            setClubSeleccionado(club);
            setStep(user ? "colaborar" : "registro");
          }}
          onVolver={() => setStep("bienvenida")}
          supabase={supabase}
        />
      )}
      {step === "registro" && (
        <StepRegistro
          clubSeleccionado={clubSeleccionado}
          onRegistrado={(u) => {
            setUser(u);
            setStep("colaborar");
          }}
          onSinCuenta={finalizarOnboarding}
          onVolver={() => setStep("equipo")}
          supabase={supabase}
        />
      )}
      {step === "colaborar" && (
        <StepColarborar
          clubSeleccionado={clubSeleccionado}
          user={user}
          onFinalizar={finalizarOnboarding}
          onColarborar={async () => {
            if (user && clubSeleccionado) {
              await supabase.from("colaboradores").upsert({
                usuario_id: user.id,
                club_id: clubSeleccionado.id,
                aprobado: false,
              });
            }
            finalizarOnboarding();
          }}
          supabase={supabase}
        />
      )}
    </div>
  );
}

/* ======= PASO 1: BIENVENIDA ======= */

function StepBienvenida({ onElegirEquipo, onSinEquipo }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-8 py-16 text-center">
      {/* Logo */}
      <div className="w-20 h-20 rounded-2xl bg-[#1DB954] flex items-center justify-center mb-6 shadow-lg shadow-[#1DB954]/30">
        <span className="text-4xl">⚽</span>
      </div>

      <h1 className="text-3xl font-black text-gray-900 mb-2">FútbolAficionado</h1>
      <p className="text-gray-500 text-base mb-12 leading-relaxed">
        Sigue tu equipo amateur<br />en tiempo real
      </p>

      <div className="w-full space-y-3">
        <button
          onClick={onElegirEquipo}
          className="w-full py-4 rounded-2xl bg-[#1DB954] text-white text-base font-bold shadow-lg shadow-[#1DB954]/30 active:scale-95 transition-transform"
        >
          Elegir mi equipo
        </button>
        <button
          onClick={onSinEquipo}
          className="w-full py-4 rounded-2xl border-2 border-gray-200 text-gray-500 text-base font-semibold active:scale-95 transition-transform"
        >
          Entrar sin elegir
        </button>
      </div>

      <p className="text-xs text-gray-400 mt-8">
        Andalucía · Temporada 2025/26
      </p>
    </div>
  );
}

/* ======= PASO 2: SELECCIÓN DE EQUIPO ======= */

function StepEquipo({ onSeleccionar, onVolver, supabase }) {
  const [clubs, setClubs] = useState([]);
  const [ligas, setLigas] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [ligaFiltro, setLigaFiltro] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: c }, { data: l }] = await Promise.all([
        supabase.from("clubs").select("*, club_liga(grupo:grupos(liga:ligas(nombre)))").order("nombre"),
        supabase.from("ligas").select("id, nombre").eq("activa", true).order("nombre"),
      ]);
      setClubs(c || []);
      setLigas(l || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtrados = clubs.filter((c) => {
    const matchNombre = c.nombre.toLowerCase().includes(busqueda.toLowerCase());
    if (!ligaFiltro) return matchNombre;
    const ligaNombre = c.club_liga?.[0]?.grupo?.liga?.nombre;
    return matchNombre && ligaNombre === ligaFiltro;
  });

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <button onClick={onVolver} className="text-[#1DB954] text-sm font-semibold mb-4 block">
          ← Volver
        </button>
        <h2 className="text-2xl font-black text-gray-900">¿Cuál es tu equipo?</h2>
        <p className="text-gray-400 text-sm mt-1">Busca tu club para personalizarlo todo</p>
      </div>

      {/* Buscador */}
      <div className="px-4 pb-3">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar equipo..."
          autoFocus
          className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1DB954]/40"
        />
      </div>

      {/* Filtro por liga */}
      {ligas.length > 0 && (
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setLigaFiltro("")}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              !ligaFiltro ? "bg-[#1DB954] text-white" : "bg-gray-100 text-gray-500"
            }`}
          >
            Todos
          </button>
          {ligas.map((l) => (
            <button
              key={l.id}
              onClick={() => setLigaFiltro(l.nombre)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                ligaFiltro === l.nombre ? "bg-[#1DB954] text-white" : "bg-gray-100 text-gray-500"
              }`}
            >
              {l.nombre}
            </button>
          ))}
        </div>
      )}

      {/* Lista de equipos */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {loading ? (
          <p className="text-gray-400 text-sm text-center py-8">Cargando equipos...</p>
        ) : (
          <div className="space-y-2">
            {filtrados.map((club) => (
              <button
                key={club.id}
                onClick={() => onSeleccionar(club)}
                className="w-full flex items-center gap-3 bg-gray-50 rounded-2xl p-3 active:scale-98 transition-transform text-left"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black text-white shrink-0"
                  style={{ backgroundColor: club.color_principal || "#1DB954" }}
                >
                  {club.escudo_url ? (
                    <img src={club.escudo_url} alt="" className="w-10 h-10 object-contain" />
                  ) : (
                    club.nombre[0]
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{club.nombre}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {club.club_liga?.[0]?.grupo?.liga?.nombre || club.municipio || ""}
                  </p>
                </div>
                <span className="text-[#1DB954] text-lg">›</span>
              </button>
            ))}
            {filtrados.length === 0 && !loading && (
              <p className="text-gray-400 text-sm text-center py-8">No se encontraron equipos</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ======= PASO 3: REGISTRO ======= */

function StepRegistro({ clubSeleccionado, onRegistrado, onSinCuenta, onVolver, supabase }) {
  const [modo, setModo] = useState("elegir"); // elegir | email
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null);
  const [error, setError] = useState("");

  async function handleOAuth(provider) {
    setOauthLoading(provider);
    if (clubSeleccionado) {
      localStorage.setItem("club_favorito", JSON.stringify(clubSeleccionado));
    }
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  async function handleRegistro() {
    setLoading(true);
    setError("");
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre } },
    });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    onRegistrado(data.user);
  }

  async function handleLogin() {
    setLoading(true);
    setError("");
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    onRegistrado(data.user);
  }

  return (
    <div className="flex flex-col px-6 pt-12 pb-8 h-screen">
      <button onClick={onVolver} className="text-[#1DB954] text-sm font-semibold mb-6 text-left">
        ← Volver
      </button>

      <div className="flex-1">
        {clubSeleccionado && (
          <div className="flex items-center gap-3 mb-6 p-4 bg-gray-50 rounded-2xl">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black"
              style={{ backgroundColor: clubSeleccionado.color_principal || "#1DB954" }}
            >
              {clubSeleccionado.nombre[0]}
            </div>
            <div>
              <p className="text-xs text-gray-400">Tu equipo</p>
              <p className="text-sm font-bold">{clubSeleccionado.nombre}</p>
            </div>
          </div>
        )}

        <h2 className="text-2xl font-black text-gray-900 mb-2">Crea tu cuenta</h2>
        <p className="text-gray-400 text-sm mb-6">
          Para guardar tu equipo y recibir notificaciones
        </p>

        {modo === "elegir" && (
          <div className="space-y-3">
            <button
              onClick={() => handleOAuth("google")}
              disabled={!!oauthLoading}
              className="w-full py-3.5 rounded-2xl border-2 border-gray-200 text-sm font-semibold text-gray-700 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {oauthLoading === "google" ? "Conectando..." : "Continuar con Google"}
            </button>

            <button
              onClick={() => handleOAuth("facebook")}
              disabled={!!oauthLoading}
              className="w-full py-3.5 rounded-2xl border-2 border-gray-200 text-sm font-semibold text-gray-700 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              {oauthLoading === "facebook" ? "Conectando..." : "Continuar con Facebook"}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">o con email</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <button
              onClick={() => setModo("email")}
              className="w-full py-3.5 rounded-2xl border-2 border-gray-200 text-sm font-semibold text-gray-600 flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              ✉️ Continuar con email
            </button>
          </div>
        )}

        {modo === "email" && (
          <div className="space-y-3">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre"
              className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1DB954]/40"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              type="email"
              className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1DB954]/40"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              type="password"
              className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1DB954]/40"
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button
              onClick={handleRegistro}
              disabled={loading || !email || !password}
              className="w-full py-4 rounded-2xl bg-[#1DB954] text-white font-bold disabled:opacity-50 active:scale-95 transition-transform"
            >
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </button>
            <button
              onClick={handleLogin}
              disabled={loading || !email || !password}
              className="w-full py-2 text-sm text-gray-500 font-semibold"
            >
              Ya tengo cuenta — Iniciar sesión
            </button>
            <button onClick={() => setModo("elegir")} className="w-full py-2 text-xs text-gray-400">
              ← Volver a opciones
            </button>
          </div>
        )}
      </div>

      <button onClick={onSinCuenta} className="text-center text-sm text-gray-400 font-medium py-4">
        Continuar sin cuenta
      </button>
    </div>
  );
}

/* ======= PASO 4: COLABORAR ======= */

function StepColarborar({ clubSeleccionado, user, onFinalizar, onColarborar }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-8 py-16 text-center h-screen">
      <div className="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center mb-6">
        <span className="text-4xl">📋</span>
      </div>

      <h2 className="text-2xl font-black text-gray-900 mb-3">
        ¿Quieres ayudar<br />a tu equipo?
      </h2>
      <p className="text-gray-400 text-sm mb-10 leading-relaxed">
        Como colaborador puedes subir resultados, goleadores, alineaciones y más.
        Un administrador validará tu solicitud.
      </p>

      <div className="w-full space-y-3">
        {user && clubSeleccionado && (
          <button
            onClick={onColarborar}
            className="w-full py-4 rounded-2xl bg-blue-500 text-white text-base font-bold active:scale-95 transition-transform"
          >
            Quiero colaborar
          </button>
        )}
        <button
          onClick={onFinalizar}
          className="w-full py-4 rounded-2xl border-2 border-gray-200 text-gray-500 text-base font-semibold active:scale-95 transition-transform"
        >
          Ahora no
        </button>
      </div>
    </div>
  );
}
