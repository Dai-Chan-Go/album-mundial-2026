"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import TeamProgress from "./components/TeamProgress";

type Sticker = {
  id: number;
  number: string;
  name: string | null;
  team: string | null;
  section: string | null;
  type: string | null;
  sort_order: number | null;
  owned: boolean;
  duplicates: number;
};

type PackResult = {
  newStickers: Sticker[];
  repeatedStickers: Sticker[];
  notFoundNumbers: string[];
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "all" | "owned" | "missing" | "duplicates"
  >("all");

  const [selectedTeam, setSelectedTeam] = useState("all");

  const [packMode, setPackMode] = useState(false);
  const [packInput, setPackInput] = useState("");
  const [packResult, setPackResult] = useState<PackResult | null>(null);

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();

      setUser(data.session?.user ?? null);
      setCheckingSession(false);
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    loadStickers();

    const channel = supabase
      .channel("stickers-realtime")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "stickers",
        },
        (payload) => {
          const updatedSticker = payload.new as Sticker;

          setStickers((current) =>
            current.map((sticker) =>
              sticker.id === updatedSticker.id ? updatedSticker : sticker
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  async function loadStickers() {
    setLoading(true);

    const { data, error } = await supabase
      .from("stickers")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error loading stickers:", error);
      setLoading(false);
      return;
    }

    setStickers(data || []);
    setLoading(false);
  }

  async function login() {
    if (!email || !password) {
      alert("Escribe tu email y contraseña.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setSaving(false);

    if (error) {
      console.error("Error login:", error);
      alert("No se pudo iniciar sesión. Revisa email y contraseña.");
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setStickers([]);
  }

  const total = stickers.length;
  const ownedCount = stickers.filter((s) => s.owned).length;
  const missingCount = total - ownedCount;
  const duplicatesCount = stickers.reduce(
    (sum, s) => sum + (s.duplicates || 0),
    0
  );
  const progress = total > 0 ? Math.round((ownedCount / total) * 100) : 0;

  const filteredStickers = useMemo(() => {
    return stickers.filter((sticker) => {
      const text = `${sticker.number} ${sticker.name || ""} ${
        sticker.team || ""
      } ${sticker.section || ""} ${sticker.type || ""}`.toLowerCase();

      const matchesSearch = text.includes(search.toLowerCase());

      const matchesFilter =
        filter === "all" ||
        (filter === "owned" && sticker.owned) ||
        (filter === "missing" && !sticker.owned) ||
        (filter === "duplicates" && sticker.duplicates > 0);

      const matchesSection =
        selectedTeam === "all" || sticker.section === selectedTeam;

      return matchesSearch && matchesFilter && matchesSection;
    });
  }, [stickers, search, filter, selectedTeam]);

  async function toggleOwned(id: number) {
    const sticker = stickers.find((s) => s.id === id);

    if (!sticker) return;

    const newOwnedValue = !sticker.owned;

    setStickers((current) =>
      current.map((item) =>
        item.id === id ? { ...item, owned: newOwnedValue } : item
      )
    );

    const { error } = await supabase
      .from("stickers")
      .update({ owned: newOwnedValue })
      .eq("id", id);

    if (error) {
      console.error("Error updating owned:", error);

      setStickers((current) =>
        current.map((item) =>
          item.id === id ? { ...item, owned: sticker.owned } : item
        )
      );

      alert("No se pudo guardar el cambio en Supabase.");
    }
  }

  async function increaseDuplicate(id: number) {
    const sticker = stickers.find((s) => s.id === id);

    if (!sticker) return;

    const newDuplicatesValue = (sticker.duplicates || 0) + 1;

    setStickers((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, duplicates: newDuplicatesValue }
          : item
      )
    );

    const { error } = await supabase
      .from("stickers")
      .update({ duplicates: newDuplicatesValue })
      .eq("id", id);

    if (error) {
      console.error("Error increasing duplicate:", error);

      setStickers((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, duplicates: sticker.duplicates || 0 }
            : item
        )
      );

      alert("No se pudo guardar la repetida en Supabase.");
    }
  }

  async function decreaseDuplicate(id: number) {
    const sticker = stickers.find((s) => s.id === id);

    if (!sticker) return;

    const newDuplicatesValue = Math.max((sticker.duplicates || 0) - 1, 0);

    setStickers((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, duplicates: newDuplicatesValue }
          : item
      )
    );

    const { error } = await supabase
      .from("stickers")
      .update({ duplicates: newDuplicatesValue })
      .eq("id", id);

    if (error) {
      console.error("Error decreasing duplicate:", error);

      setStickers((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, duplicates: sticker.duplicates || 0 }
            : item
        )
      );

      alert("No se pudo guardar la repetida en Supabase.");
    }
  }

  function parsePackInput(input: string) {
    return input
      .split(/[\s,;]+/)
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean);
  }

  async function confirmPack() {
    const numbers = parsePackInput(packInput);

    if (numbers.length === 0) {
      setPackResult({
        newStickers: [],
        repeatedStickers: [],
        notFoundNumbers: [],
      });
      return;
    }

    setSaving(true);

    const newStickers: Sticker[] = [];
    const repeatedStickers: Sticker[] = [];
    const notFoundNumbers: string[] = [];

    const updatedStickers = [...stickers];

    numbers.forEach((number) => {
      const index = updatedStickers.findIndex(
        (sticker) => sticker.number.toUpperCase() === number
      );

      if (index === -1) {
        notFoundNumbers.push(number);
        return;
      }

      const sticker = updatedStickers[index];

      if (sticker.owned) {
        const updatedSticker = {
          ...sticker,
          duplicates: (sticker.duplicates || 0) + 1,
        };

        updatedStickers[index] = updatedSticker;
        repeatedStickers.push(updatedSticker);
      } else {
        const updatedSticker = {
          ...sticker,
          owned: true,
        };

        updatedStickers[index] = updatedSticker;
        newStickers.push(updatedSticker);
      }
    });

    const changedStickers = [...newStickers, ...repeatedStickers];

    setStickers(updatedStickers);

    setPackResult({
      newStickers,
      repeatedStickers,
      notFoundNumbers,
    });

    setPackInput("");

    if (changedStickers.length === 0) {
      setSaving(false);
      return;
    }

    const results = await Promise.all(
      changedStickers.map((sticker) =>
        supabase
          .from("stickers")
          .update({
            owned: sticker.owned,
            duplicates: sticker.duplicates || 0,
          })
          .eq("id", sticker.id)
      )
    );

    const hasError = results.some((result) => result.error);

    if (hasError) {
      console.error("Error saving pack:", results);

      alert(
        "El sobre se capturó en pantalla, pero hubo un problema guardando en Supabase. Recarga para validar."
      );
    }

    setSaving(false);
  }

  function clearPack() {
    setPackInput("");
    setPackResult(null);
  }

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-4 flex items-center justify-center">
        <p className="text-lg">Revisando sesión...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-4 flex items-center justify-center">
        <section className="w-full max-w-sm bg-slate-900 rounded-2xl p-5 shadow space-y-4">
          <div>
            <p className="text-sm text-slate-400">Álbum Mundial FIFA 2026</p>
            <h1 className="text-3xl font-bold mt-1">Iniciar sesión</h1>
            <p className="text-sm text-slate-400 mt-2">
              Entra para administrar la colección familiar.
            </p>
          </div>

          <div className="space-y-3">
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="Email"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
            />

            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="Contraseña"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
            />

            <button
              onClick={login}
              disabled={saving}
              className="w-full bg-blue-600 disabled:bg-slate-700 disabled:text-slate-400 rounded-xl p-3 font-semibold"
            >
              {saving ? "Entrando..." : "Entrar"}
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-4 flex items-center justify-center">
        <p className="text-lg">Cargando álbum...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4">
      <div className="max-w-md mx-auto space-y-4 pb-24">
        <header className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-slate-400">Álbum Mundial FIFA 2026</p>
              <h1 className="text-3xl font-bold">Mi colección</h1>
            </div>

            <button
              onClick={logout}
              className="bg-slate-800 text-slate-300 rounded-xl px-3 py-2 text-sm font-semibold shrink-0"
            >
              Salir
            </button>
          </div>

          <p className="text-xs text-slate-500 truncate">{user.email}</p>
        </header>

        <section className="bg-slate-900 rounded-2xl p-4 shadow space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-slate-400">Progreso</p>
              <p className="text-4xl font-bold">{progress}%</p>
            </div>

            <div className="text-right text-sm text-slate-400">
              <p>
                {ownedCount} de {total}
              </p>
              <p>{missingCount} faltan</p>
            </div>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
            <div
              className="bg-green-500 h-full rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-800 rounded-xl p-3">
              <p className="text-xl font-bold">{ownedCount}</p>
              <p className="text-xs text-slate-400">Tengo</p>
            </div>

            <div className="bg-slate-800 rounded-xl p-3">
              <p className="text-xl font-bold">{missingCount}</p>
              <p className="text-xs text-slate-400">Faltan</p>
            </div>

            <div className="bg-slate-800 rounded-xl p-3">
              <p className="text-xl font-bold">{duplicatesCount}</p>
              <p className="text-xs text-slate-400">Repetidas</p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setPackMode(false)}
            className={`rounded-xl p-3 font-semibold ${
              !packMode ? "bg-blue-600" : "bg-slate-800 text-slate-300"
            }`}
          >
            Álbum
          </button>

          <button
            onClick={() => setPackMode(true)}
            className={`rounded-xl p-3 font-semibold ${
              packMode ? "bg-blue-600" : "bg-slate-800 text-slate-300"
            }`}
          >
            Modo sobres
          </button>
        </section>

        {packMode ? (
          <section className="bg-slate-900 rounded-2xl p-4 shadow space-y-4">
            <div>
              <h2 className="text-xl font-bold">Capturar sobre</h2>
              <p className="text-sm text-slate-400 mt-1">
                Escribe los números de los stickers separados por espacio, coma
                o salto de línea.
              </p>
            </div>

            <textarea
              value={packInput}
              onChange={(event) => setPackInput(event.target.value)}
              placeholder="Ejemplo: ARG017 MEX012 USA007"
              className="w-full min-h-36 bg-slate-950 border border-slate-700 rounded-xl p-3 text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={confirmPack}
                disabled={saving}
                className="bg-green-600 disabled:bg-slate-700 disabled:text-slate-400 rounded-xl p-3 font-semibold"
              >
                {saving ? "Guardando..." : "Confirmar sobre"}
              </button>

              <button
                onClick={clearPack}
                disabled={saving}
                className="bg-slate-800 disabled:bg-slate-700 rounded-xl p-3 font-semibold text-slate-300"
              >
                Limpiar
              </button>
            </div>

            {packResult && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-green-950 border border-green-800 rounded-xl p-3">
                    <p className="text-xl font-bold">
                      {packResult.newStickers.length}
                    </p>
                    <p className="text-xs text-green-300">Nuevas</p>
                  </div>

                  <div className="bg-yellow-950 border border-yellow-800 rounded-xl p-3">
                    <p className="text-xl font-bold">
                      {packResult.repeatedStickers.length}
                    </p>
                    <p className="text-xs text-yellow-300">Repetidas</p>
                  </div>

                  <div className="bg-red-950 border border-red-800 rounded-xl p-3">
                    <p className="text-xl font-bold">
                      {packResult.notFoundNumbers.length}
                    </p>
                    <p className="text-xs text-red-300">No encontradas</p>
                  </div>
                </div>

                {packResult.newStickers.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-green-400 mb-2">
                      Nuevas
                    </h3>

                    <div className="space-y-2">
                      {packResult.newStickers.map((sticker) => (
                        <div
                          key={sticker.id}
                          className="bg-slate-800 rounded-xl p-3"
                        >
                          <p className="font-bold">{sticker.number}</p>
                          <p className="text-sm text-slate-400">
                            {sticker.name || "Sin nombre"} ·{" "}
                            {sticker.team || "Sin equipo"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {packResult.repeatedStickers.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-yellow-400 mb-2">
                      Repetidas
                    </h3>

                    <div className="space-y-2">
                      {packResult.repeatedStickers.map((sticker, index) => (
                        <div
                          key={`${sticker.id}-${index}`}
                          className="bg-slate-800 rounded-xl p-3"
                        >
                          <p className="font-bold">{sticker.number}</p>
                          <p className="text-sm text-slate-400">
                            {sticker.name || "Sin nombre"} · Repetidas:{" "}
                            {sticker.duplicates}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {packResult.notFoundNumbers.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-red-400 mb-2">
                      No encontradas
                    </h3>

                    <div className="flex flex-wrap gap-2">
                      {packResult.notFoundNumbers.map((number) => (
                        <span
                          key={number}
                          className="bg-red-950 border border-red-800 rounded-full px-3 py-1 text-sm"
                        >
                          {number}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        ) : (
          <>
            <TeamProgress
              stickers={stickers}
              selectedTeam={selectedTeam}
              onSelectTeam={setSelectedTeam}
            />

            <section className="space-y-3">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar sticker, equipo o sección..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
              />

              <div className="grid grid-cols-4 gap-2 text-sm">
                <button
                  onClick={() => setFilter("all")}
                  className={`rounded-xl p-2 ${
                    filter === "all" ? "bg-blue-600" : "bg-slate-800"
                  }`}
                >
                  Todos
                </button>

                <button
                  onClick={() => setFilter("owned")}
                  className={`rounded-xl p-2 ${
                    filter === "owned" ? "bg-blue-600" : "bg-slate-800"
                  }`}
                >
                  Tengo
                </button>

                <button
                  onClick={() => setFilter("missing")}
                  className={`rounded-xl p-2 ${
                    filter === "missing" ? "bg-blue-600" : "bg-slate-800"
                  }`}
                >
                  Faltan
                </button>

                <button
                  onClick={() => setFilter("duplicates")}
                  className={`rounded-xl p-2 ${
                    filter === "duplicates" ? "bg-blue-600" : "bg-slate-800"
                  }`}
                >
                  Rep.
                </button>
              </div>

              {selectedTeam !== "all" && (
                <button
                  onClick={() => setSelectedTeam("all")}
                  className="w-full bg-slate-800 text-slate-300 rounded-xl p-3 font-semibold"
                >
                  Ver todas las secciones
                </button>
              )}
            </section>

            {selectedTeam !== "all" && (
              <section className="bg-slate-900 rounded-2xl p-4 shadow">
                <p className="text-sm text-slate-400">Viendo sección</p>
                <h2 className="text-xl font-bold">{selectedTeam}</h2>
              </section>
            )}

            <section className="space-y-2">
              {filteredStickers.map((sticker) => (
                <article
                  key={sticker.id}
                  className="bg-slate-900 rounded-2xl p-4 shadow flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-lg">{sticker.number}</p>

                      {sticker.owned ? (
                        <span className="text-xs bg-green-900 text-green-300 rounded-full px-2 py-1">
                          Tengo
                        </span>
                      ) : (
                        <span className="text-xs bg-slate-800 text-slate-300 rounded-full px-2 py-1">
                          Falta
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-300 truncate">
                      {sticker.name || "Sin nombre"}
                    </p>

                    <p className="text-xs text-slate-500 truncate">
                      {sticker.team || "Sin equipo"} ·{" "}
                      {sticker.section || "Sin sección"}
                    </p>

                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => decreaseDuplicate(sticker.id)}
                        className="bg-slate-800 rounded-lg w-8 h-8 font-bold"
                      >
                        -
                      </button>

                      <span className="text-sm text-slate-300 min-w-20 text-center">
                        Rep: {sticker.duplicates || 0}
                      </span>

                      <button
                        onClick={() => increaseDuplicate(sticker.id)}
                        className="bg-slate-800 rounded-lg w-8 h-8 font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleOwned(sticker.id)}
                    className={`rounded-xl px-4 py-3 font-semibold shrink-0 ${
                      sticker.owned ? "bg-green-600" : "bg-slate-800"
                    }`}
                  >
                    {sticker.owned ? "✓" : "Marcar"}
                  </button>
                </article>
              ))}

              {filteredStickers.length === 0 && (
                <div className="bg-slate-900 rounded-2xl p-5 text-center shadow">
                  <p className="font-semibold">No hay stickers con estos filtros.</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Prueba cambiar búsqueda, filtro o sección.
                  </p>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}