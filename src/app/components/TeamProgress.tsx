"use client";

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

type SectionSummary = {
  section: string;
  total: number;
  owned: number;
  missing: number;
  percentage: number;
  complete: boolean;
};

type TeamProgressProps = {
  stickers: Sticker[];
  selectedTeam: string;
  onSelectTeam: (team: string) => void;
};

export default function TeamProgress({
  stickers,
  selectedTeam,
  onSelectTeam,
}: TeamProgressProps) {
  const sections = buildSectionSummaries(stickers);

  const completedSections = sections.filter((section) => section.complete).length;
  const totalSections = sections.length;

  const selectedSectionSummary =
    selectedTeam === "all"
      ? null
      : sections.find((section) => section.section === selectedTeam) ?? null;

  return (
    <section className="bg-slate-900 rounded-2xl p-4 shadow space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Secciones completas</h2>
          <p className="text-sm text-slate-400">Progreso por sección</p>
        </div>

        <div className="bg-slate-800 rounded-xl px-3 py-2 text-right shrink-0">
          <p className="text-xs text-slate-400">Completas</p>
          <p className="text-lg font-bold text-white">
            {completedSections}/{totalSections}
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-2">
          Filtrar por sección
        </label>

        <select
          value={selectedTeam}
          onChange={(event) => onSelectTeam(event.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-blue-500"
        >
          <option value="all">Todas las secciones</option>

          {sections.map((section) => (
            <option key={section.section} value={section.section}>
              {section.section} — {section.owned}/{section.total} —{" "}
              {section.percentage}%
            </option>
          ))}
        </select>
      </div>

      {selectedSectionSummary && (
        <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-white">
                  {selectedSectionSummary.section}
                </h3>

                {selectedSectionSummary.complete && (
                  <span className="text-xs bg-green-900 text-green-300 rounded-full px-2 py-1">
                    Completa
                  </span>
                )}
              </div>

              <p className="text-sm text-slate-400 mt-1">
                {selectedSectionSummary.owned} de{" "}
                {selectedSectionSummary.total} stickers
              </p>
            </div>

            <div className="text-right shrink-0">
              <p className="text-xl font-bold text-white">
                {selectedSectionSummary.percentage}%
              </p>
              <p className="text-xs text-slate-400">
                Faltan {selectedSectionSummary.missing}
              </p>
            </div>
          </div>

          <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden mt-3">
            <div
              className={`h-full rounded-full ${
                selectedSectionSummary.complete
                  ? "bg-green-500"
                  : "bg-blue-500"
              }`}
              style={{ width: `${selectedSectionSummary.percentage}%` }}
            />
          </div>
        </div>
      )}

      {sections.length === 0 && (
        <div className="bg-slate-800 rounded-xl p-4 text-center">
          <p className="text-sm text-slate-400">
            Todavía no hay secciones cargadas.
          </p>
        </div>
      )}
    </section>
  );
}

function buildSectionSummaries(stickers: Sticker[]): SectionSummary[] {
  const grouped = new Map<string, Sticker[]>();

  for (const sticker of stickers) {
    const section = sticker.section?.trim();

    if (!section) continue;

    const current = grouped.get(section) ?? [];
    current.push(sticker);
    grouped.set(section, current);
  }

  return Array.from(grouped.entries())
    .map(([section, sectionStickers]) => {
      const total = sectionStickers.length;
      const owned = sectionStickers.filter((sticker) => sticker.owned).length;
      const missing = total - owned;
      const percentage = total > 0 ? Math.round((owned / total) * 100) : 0;

      return {
        section,
        total,
        owned,
        missing,
        percentage,
        complete: total > 0 && owned === total,
      };
    })
    .sort((a, b) => {
      if (a.complete !== b.complete) {
        return a.complete ? 1 : -1;
      }

      return b.percentage - a.percentage || a.section.localeCompare(b.section);
    });
}