"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

export default function SolicitarColaboradorButton({ clubId, clubNombre }) {
  const [estado, setEstado] = useState("none"); // none | pending | approved | modal
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data } = await supabase
          .from("colaboradores")
          .select("aprobado")
          .eq("usuario_id", user.id)
          .eq("club_id", clubId)
          .single();
        if (data) {
          setEstado(data.aprobado ? "approved" : "pending");
        }
      }
      setLoading(false);
    }
    check();
  }, [clubId]);

  async function handleSolicitar() {
    if (!user) {
      router.push("/login?redirect=/clubes/" + clubId);
      return;
    }
    setEstado("modal");
  }

  async function confirmarSolicitud() {
    setLoading(true);
    await supabase
      .from("colaboradores")
      .insert({ usuario_id: user.id, club_id: clubId });
    setEstado("pending");
    setLoading(false);
  }

  if (loading) return null;

  if (estado === "approved") {
    return (
      <span className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#1DB954]/20 text-[#1DB954]">
        ✓ Colaborador
      </span>
    );
  }

  if (estado === "pending") {
    return (
      <span className="px-4 py-2 rounded-lg text-xs font-semibold bg-yellow-100 text-yellow-700">
        Solicitud pendiente
      </span>
    );
  }

  if (estado === "modal") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
          <h3 className="text-lg font-bold mb-2">Colaborar con {clubNombre}</h3>
          <p className="text-sm text-gray-500 mb-4">
            Como colaborador podrás:
          </p>
          <ul className="text-sm text-gray-600 space-y-1.5 mb-6">
            <li className="flex items-center gap-2">
              <span className="text-[#1DB954]">✓</span> Gestionar la plantilla
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#1DB954]">✓</span> Introducir resultados en directo
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#1DB954]">✓</span> Registrar goles y tarjetas
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#1DB954]">✓</span> Registrar cambios y alineaciones
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#1DB954]">✓</span> Gestionar cuerpo técnico
            </li>
          </ul>
          <div className="flex gap-2">
            <button
              onClick={() => setEstado("none")}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={confirmarSolicitud}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#1DB954] text-white hover:bg-[#17a34a] disabled:opacity-50"
            >
              {loading ? "Enviando..." : "Solicitar"}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-3">
            Un administrador revisará tu solicitud
          </p>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleSolicitar}
      className="px-4 py-2 rounded-lg text-xs font-semibold border border-white/30 text-white hover:bg-white/10 transition-colors"
    >
      Colaborar
    </button>
  );
}
