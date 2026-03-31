"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegistroPage() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleRegistro(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <div className="max-w-sm mx-auto px-4 py-12 text-center">
        <span className="text-5xl">📧</span>
        <h1 className="text-xl font-bold mt-4 mb-2">Revisa tu email</h1>
        <p className="text-sm text-gray-500 mb-6">
          Te hemos enviado un enlace de confirmación a <strong>{email}</strong>.
          Haz clic en él para activar tu cuenta.
        </p>
        <Link
          href="/login"
          className="text-sm font-semibold text-[#1DB954] hover:underline"
        >
          Ir al login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <span className="text-4xl">⚽</span>
        <h1 className="text-xl font-extrabold mt-2">
          <span className="text-[#1DB954]">Fútbol</span>Aficionado
        </h1>
        <p className="text-sm text-gray-500 mt-1">Crea tu cuenta gratis</p>
      </div>

      <form onSubmit={handleRegistro} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Nombre
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1DB954]/30 focus:border-[#1DB954]"
            placeholder="Tu nombre"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1DB954]/30 focus:border-[#1DB954]"
            placeholder="tu@email.com"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1DB954]/30 focus:border-[#1DB954]"
            placeholder="Mínimo 6 caracteres"
          />
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#1DB954] hover:bg-[#17a34a] text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
        >
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-[#1DB954] font-semibold hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
