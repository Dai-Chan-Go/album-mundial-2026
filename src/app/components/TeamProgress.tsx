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

type TeamSummary = {
  team: string;
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
  const teams = buildTeamSummaries(stickers);

  const completedTeams = teams.filter((team) => team.complete).length;
  const totalTeams = teams.length;

  const selectedTeamSummary =
    selectedTeam === "all"
      ? null
      : teams.find((team) => team.team === selectedTeam) ?? null;

  return (
    <section className="bg-slate-900 rounded-2xl p-4 shadow space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Equipos completos</h2>
          <p className="text-sm text-slate-400">Progreso por selección</p>
        </div>

        <div className="bg-slate-800 rounded-xl px-3 py-2 text-right shrink-0">
          <p className="text-xs text-slate-400">Completos</p>
          <p className="text-lg font-bold text-white">
            {completedTeams}/{totalTeams}
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-2">
          Filtrar por equipo
        </label>

        <select
          value={selectedTeam}
          onChange={(event) => onSelectTeam(event.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-blue-500"
        >
          <option value="all">Todos los equipos</option>

          {teams.map((team) => (
            <option key={team.team} value={team.team}>
              {team.team} — {team.owned}/{team.total} — {team.percentage}%
            </option>
          ))}
        </select>
      </div>

      {selectedTeamSummary && (
        <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-white">
                  {selectedTeamSummary.team}
                </h3>

                {selectedTeamSummary.complete && (
                  <span className="text-xs bg-green-900 text-green-300 rounded-full px-2 py-1">
                    Completo
                  </span>
                )}
              </div>

              <p className="text-sm text-slate-400 mt-1">
                {selectedTeamSummary.owned} de {selectedTeamSummary.total}{" "}
                stickers
              </p>
            </div>

            <div className="text-right shrink-0">
              <p className="text-xl font-bold text-white">
                {selectedTeamSummary.percentage}%
              </p>
              <p className="text-xs text-slate-400">
                Faltan {selectedTeamSummary.missing}
              </p>
            </div>
          </div>

          <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden mt-3">
            <div
              className={`h-full rounded-full ${
                selectedTeamSummary.complete ? "bg-green-500" : "bg-blue-500"
              }`}
              style={{ width: `${selectedTeamSummary.percentage}%` }}
            />
          </div>
        </div>
      )}

      {teams.length === 0 && (
        <div className="bg-slate-800 rounded-xl p-4 text-center">
          <p className="text-sm text-slate-400">
            Todavía no hay equipos cargados.
          </p>
        </div>
      )}
    </section>
  );
}

function buildTeamSummaries(stickers: Sticker[]): TeamSummary[] {
  const grouped = new Map<string, Sticker[]>();

  for (const sticker of stickers) {
    const team = sticker.team?.trim();

    if (!team) continue;

    const current = grouped.get(team) ?? [];
    current.push(sticker);
    grouped.set(team, current);
  }

  return Array.from(grouped.entries())
    .map(([team, teamStickers]) => {
      const total = teamStickers.length;
      const owned = teamStickers.filter((sticker) => sticker.owned).length;
      const missing = total - owned;
      const percentage = total > 0 ? Math.round((owned / total) * 100) : 0;

      return {
        team,
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

      return b.percentage - a.percentage || a.team.localeCompare(b.team);
    });
}