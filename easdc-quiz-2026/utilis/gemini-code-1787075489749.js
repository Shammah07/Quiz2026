"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Trophy, Shield, ClipboardList, Plus, Trash2, Check, Shuffle,
  ChevronDown, ChevronUp, LogOut, Users, Settings as SettingsIcon,
  ListChecks, Search, Copy, CheckCircle2, AlertCircle, Loader2
} from "lucide-react";
import { supabase } from "./supabaseClient";

/* ---------------------------------------------------------
   TOKENS
   ink        #14213D  deep navy — chrome / headers
   ink2       #1F2D57  panel navy
   paper      #F7F5F0  warm off-white background
   gold       #FFB627  1st place / primary accent
   teal       #06AED5  interactive / links / live
   coral      #EF6461  destructive / alerts
   silver     #C7CDD9  2nd place
   bronze     #C97B4A  3rd place
   muted      #6B7490  secondary text
--------------------------------------------------------- */

export const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap');
`;

export const STORAGE = {
  config: "config",
  teams: "teams",
  scores: "scores",
  pairings: "pairings",
};

export function useStorage() {
  const get = useCallback(async (key) => {
    const { data, error } = await supabase
      .from("tournament_state")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error) {
      console.error("Storage read failed:", error.message);
      return null;
    }
    return data?.value ?? null;
  }, []);

  const set = useCallback(async (key, value) => {
    const { error } = await supabase
      .from("tournament_state")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) {
      console.error("Storage write failed:", error.message);
      return false;
    }
    return true;
  }, []);

  return { get, set };
}

export const uid = () => Math.random().toString(36).slice(2, 10);

/* Fixed tournament structure, matched to the official rubric.
   "match" groups rounds within the preliminary stage; knockout
   stages have no match grouping, just a sequence of named rounds. */
const ROUND_TEMPLATE = [
  { stage: "preliminary", match: "Match 1", name: "Round 1: Categories" },
  { stage: "preliminary", match: "Match 1", name: "Round 2: Written Puzzle Questions" },
  { stage: "preliminary", match: "Match 2", name: "Round 1: Brain Maze Questions" },
  { stage: "preliminary", match: "Match 2", name: "Round 2: East African Knowledge" },
  { stage: "preliminary", match: "Match 3", name: "Round 1: Categories" },
  { stage: "preliminary", match: "Match 3", name: "Round 2: Conquer the Clue Questions" },
  { stage: "quarter-final", match: null, name: "Round 1: Category Selection" },
  { stage: "quarter-final", match: null, name: "Round 2: Pictorial Round" },
  { stage: "quarter-final", match: null, name: "Round 3: Categories (Death Wish Zone)" },
  { stage: "quarter-final", match: null, name: "Round 4: Quickfire Questions" },
  { stage: "semi-final", match: null, name: "Round 1: Mental Arithmetic" },
  { stage: "semi-final", match: null, name: "Round 2: Think, Don't Know" },
  { stage: "semi-final", match: null, name: "Round 3: Hot Seat" },
  { stage: "semi-final", match: null, name: "Round 4: Visual Intelligence" },
  { stage: "final", match: null, name: "Round 1: Fork in the Road" },
  { stage: "final", match: null, name: "Round 2: Spelling Bee" },
  { stage: "final", match: null, name: "Round 3: Memory Challenge" },
  { stage: "final", match: null, name: "Round 4: Multimedia & Entertainment" },
  { stage: "final", match: null, name: "Round 5: Echo Effect" },
];

export const STAGE_LABELS = {
  preliminary: "Preliminary Rounds",
  "quarter-final": "Quarter Finals",
  "semi-final": "Semi Finals",
  final: "Grand Finale",
};

// Reuses existing round ids when a template entry already exists in
// storage (matched by stage+match+name), so previously entered scores
// stay attached to the right round after a config reload.
function buildRounds(existingRounds = []) {
  return ROUND_TEMPLATE.map((tpl) => {
    const existing = existingRounds.find(
      (r) => r.stage === tpl.stage && r.match === tpl.match && r.name === tpl.name
    );
    return { id: existing?.id || uid(), ...tpl };
  });
}

export function groupRoundsForDisplay(rounds) {
  const groups = [];
  const byKey = new Map();
  rounds.forEach((r) => {
    const key = `${r.stage}::${r.match || ""}`;
    if (!byKey.has(key)) {
      const label = r.match ? `${STAGE_LABELS[r.stage]} · ${r.match}` : STAGE_LABELS[r.stage];
      const group = { key, label, items: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    byKey.get(key).items.push(r);
  });
  return groups;
}

export const defaultConfig = () => ({
  setupDone: false,
  name: "Quiz Tournament",
  startDate: "2026-09-09",
  endDate: "2026-09-15",
  maxScorePerRound: 100,
  qualificationCount: 8,
  conflictAvoidance: "one-up-one-down",
  pairingMethod: "fold",
  rounds: buildRounds(),
});

export function normalizeConfig(config) {
  if (!config) return config;
  return {
    ...config,
    qualificationCount: config.qualificationCount || 8,
    conflictAvoidance: config.conflictAvoidance || "one-up-one-down",
    pairingMethod: config.pairingMethod || "fold",
    rounds: buildRounds(config.rounds),
  };
}

export function todayStatus(cfg) {
  if (!cfg) return "unknown";
  const today = new Date().toISOString().slice(0, 10);
  if (today < cfg.startDate) return "upcoming";
  if (today > cfg.endDate) return "ended";
  return "live";
}

export function computeStandings(teams, scores, rounds) {
  const roundIds = new Set(rounds.map((r) => r.id));
  return teams
    .map((team) => {
      const byRound = {};
      let total = 0;
      scores
        .filter((s) => s.teamId === team.id && roundIds.has(s.roundId))
        .forEach((s) => {
          byRound[s.roundId] = s.points;
          total += s.points;
        });
      return { ...team, byRound, total };
    })
    .sort((a, b) => b.total - a.total);
}

export function computeFoldPairings(teams) {
  const midpoint = Math.ceil(teams.length / 2);
  const upper = teams.slice(0, midpoint);
  const lower = teams.slice(midpoint).reverse();
  return upper.map((team, index) => ({
    number: index + 1,
    top: team,
    bottom: lower[index] || null,
  }));
}

/* ---------------------------------------------------------
   PAIRING ENGINE
   Preliminary: Controlled Swiss-Style Pairing (rematch avoidance,
   paired by cumulative standing after each match).
   Quarter Finals → Grand Finale: power-protected (fold) seeding,
   with knockout winners advancing based on points scored within
   that match's own rounds.
--------------------------------------------------------- */

const PRELIM_MATCH_ORDER = ["Match 1", "Match 2", "Match 3"];

// Rounds belonging to one specific match/stage instance. Preliminary
// rounds are scoped per match (Match 1/2/3 each have their own two
// named rounds); knockout stages share one round set across all of
// that stage's matches.
export function stageRoundsFor(config, stage, matchLabel) {
  if (stage === "preliminary") {
    return config.rounds.filter((r) => r.stage === "preliminary" && r.match === matchLabel);
  }
  return config.rounds.filter((r) => r.stage === stage);
}

export function teamPointsIn(teamId, rounds, scores) {
  const ids = new Set(rounds.map((r) => r.id));
  return scores
    .filter((s) => s.teamId === teamId && ids.has(s.roundId))
    .reduce((sum, s) => sum + s.points, 0);
}

// Winner of a single paired match: whichever team scored more across
// that match's own rounds. Returns null if scores are tied or not
// yet fully entered (a genuine tie needs a judge's manual call, so
// the app deliberately doesn't guess).
export function matchWinner(pairing, config, scores) {
  if (!pairing.teamAId || !pairing.teamBId) return pairing.teamAId || pairing.teamBId || null; // bye
  const rounds = stageRoundsFor(config, pairing.stage, pairing.matchLabel);
  const a = teamPointsIn(pairing.teamAId, rounds, scores);
  const b = teamPointsIn(pairing.teamBId, rounds, scores);
  if (a === b) return null;
  return a > b ? pairing.teamAId : pairing.teamBId;
}

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Match 1 has no standings to pair by yet, so teams are randomly paired.
export function generateMatch1Pairings(teams) {
  const shuffled = shuffle(teams);
  const pairings = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    pairings.push({
      id: uid(),
      stage: "preliminary",
      matchLabel: "Match 1",
      teamAId: shuffled[i].id,
      teamBId: shuffled[i + 1] ? shuffled[i + 1].id : null,
    });
  }
  return pairings;
}

// Matches 2 & 3: pair teams by cumulative standing so far, walking
// forward from each unpaired team to the nearest standing they
// haven't already faced — the "one-up-one-down" conflict-avoidance
// swap of a controlled Swiss system.
export function generateSwissPairings(matchLabel, teams, config, scores, existingPairings) {
  const matchIndex = PRELIM_MATCH_ORDER.indexOf(matchLabel);
  const priorMatches = PRELIM_MATCH_ORDER.slice(0, matchIndex);
  const priorRounds = priorMatches.flatMap((m) => stageRoundsFor(config, "preliminary", m));

  const standings = [...teams].sort((a, b) => {
    const diff = teamPointsIn(b.id, priorRounds, scores) - teamPointsIn(a.id, priorRounds, scores);
    return diff !== 0 ? diff : a.name.localeCompare(b.name);
  });

  const priorOpponents = new Map(teams.map((t) => [t.id, new Set()]));
  existingPairings
    .filter((p) => p.stage === "preliminary" && priorMatches.includes(p.matchLabel))
    .forEach((p) => {
      if (p.teamAId && p.teamBId) {
        priorOpponents.get(p.teamAId)?.add(p.teamBId);
        priorOpponents.get(p.teamBId)?.add(p.teamAId);
      }
    });

  const used = new Set();
  const pairings = [];
  for (let i = 0; i < standings.length; i++) {
    const teamA = standings[i];
    if (used.has(teamA.id)) continue;
    used.add(teamA.id);

    let partner = standings.slice(i + 1).find(
      (c) => !used.has(c.id) && !priorOpponents.get(teamA.id)?.has(c.id)
    );
    if (!partner) partner = standings.slice(i + 1).find((c) => !used.has(c.id)) || null;
    if (partner) used.add(partner.id);

    pairings.push({
      id: uid(),
      stage: "preliminary",
      matchLabel,
      teamAId: teamA.id,
      teamBId: partner ? partner.id : null,
    });
  }
  return pairings;
}

// Power-protected (fold) seeding: best seed faces worst remaining
// seed, protecting top seeds from meeting early. Used for every
// knockout stage.
export function generateFoldPairingsForStage(seededTeams, stage, labels) {
  const midpoint = Math.ceil(seededTeams.length / 2);
  const upper = seededTeams.slice(0, midpoint);
  const lower = seededTeams.slice(midpoint).reverse();
  return upper.map((team, index) => ({
    id: uid(),
    stage,
    matchLabel: labels[index] || `${stage} ${index + 1}`,
    teamAId: team.id,
    teamBId: lower[index] ? lower[index].id : null,
  }));
}

export function preliminarySeedOrder(teams, config, scores) {
  const prelimRounds = config.rounds.filter((r) => r.stage === "preliminary");
  return computeStandings(teams, scores, prelimRounds).slice(0, config.qualificationCount || 8);
}

export function generateQuarterFinalPairings(teams, config, scores) {
  const top = preliminarySeedOrder(teams, config, scores);
  return generateFoldPairingsForStage(top, "quarter-final", ["QF 1", "QF 2", "QF 3", "QF 4"]);
}

// Advances winners from one knockout stage while preserving their
// original preliminary seed order, then re-seeds them fold-style.
function advanceWinners(fromStage, toStage, labels, teams, config, scores, pairings) {
  const seedOrder = preliminarySeedOrder(teams, config, scores);
  const winnerIds = pairings
    .filter((p) => p.stage === fromStage)
    .map((p) => matchWinner(p, config, scores))
    .filter(Boolean);
  const advancing = seedOrder.filter((t) => winnerIds.includes(t.id));
  return generateFoldPairingsForStage(advancing, toStage, labels);
}

export function generateSemiFinalPairings(teams, config, scores, pairings) {
  return advanceWinners("quarter-final", "semi-final", ["SF 1", "SF 2"], teams, config, scores, pairings);
}

export function generateFinalPairing(teams, config, scores, pairings) {
  return advanceWinners("semi-final", "final", ["Final"], teams, config, scores, pairings);
}

/* ---------------------------------------------------------
   SHARED UI ATOMS
--------------------------------------------------------- */

export function LiveDot({ status }) {
  const label = status === "live" ? "LIVE" : status === "upcoming" ? "UPCOMING" : "ENDED";
  const color = status === "live" ? "#06AED5" : status === "upcoming" ? "#FFB627" : "#6B7490";
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-widest" style={{ color }}>
      <span className="relative flex h-2 w-2">
        {status === "live" && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: color }} />
        )}
        <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: color }} />
      </span>
      {label}
    </span>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label className="block mb-4">
      <span className="block text-xs font-semibold tracking-wide uppercase mb-1.5" style={{ color: "#6B7490" }}>
        {label}
      </span>
      {children}
      {hint && <span className="block text-[11px] mt-1" style={{ color: "#9098B0" }}>{hint}</span>}
    </label>
  );
}

export const inputBase =
  "w-full rounded-lg border px-3 py-2.5 text-[15px] outline-none transition-colors focus:ring-2";

export function TextInput(props) {
  return (
    <input
      {...props}
      className={inputBase + " " + (props.className || "")}
      style={{ borderColor: "#DBD8CE", background: "#FFFFFF", color: "#14213D", ...props.style }}
      onFocus={(e) => (e.target.style.borderColor = "#06AED5")}
      onBlur={(e) => (e.target.style.borderColor = "#DBD8CE")}
    />
  );
}

export function Btn({ children, variant = "primary", className = "", ...props }) {
  const styles = {
    primary: { background: "#14213D", color: "#F7F5F0" },
    accent: { background: "#06AED5", color: "#0A1830" },
    gold: { background: "#FFB627", color: "#14213D" },
    ghost: { background: "transparent", color: "#14213D", border: "1px solid #DBD8CE" },
    danger: { background: "transparent", color: "#EF6461", border: "1px solid #F3C8C6" },
  };
  return (
    <button
      {...props}
      style={styles[variant]}
      className={
        "font-display font-semibold text-sm px-4 py-2.5 rounded-lg transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 " +
        className
      }
    >
      {children}
    </button>
  );
}

export function Banner({ kind = "error", children }) {
  const map = {
    error: { bg: "#FDECEB", color: "#C1443E", icon: AlertCircle },
    success: { bg: "#E6F7F3", color: "#0F8A6B", icon: CheckCircle2 },
  };
  const s = map[kind];
  const Icon = s.icon;
  return (
    <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm mb-4" style={{ background: s.bg, color: s.color }}>
      <Icon size={16} className="shrink-0" />
      <span>{children}</span>
    </div>
  );
}

/* ---------------------------------------------------------
   APP SHELL
--------------------------------------------------------- */

export default function App() {
  const { get, set } = useStorage();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [teams, setTeams] = useState([]);
  const [scores, setScores] = useState([]);
  const [pairings, setPairings] = useState([]);
  const [view, setView] = useState("landing"); // landing | setup | admin-login | admin | judge-login | judge | standings
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [judgeSession, setJudgeSession] = useState(null); // { name }

  const loadAll = useCallback(async () => {
    const [c, t, s, p] = await Promise.all([get(STORAGE.config), get(STORAGE.teams), get(STORAGE.scores), get(STORAGE.pairings)]);
    const normalizedConfig = normalizeConfig(c);
    setConfig(normalizedConfig);
    setTeams(t || []);
    setScores(s || []);
    setPairings(p || []);
    return { c: normalizedConfig, t: t || [], s: s || [], p: p || [] };
  }, [get]);

  useEffect(() => {
    (async () => {
      const { c } = await loadAll();
      setView(c && c.setupDone ? "landing" : "gate-setup");
      setLoading(false);
    })();
  }, [loadAll]);

  if (loading) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-24 gap-3" style={{ color: "#6B7490" }}>
          <Loader2 className="animate-spin" size={28} />
          <span className="font-mono text-xs tracking-widest">LOADING TOURNAMENT</span>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {view === "gate-setup" && (
        <AdminGate
          onCancel={() => setView("landing")}
          hint="No tournament has been set up yet. Sign in with your admin account to start."
          onSubmit={() => setView("setup")}
        />
      )}

      {view === "setup" && (
        <AdminSetup
          onDone={async (cfg) => {
            const normalizedConfig = normalizeConfig(cfg);
            await set(STORAGE.config, normalizedConfig);
            setConfig(normalizedConfig);
            setAdminAuthed(true);
            setView("admin");
          }}
        />
      )}

      {view === "landing" && config && (
        <Landing
          config={config}
          onStandings={() => setView("standings")}
          onJudge={() => setView("judge-login")}
          onAdmin={() => setView(adminAuthed ? "admin" : "admin-login")}
        />
      )}

      {view === "admin-login" && (
        <AdminGate
          onCancel={() => setView("landing")}
          onSubmit={() => {
            setAdminAuthed(true);
            setView("admin");
          }}
        />
      )}

      {view === "admin" && config && (
        <AdminDashboard
          config={config}
          teams={teams}
          scores={scores}
          pairings={pairings}
          onConfigChange={async (next) => {
            const normalizedConfig = normalizeConfig(next);
            await set(STORAGE.config, normalizedConfig);
            setConfig(normalizedConfig);
          }}
          onTeamsChange={async (next) => {
            await set(STORAGE.teams, next);
            setTeams(next);
          }}
          onScoresChange={async (next) => {
            await set(STORAGE.scores, next);
            setScores(next);
          }}
          onPairingsChange={async (next) => {
            await set(STORAGE.pairings, next);
            setPairings(next);
          }}
          onRefresh={loadAll}
          onLogout={() => {
            supabase.auth.signOut();
            setAdminAuthed(false);
            setView("landing");
          }}
        />
      )}

      {view === "judge-login" && (
        <JudgeGate
          onCancel={() => setView("landing")}
          onSubmit={(name) => {
            setJudgeSession({ name });
            setView("judge");
          }}
        />
      )}

      {view === "judge" && config && judgeSession && (
        <JudgeDashboard
          config={config}
          teams={teams}
          scores={scores}
          judgeName={judgeSession.name}
          onTeamsChange={async (next) => {
            await set(STORAGE.teams, next);
            setTeams(next);
          }}
          onScoresChange={async (next) => {
            await set(STORAGE.scores, next);
            setScores(next);
          }}
          onRefresh={loadAll}
          onLogout={() => {
            supabase.auth.signOut();
            setJudgeSession(null);
            setView("landing");
          }}
        />
      )}

      {view === "standings" && config && (
        <Standings config={config} teams={teams} scores={scores} pairings={pairings} onRefresh={loadAll} onBack={() => setView("landing")} />
      )}
    </Shell>
  );
}

export function Shell({ children }) {
  return (
    <div style={{ background: "#F7F5F0", minHeight: "100%" }} className="w-full">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">{children}</div>
    </div>
  );
}

/* ---------------------------------------------------------
   LANDING
--------------------------------------------------------- */

export function Landing({ config, onStandings, onJudge, onAdmin }) {
  const status = todayStatus(config);
  return (
    <div>
      <header className="mb-10 relative">
        <button
          onClick={onAdmin}
          title="Admin"
          className="absolute right-0 top-0 p-2 rounded-full transition-colors"
          style={{ color: "#6B7490" }}
        >
          <Shield size={18} />
        </button>
        <div className="mb-1">
          <LiveDot status={status} />
        </div>
        <h1 className="font-display font-700 text-3xl sm:text-4xl leading-tight" style={{ color: "#14213D" }}>
          {config.name}
        </h1>
        <p className="font-mono text-xs mt-2" style={{ color: "#6B7490" }}>
          {formatDateRange(config.startDate, config.endDate)}
        </p>
      </header>

      <button
        onClick={onStandings}
        className="w-full text-left rounded-2xl p-6 sm:p-8 mb-4 transition-transform active:scale-[0.99] group"
        style={{ background: "#14213D" }}
      >
        <div className="flex items-start justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-widest mb-3" style={{ color: "#FFB627" }}>
              <Trophy size={14} /> LEADERBOARD
            </span>
            <h2 className="font-display font-700 text-2xl" style={{ color: "#F7F5F0" }}>
              See standings
            </h2>
            <p className="text-sm mt-1" style={{ color: "#9098B0" }}>
              Live scores, open to everyone — no sign-in needed.
            </p>
          </div>
          <ChevronRight />
        </div>
      </button>

      <button
        onClick={onJudge}
        className="w-full text-left rounded-2xl p-6 mb-4 border transition-transform active:scale-[0.99]"
        style={{ borderColor: "#DBD8CE", background: "#FFFFFF" }}
      >
        <div className="flex items-start justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-widest mb-3" style={{ color: "#06AED5" }}>
              <ClipboardList size={14} /> JUDGE PORTAL
            </span>
            <h2 className="font-display font-700 text-xl" style={{ color: "#14213D" }}>
              Register teams &amp; enter scores
            </h2>
            <p className="text-sm mt-1" style={{ color: "#6B7490" }}>
              Requires your judge account.
            </p>
          </div>
          <ChevronRight color="#14213D" />
        </div>
      </button>
    </div>
  );
}

export function ChevronRight({ color = "#F7F5F0" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" className="shrink-0 mt-1">
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function formatDateRange(start, end) {
  const opts = { month: "short", day: "numeric" };
  try {
    const s = new Date(start + "T00:00:00");
    const e = new Date(end + "T00:00:00");
    return `${s.toLocaleDateString(undefined, opts)} – ${e.toLocaleDateString(undefined, { ...opts, year: "numeric" })}`;
  } catch {
    return `${start} – ${end}`;
  }
}

/* ---------------------------------------------------------
   ADMIN GATE + SETUP
--------------------------------------------------------- */

export function AdminGate({ onSubmit, onCancel, hint }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      setErr("Sign-in failed — check your email and password.");
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();
    setLoading(false);
    if (profile?.role !== "admin") {
      await supabase.auth.signOut();
      setErr("This account isn't set up as an admin.");
      return;
    }
    onSubmit();
  };

  return (
    <GateShell icon={<Shield size={20} />} title="Admin access" onCancel={onCancel}>
      {err && <Banner>{err}</Banner>}
      {hint && <p className="text-sm mb-4" style={{ color: "#6B7490" }}>{hint}</p>}
      <form onSubmit={submit}>
        <Field label="Email">
          <TextInput type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </Field>
        <Field label="Password">
          <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" />
        </Field>
        <Btn variant="primary" type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Btn>
      </form>
    </GateShell>
  );
}

export function RoundStructurePreview({ rounds }) {
  const groups = groupRoundsForDisplay(rounds);
  return (
    <div className="space-y-2.5">
      {groups.map((g) => (
        <div key={g.key} className="rounded-lg border px-3 py-2.5" style={{ borderColor: "#DBD8CE", background: "#F7F5F0" }}>
          <div className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "#06AED5" }}>
            {g.label}
          </div>
          <ul className="space-y-0.5">
            {g.items.map((r) => (
              <li key={r.id} className="text-sm" style={{ color: "#14213D" }}>{r.name}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function GateShell({ icon, title, children, onCancel }) {
  return (
    <div className="max-w-sm mx-auto mt-8">
      <button onClick={onCancel} className="text-sm mb-6 inline-flex items-center gap-1" style={{ color: "#6B7490" }}>
        ← Back
      </button>
      <div className="rounded-2xl p-6 border" style={{ borderColor: "#DBD8CE", background: "#FFFFFF" }}>
        <div className="flex items-center gap-2 mb-4" style={{ color: "#14213D" }}>
          {icon}
          <h2 className="font-display font-600 text-lg">{title}</h2>
        </div>
        {children}
      </div>
    </div>
  );
}

export function AdminSetup({ onDone }) {
  const [cfg, setCfg] = useState(defaultConfig());
  const [step, setStep] = useState(0);
  const [err, setErr] = useState("");

  const finish = () => {
    if (!cfg.name.trim()) return setErr("Give your tournament a name.");
    setErr("");
    onDone({ ...cfg, setupDone: true });
  };

  return (
    <div className="max-w-md mx-auto mt-4">
      <div className="mb-6">
        <span className="font-mono text-xs tracking-widest" style={{ color: "#06AED5" }}>SETUP · STEP {step + 1} OF 2</span>
        <h1 className="font-display font-700 text-2xl mt-1" style={{ color: "#14213D" }}>
          {step === 0 && "Name your tournament"}
          {step === 1 && "Set the rounds"}
        </h1>
      </div>

      {err && <Banner>{err}</Banner>}

      <div className="rounded-2xl p-6 border" style={{ borderColor: "#DBD8CE", background: "#FFFFFF" }}>
        {step === 0 && (
          <>
            <Field label="Tournament name">
              <TextInput value={cfg.name} onChange={(e) => setCfg((c) => ({ ...c, name: e.target.value }))} placeholder="e.g. Junior Quiz Challenge 2026" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Starts">
                <TextInput type="date" value={cfg.startDate} onChange={(e) => setCfg((c) => ({ ...c, startDate: e.target.value }))} />
              </Field>
              <Field label="Ends">
                <TextInput type="date" value={cfg.endDate} onChange={(e) => setCfg((c) => ({ ...c, endDate: e.target.value }))} />
              </Field>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="rounded-lg px-3 py-2.5 mb-5" style={{ background: "#E6F7F3", color: "#0F8A6B" }}>
              <div className="font-semibold text-sm">Tournament format locked to the rubric</div>
              <div className="text-xs mt-1">3 preliminary matches (2 rounds each) → top 8 qualify → quarter-finals → semi-finals → grand finale</div>
              <div className="text-xs mt-1">Pairing: Fold Method · Conflict avoidance: One-up-One-down</div>
            </div>
            <Field label="Max points per round">
              <TextInput
                type="number"
                min={1}
                value={cfg.maxScorePerRound}
                onChange={(e) => setCfg((c) => ({ ...c, maxScorePerRound: Number(e.target.value) || 1 }))}
              />
            </Field>
            <span className="block text-xs font-semibold tracking-wide uppercase mb-2" style={{ color: "#6B7490" }}>Rounds</span>
            <RoundStructurePreview rounds={cfg.rounds} />
          </>
        )}
      </div>

      <div className="flex justify-between mt-4">
        <Btn variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          Back
        </Btn>
        {step < 1 ? (
          <Btn variant="primary" onClick={() => setStep((s) => s + 1)}>Next</Btn>
        ) : (
          <Btn variant="gold" onClick={finish}>Launch tournament</Btn>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   JUDGE GATE
--------------------------------------------------------- */

export function JudgeGate({ onSubmit, onCancel }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      setErr("Sign-in failed — check your email and password.");
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, display_name")
      .eq("id", data.user.id)
      .single();
    setLoading(false);
    if (profile?.role !== "judge") {
      await supabase.auth.signOut();
      setErr("This account isn't set up as a judge.");
      return;
    }
    onSubmit(profile.display_name || email);
  };

  return (
    <GateShell icon={<ClipboardList size={20} />} title="Judge access" onCancel={onCancel}>
      {err && <Banner>{err}</Banner>}
      <form onSubmit={submit}>
        <Field label="Email">
          <TextInput type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </Field>
        <Field label="Password">
          <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" />
        </Field>
        <Btn variant="primary" type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Btn>
      </form>
    </GateShell>
  );
}

/* ---------------------------------------------------------
   ADMIN DASHBOARD
--------------------------------------------------------- */

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 mb-6 overflow-x-auto pb-1 -mx-1 px-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className="shrink-0 px-3.5 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-1.5 transition-colors"
          style={
            active === t.key
              ? { background: "#14213D", color: "#F7F5F0" }
              : { background: "transparent", color: "#6B7490" }
          }
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function StatCard({ label, value, accent = "#14213D" }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "#DBD8CE", background: "#FFFFFF" }}>
      <div className="font-mono text-2xl font-700" style={{ color: accent }}>{value}</div>
      <div className="text-xs mt-1" style={{ color: "#6B7490" }}>{label}</div>
    </div>
  );
}

export function AdminDashboard({ config, teams, scores, pairings, onConfigChange, onTeamsChange, onScoresChange, onPairingsChange, onRefresh, onLogout }) {
  const [tab, setTab] = useState("overview");
  const status = todayStatus(config);

  return (
    <div>
      <DashHeader title={config.name} subtitle="Admin" status={status} onLogout={onLogout} onRefresh={onRefresh} />
      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { key: "overview", label: "Overview", icon: <ListChecks size={15} /> },
          { key: "settings", label: "Settings", icon: <SettingsIcon size={15} /> },
          { key: "teams", label: "Teams", icon: <Users size={15} /> },
          { key: "scores", label: "Scores", icon: <Trophy size={15} /> },
          { key: "pairings", label: "Pairings", icon: <Shuffle size={15} /> },
        ]}
      />

      {tab === "overview" && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Teams registered" value={teams.length} />
          <StatCard label="Scores entered" value={scores.length} accent="#06AED5" />
          <StatCard label="Rounds" value={config.rounds.length} />
          <StatCard label="Status" value={status.toUpperCase()} accent={status === "live" ? "#06AED5" : "#FFB627"} />
        </div>
      )}

      {tab === "settings" && (
        <SettingsPanel config={config} onConfigChange={onConfigChange} />
      )}

      {tab === "teams" && (
        <TeamsPanel teams={teams} onTeamsChange={onTeamsChange} scores={scores} onScoresChange={onScoresChange} editable />
      )}

      {tab === "scores" && (
        <ScoresPanel teams={teams} scores={scores} rounds={config.rounds} onScoresChange={onScoresChange} editable />
      )}

      {tab === "pairings" && (
        <PairingsPanel config={config} teams={teams} scores={scores} pairings={pairings} onPairingsChange={onPairingsChange} />
      )}
    </div>
  );
}

export function DashHeader({ title, subtitle, status, onLogout, onRefresh }) {
  const [spinning, setSpinning] = useState(false);
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-widest" style={{ color: "#6B7490" }}>
          {subtitle.toUpperCase()}
        </span>
        <h1 className="font-display font-700 text-2xl" style={{ color: "#14213D" }}>{title}</h1>
        {status && <div className="mt-1"><LiveDot status={status} /></div>}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={async () => { setSpinning(true); await onRefresh(); setTimeout(() => setSpinning(false), 400); }}
          className="p-2 rounded-full"
          style={{ color: "#6B7490" }}
          title="Refresh"
        >
          <Loader2 size={17} className={spinning ? "animate-spin" : ""} />
        </button>
        <button onClick={onLogout} className="p-2 rounded-full" style={{ color: "#6B7490" }} title="Log out">
          <LogOut size={17} />
        </button>
      </div>
    </div>
  );
}

export function SettingsPanel({ config, onConfigChange }) {
  const [draft, setDraft] = useState(config);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    if (!draft.name.trim()) return setErr("Give your tournament a name.");
    setErr("");
    await onConfigChange(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div>
      {err && <Banner>{err}</Banner>}
      {saved && <Banner kind="success">Settings saved.</Banner>}

      <Field label="Tournament name">
        <TextInput value={draft.name} onChange={(e) => setDraft((c) => ({ ...c, name: e.target.value }))} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Starts">
          <TextInput type="date" value={draft.startDate} onChange={(e) => setDraft((c) => ({ ...c, startDate: e.target.value }))} />
        </Field>
        <Field label="Ends">
          <TextInput type="date" value={draft.endDate} onChange={(e) => setDraft((c) => ({ ...c, endDate: e.target.value }))} />
        </Field>
      </div>
      <Field label="Max points per round">
        <TextInput type="number" min={1} value={draft.maxScorePerRound} onChange={(e) => setDraft((c) => ({ ...c, maxScorePerRound: Number(e.target.value) || 1 }))} />
      </Field>

      <div className="rounded-lg px-3 py-2.5 mb-5" style={{ background: "#E6F7F3", color: "#0F8A6B" }}>
        <div className="font-semibold text-sm">Tournament format</div>
        <div className="text-xs mt-1">3 preliminary matches (2 rounds each) → top 8 qualify → quarter-finals → semi-finals → grand finale</div>
        <div className="text-xs mt-1">Pairing: Fold Method · Conflict avoidance: One-up-One-down</div>
      </div>

      <span className="block text-xs font-semibold tracking-wide uppercase mb-2" style={{ color: "#6B7490" }}>Rounds</span>
      <div className="mb-6"><RoundStructurePreview rounds={draft.rounds} /></div>

      <Btn variant="gold" onClick={save} className="w-full mt-2">Save settings</Btn>
    </div>
  );
}

export function TeamsPanel({ teams, onTeamsChange, scores, onScoresChange, editable }) {
  const [q, setQ] = useState("");
  const filtered = teams.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()) || (t.category || "").toLowerCase().includes(q.toLowerCase()));

  const removeTeam = async (id) => {
    await onTeamsChange(teams.filter((t) => t.id !== id));
    if (onScoresChange) await onScoresChange(scores.filter((s) => s.teamId !== id));
  };

  return (
    <div>
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9098B0" }} />
        <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search teams" className="pl-9" />
      </div>
      {filtered.length === 0 && <EmptyNote>No teams match yet.</EmptyNote>}
      <div className="space-y-2">
        {filtered.map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded-xl border p-3.5" style={{ borderColor: "#DBD8CE", background: "#FFFFFF" }}>
            <div>
              <div className="font-medium text-sm" style={{ color: "#14213D" }}>{t.name}</div>
              <div className="text-xs mt-0.5" style={{ color: "#6B7490" }}>
                {t.category || "No category"} · {t.members || "—"} members · registered by {t.registeredBy || "admin"}
              </div>
            </div>
            {editable && (
              <button onClick={() => removeTeam(t.id)} style={{ color: "#EF6461" }} className="p-2">
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ScoresPanel({ teams, scores, rounds, onScoresChange, editable }) {
  const teamName = (id) => teams.find((t) => t.id === id)?.name || "Unknown team";
  const roundName = (id) => rounds.find((r) => r.id === id)?.name || "Unknown round";

  const remove = async (id) => {
    await onScoresChange(scores.filter((s) => s.id !== id));
  };

  const sorted = [...scores].sort((a, b) => (b.enteredAt || "").localeCompare(a.enteredAt || ""));

  return (
    <div>
      {sorted.length === 0 && <EmptyNote>No scores entered yet.</EmptyNote>}
      <div className="space-y-2">
        {sorted.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-xl border p-3.5" style={{ borderColor: "#DBD8CE", background: "#FFFFFF" }}>
            <div>
              <div className="font-medium text-sm" style={{ color: "#14213D" }}>{teamName(s.teamId)}</div>
              <div className="text-xs mt-0.5" style={{ color: "#6B7490" }}>
                {roundName(s.roundId)} · by {s.judgeName || "—"}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono font-700" style={{ color: "#06AED5" }}>{s.points}</span>
              {editable && (
                <button onClick={() => remove(s.id)} style={{ color: "#EF6461" }} className="p-2">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PairingsPanel({ config, teams, scores, pairings, onPairingsChange }) {
  const [busy, setBusy] = useState(null);
  const top8 = preliminarySeedOrder(teams, config, scores);
  const teamName = (id) => (id ? teams.find((t) => t.id === id)?.name || "Unknown team" : "Bye");

  const hasPairings = (stage, matchLabel) =>
    pairings.some((p) => p.stage === stage && (stage !== "preliminary" || p.matchLabel === matchLabel));

  const sections = [
    {
      stage: "preliminary", matchLabel: "Match 1", label: "Preliminary · Match 1",
      ready: teams.length >= 2,
      note: "Random pairing — no standings exist yet.",
      generate: () => generateMatch1Pairings(teams),
    },
    {
      stage: "preliminary", matchLabel: "Match 2", label: "Preliminary · Match 2",
      ready: hasPairings("preliminary", "Match 1"),
      note: "Paired by cumulative points, avoiding repeat opponents from Match 1.",
      generate: () => generateSwissPairings("Match 2", teams, config, scores, pairings),
    },
    {
      stage: "preliminary", matchLabel: "Match 3", label: "Preliminary · Match 3",
      ready: hasPairings("preliminary", "Match 2"),
      note: "Paired by cumulative points, avoiding repeat opponents from Matches 1–2.",
      generate: () => generateSwissPairings("Match 3", teams, config, scores, pairings),
    },
    {
      stage: "quarter-final", matchLabel: null, label: "Quarter Finals",
      ready: top8.length >= 2,
      note: `Power-protected seeding from the top ${config.qualificationCount || 8} preliminary standings (best seed vs. worst).`,
      generate: () => generateQuarterFinalPairings(teams, config, scores),
    },
    {
      stage: "semi-final", matchLabel: null, label: "Semi Finals",
      ready: hasPairings("quarter-final"),
      note: "The 4 Quarter Final winners, re-seeded by original preliminary rank.",
      generate: () => generateSemiFinalPairings(teams, config, scores, pairings),
    },
    {
      stage: "final", matchLabel: null, label: "Grand Finale",
      ready: hasPairings("semi-final"),
      note: "The 2 Semi Final winners.",
      generate: () => generateFinalPairing(teams, config, scores, pairings),
    },
  ];

  const regenerate = async (sec) => {
    setBusy(sec.label);
    const next = sec.generate();
    const others = pairings.filter((p) => !(p.stage === sec.stage && (sec.stage !== "preliminary" || p.matchLabel === sec.matchLabel)));
    await onPairingsChange([...others, ...next]);
    setBusy(null);
  };

  return (
    <div className="space-y-3">
      {sections.map((sec) => {
        const rows = pairings.filter((p) => p.stage === sec.stage && (sec.stage !== "preliminary" || p.matchLabel === sec.matchLabel));
        return (
          <div key={sec.label} className="rounded-xl border p-4" style={{ borderColor: "#DBD8CE", background: "#FFFFFF" }}>
            <div className="flex items-center justify-between gap-3 mb-1">
              <span className="font-display font-700 text-sm" style={{ color: "#14213D" }}>{sec.label}</span>
              <Btn
                variant="ghost"
                onClick={() => regenerate(sec)}
                disabled={!sec.ready || busy === sec.label}
                className="shrink-0"
              >
                <Shuffle size={14} /> {rows.length ? "Regenerate" : "Generate"}
              </Btn>
            </div>
            <p className="text-[11px] mb-3" style={{ color: "#9098B0" }}>{sec.note}</p>
            {!sec.ready ? (
              <p className="text-xs" style={{ color: "#9098B0" }}>Waiting on the previous stage.</p>
            ) : rows.length === 0 ? (
              <p className="text-xs" style={{ color: "#9098B0" }}>Not generated yet.</p>
            ) : (
              <div className="space-y-1.5">
                {rows.map((p) => {
                  const winner = sec.stage !== "preliminary" ? matchWinner(p, config, scores) : null;
                  return (
                    <div key={p.id} className="flex items-center justify-between text-sm rounded-lg px-2.5 py-1.5" style={{ background: "#F7F5F0" }}>
                      <span style={{ color: winner === p.teamAId ? "#0F8A6B" : "#14213D", fontWeight: winner === p.teamAId ? 600 : 400 }}>
                        {teamName(p.teamAId)}
                      </span>
                      <span className="text-xs" style={{ color: "#9098B0" }}>vs</span>
                      <span style={{ color: winner === p.teamBId ? "#0F8A6B" : "#14213D", fontWeight: winner === p.teamBId ? 600 : 400 }}>
                        {teamName(p.teamBId)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function EmptyNote({ children }) {
  return (
    <div className="rounded-xl border border-dashed p-6 text-center text-sm" style={{ borderColor: "#DBD8CE", color: "#9098B0" }}>
      {children}
    </div>
  );
}

/* ---------------------------------------------------------
   JUDGE DASHBOARD
--------------------------------------------------------- */

export function JudgeDashboard({ config, teams, scores, judgeName, onTeamsChange, onScoresChange, onRefresh, onLogout }) {
  const [tab, setTab] = useState("register");
  const status = todayStatus(config);

  return (
    <div>
      <DashHeader title={config.name} subtitle={`Judge · ${judgeName}`} status={status} onLogout={onLogout} onRefresh={onRefresh} />
      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { key: "register", label: "Register team", icon: <Plus size={15} /> },
          { key: "score", label: "Enter scores", icon: <Trophy size={15} /> },
          { key: "teams", label: "Teams", icon: <Users size={15} /> },
        ]}
      />
      {tab === "register" && (
        <RegisterTeamForm teams={teams} judgeName={judgeName} onTeamsChange={onTeamsChange} />
      )}
      {tab === "score" && (
        <EnterScoreForm config={config} teams={teams} scores={scores} judgeName={judgeName} onScoresChange={onScoresChange} />
      )}
      {tab === "teams" && (
        <TeamsPanel teams={teams} onTeamsChange={onTeamsChange} editable={false} />
      )}
    </div>
  );
}

export function RegisterTeamForm({ teams, judgeName, onTeamsChange }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [members, setMembers] = useState("");
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setErr("Enter the team's name.");
    if (teams.some((t) => t.name.toLowerCase() === name.trim().toLowerCase())) return setErr("A team with that name already exists.");
    setErr("");
    const team = {
      id: uid(),
      name: name.trim(),
      category: category.trim(),
      members: members.trim(),
      registeredBy: judgeName,
      createdAt: new Date().toISOString(),
    };
    await onTeamsChange([...teams, team]);
    setName(""); setCategory(""); setMembers("");
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <form onSubmit={submit}>
      {err && <Banner>{err}</Banner>}
      {saved && <Banner kind="success">Team registered.</Banner>}
      <Field label="Team name">
        <TextInput autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. The Quiz Wizards" />
      </Field>
      <Field label="Category" hint="Optional — e.g. an age group or school">
        <TextInput value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Ages 10–12" />
      </Field>
      <Field label="Number of members" hint="Optional">
        <TextInput value={members} onChange={(e) => setMembers(e.target.value)} placeholder="e.g. 4" />
      </Field>
      <Btn variant="accent" type="submit" className="w-full"><Plus size={16} /> Register team</Btn>
    </form>
  );
}

export function EnterScoreForm({ config, teams, scores, judgeName, onScoresChange }) {
  const [teamId, setTeamId] = useState("");
  const [roundId, setRoundId] = useState(config.rounds[0]?.id || "");
  const [points, setPoints] = useState("");
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);

  const existing = scores.find((s) => s.teamId === teamId && s.roundId === roundId);

  const submit = async (e) => {
    e.preventDefault();
    if (!teamId) return setErr("Choose a team.");
    if (!roundId) return setErr("Choose a round.");
    const val = Number(points);
    if (Number.isNaN(val) || val < 0 || val > config.maxScorePerRound) {
      return setErr(`Points must be between 0 and ${config.maxScorePerRound}.`);
    }
    setErr("");
    const entry = {
      id: existing?.id || uid(),
      teamId, roundId, points: val,
      judgeName,
      enteredAt: new Date().toISOString(),
    };
    const next = existing
      ? scores.map((s) => (s.id === existing.id ? entry : s))
      : [...scores, entry];
    await onScoresChange(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const recent = scores
    .filter((s) => s.judgeName === judgeName)
    .sort((a, b) => (b.enteredAt || "").localeCompare(a.enteredAt || ""))
    .slice(0, 5);

  return (
    <div>
      {teams.length === 0 ? (
        <EmptyNote>Register a team first, then come back to enter scores.</EmptyNote>
      ) : (
        <form onSubmit={submit}>
          {err && <Banner>{err}</Banner>}
          {saved && <Banner kind="success">Score saved.</Banner>}
          <Field label="Team">
            <select
              value={teamId}
              onChange={(e) => { setTeamId(e.target.value); setPoints(""); }}
              className={inputBase}
              style={{ borderColor: "#DBD8CE", background: "#FFFFFF", color: "#14213D" }}
            >
              <option value="">Select a team…</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Round">
            <select
              value={roundId}
              onChange={(e) => { setRoundId(e.target.value); setPoints(""); }}
              className={inputBase}
              style={{ borderColor: "#DBD8CE", background: "#FFFFFF", color: "#14213D" }}
            >
              {groupRoundsForDisplay(config.rounds).map((g) => (
                <optgroup key={g.key} label={g.label}>
                  {g.items.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label={`Points (0–${config.maxScorePerRound})`} hint={existing ? "Already scored — submitting will update it." : undefined}>
            <TextInput type="number" min={0} max={config.maxScorePerRound} value={points} onChange={(e) => setPoints(e.target.value)} placeholder="0" />
          </Field>
          <Btn variant="accent" type="submit" className="w-full">
            {existing ? "Update score" : "Save score"}
          </Btn>
        </form>
      )}

      {recent.length > 0 && (
        <div className="mt-8">
          <span className="block text-xs font-semibold tracking-wide uppercase mb-2" style={{ color: "#6B7490" }}>Your recent entries</span>
          <div className="space-y-2">
            {recent.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm rounded-lg px-3 py-2" style={{ background: "#FFFFFF", border: "1px solid #DBD8CE" }}>
                <span style={{ color: "#14213D" }}>
                  {teams.find((t) => t.id === s.teamId)?.name || "—"} · {config.rounds.find((r) => r.id === s.roundId)?.name || "—"}
                </span>
                <span className="font-mono font-700" style={{ color: "#06AED5" }}>{s.points}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   STANDINGS (PUBLIC)
--------------------------------------------------------- */

export const MEDAL = ["#FFB627", "#C7CDD9", "#C97B4A"];

export function Standings({ config, teams, scores, pairings, onRefresh, onBack }) {
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [copied, setCopied] = useState(false);
  const intervalRef = useRef(null);
  const status = todayStatus(config);

  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      await onRefresh();
      setLastUpdated(new Date());
    }, 6000);
    return () => clearInterval(intervalRef.current);
  }, [onRefresh]);

  const preliminaryRounds = config.rounds.filter((round) => round.stage === "preliminary");
  const allStandings = computeStandings(teams, scores, preliminaryRounds);
  const standings = allStandings.filter((t) =>
    t.name.toLowerCase().includes(q.toLowerCase()) || (t.category || "").toLowerCase().includes(q.toLowerCase())
  );

  const copyStandings = () => {
    const text = standings.map((t, i) => `${i + 1}. ${t.name} — ${t.total}`).join("\n");
    navigator.clipboard?.writeText(`${config.name} — Standings\n\n${text}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <button onClick={onBack} className="text-sm mb-6 inline-flex items-center gap-1" style={{ color: "#6B7490" }}>← Back</button>

      <div className="mb-6">
        <div className="flex items-center justify-between">
          <LiveDot status={status} />
          <span className="font-mono text-[10px]" style={{ color: "#9098B0" }}>
            updated {lastUpdated.toLocaleTimeString()}
          </span>
        </div>
        <h1 className="font-display font-700 text-2xl mt-1" style={{ color: "#14213D" }}>{config.name}</h1>
      </div>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9098B0" }} />
        <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by team or category" className="pl-9" />
      </div>

      <BracketPanel config={config} teams={teams} scores={scores} pairings={pairings} />

      {standings.length === 0 ? (
        <EmptyNote>No teams registered yet — check back once judges start registering teams.</EmptyNote>
      ) : (
        <div className="space-y-2">
          {standings.map((t, i) => (
            <div key={t.id} className="rounded-xl border overflow-hidden" style={{ borderColor: "#DBD8CE", background: "#FFFFFF" }}>
              <button
                className="w-full flex items-center gap-3 p-3.5 text-left"
                onClick={() => setExpanded(expanded === t.id ? null : t.id)}
              >
                <span
                  className="font-mono font-700 text-sm w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: i < 3 ? MEDAL[i] : "#F0EEE7",
                    color: i < 3 ? "#14213D" : "#6B7490",
                  }}
                >
                  {i + 1}
                </span>
                <span className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate" style={{ color: "#14213D" }}>{t.name}</div>
                  {t.category && <div className="text-xs" style={{ color: "#6B7490" }}>{t.category}</div>}
                </span>
                <span className="font-mono font-700 text-lg" style={{ color: "#06AED5" }}>{t.total}</span>
                {expanded === t.id ? <ChevronUp size={16} color="#9098B0" /> : <ChevronDown size={16} color="#9098B0" />}
              </button>
              {expanded === t.id && (
                <div className="px-3.5 pb-3.5 pt-1 space-y-2">
                  {groupRoundsForDisplay(config.rounds).map((g) => (
                    <div key={g.key}>
                      <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#9098B0" }}>{g.label}</div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {g.items.map((r) => (
                          <div key={r.id} className="rounded-lg px-2.5 py-2" style={{ background: "#F7F5F0" }}>
                            <div className="text-[10px] uppercase tracking-wide" style={{ color: "#9098B0" }}>{r.name}</div>
                            <div className="font-mono font-600 text-sm" style={{ color: "#14213D" }}>
                              {t.byRound[r.id] ?? "—"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {standings.length > 0 && (
        <Btn variant="ghost" onClick={copyStandings} className="w-full mt-4">
          {copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy standings</>}
        </Btn>
      )}
    </div>
  );
}

export function BracketPanel({ config, teams, scores, pairings }) {
  const qualifiedCount = config.qualificationCount || 8;
  const teamName = (id) => (id ? teams.find((t) => t.id === id)?.name || "Unknown team" : "Bye");

  const stageRows = (stage) =>
    pairings
      .filter((p) => p.stage === stage)
      .map((p) => ({ ...p, winnerId: matchWinner(p, config, scores) }));

  const qf = stageRows("quarter-final");
  const sf = stageRows("semi-final");
  const final = stageRows("final");

  if (qf.length === 0) {
    return (
      <section className="rounded-xl border p-4 mb-4" style={{ borderColor: "#DBD8CE", background: "#FFFFFF" }}>
        <div className="font-display font-700 text-lg mb-1" style={{ color: "#14213D" }}>Road to the final</div>
        <p className="text-sm" style={{ color: "#6B7490" }}>
          Quarter Final pairings haven't been drawn yet. The top {qualifiedCount} teams after all preliminary matches will qualify.
        </p>
      </section>
    );
  }

  const StageBlock = ({ title, rows }) => (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#06AED5" }}>{title}</div>
      {rows.map((p) => (
        <div key={p.id} className="flex items-center gap-2 text-sm">
          <span
            className="flex-1 rounded-lg px-2.5 py-2"
            style={{
              background: p.winnerId === p.teamAId ? "#E6F7F3" : "#F7F5F0",
              color: "#14213D",
              fontWeight: p.winnerId === p.teamAId ? 600 : 400,
            }}
          >
            {teamName(p.teamAId)}
          </span>
          <span className="text-xs" style={{ color: "#9098B0" }}>vs</span>
          <span
            className="flex-1 rounded-lg px-2.5 py-2 text-right"
            style={{
              background: p.winnerId === p.teamBId ? "#E6F7F3" : "#F7F5F0",
              color: "#14213D",
              fontWeight: p.winnerId === p.teamBId ? 600 : 400,
            }}
          >
            {teamName(p.teamBId)}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <section className="rounded-xl border p-4 mb-4 space-y-4" style={{ borderColor: "#DBD8CE", background: "#FFFFFF" }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-display font-700 text-lg" style={{ color: "#14213D" }}>Road to the final</div>
          <p className="text-xs mt-1" style={{ color: "#6B7490" }}>
            Top {qualifiedCount} after preliminaries qualify. Power-protected seeding throughout the knockout stages.
          </p>
        </div>
        <span className="font-mono text-[10px] tracking-widest" style={{ color: "#06AED5" }}>BRACKET</span>
      </div>

      <StageBlock title="Quarter Finals" rows={qf} />
      {sf.length > 0 && <StageBlock title="Semi Finals" rows={sf} />}
      {sf.length === 0 && (
        <p className="text-xs" style={{ color: "#9098B0" }}>Semi Final pairings will appear once all Quarter Finals have a winner.</p>
      )}
      {final.length > 0 && <StageBlock title="Grand Finale" rows={final} />}
      {sf.length > 0 && final.length === 0 && (
        <p className="text-xs" style={{ color: "#9098B0" }}>The Final pairing will appear once both Semi Finals have a winner.</p>
      )}
    </section>
  );
}
