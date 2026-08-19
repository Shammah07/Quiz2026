"use strict";
"use client";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MEDAL = exports.inputBase = exports.defaultConfig = exports.STAGE_LABELS = exports.uid = exports.STORAGE = exports.FONTS = void 0;
exports.useStorage = useStorage;
exports.groupRoundsForDisplay = groupRoundsForDisplay;
exports.normalizeConfig = normalizeConfig;
exports.todayStatus = todayStatus;
exports.computeStandings = computeStandings;
exports.computeFoldPairings = computeFoldPairings;
exports.stageRoundsFor = stageRoundsFor;
exports.teamPointsIn = teamPointsIn;
exports.matchWinner = matchWinner;
exports.generateMatch1Pairings = generateMatch1Pairings;
exports.generateSwissPairings = generateSwissPairings;
exports.generateFoldPairingsForStage = generateFoldPairingsForStage;
exports.preliminarySeedOrder = preliminarySeedOrder;
exports.generateQuarterFinalPairings = generateQuarterFinalPairings;
exports.generateSemiFinalPairings = generateSemiFinalPairings;
exports.generateFinalPairing = generateFinalPairing;
exports.LiveDot = LiveDot;
exports.Field = Field;
exports.TextInput = TextInput;
exports.Btn = Btn;
exports.Banner = Banner;
exports.default = App;
exports.Shell = Shell;
exports.Landing = Landing;
exports.ChevronRight = ChevronRight;
exports.formatDateRange = formatDateRange;
exports.AdminGate = AdminGate;
exports.RoundStructurePreview = RoundStructurePreview;
exports.GateShell = GateShell;
exports.AdminSetup = AdminSetup;
exports.JudgeGate = JudgeGate;
exports.Tabs = Tabs;
exports.StatCard = StatCard;
exports.AdminDashboard = AdminDashboard;
exports.DashHeader = DashHeader;
exports.SettingsPanel = SettingsPanel;
exports.TeamsPanel = TeamsPanel;
exports.ScoresPanel = ScoresPanel;
exports.PairingsPanel = PairingsPanel;
exports.EmptyNote = EmptyNote;
exports.JudgeDashboard = JudgeDashboard;
exports.RegisterTeamForm = RegisterTeamForm;
exports.EnterScoreForm = EnterScoreForm;
exports.Standings = Standings;
exports.BracketPanel = BracketPanel;
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const supabaseClient_1 = require("./supabaseClient");
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
exports.FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap');
`;
exports.STORAGE = {
    config: "config",
    teams: "teams",
    scores: "scores",
    pairings: "pairings",
};
function useStorage(onRemoteChange) {
    const get = (0, react_1.useCallback)(async (key) => {
        const { data, error } = await supabaseClient_1.supabase
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
    const set = (0, react_1.useCallback)(async (key, value) => {
        const { error } = await supabaseClient_1.supabase
            .from("tournament_state")
            .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
        if (error) {
            console.error("Storage write failed:", error.message);
            return false;
        }
        return true;
    }, []);
    const resetAll = (0, react_1.useCallback)(async () => {
        const { error } = await supabaseClient_1.supabase
            .from("tournament_state")
            .delete()
            .in("key", [exports.STORAGE.config, exports.STORAGE.teams, exports.STORAGE.scores, exports.STORAGE.pairings]);
        if (error) {
            console.error("Reset failed:", error.message);
            return false;
        }
        return true;
    }, []);
    // Supabase Realtime Subscription for instantaneous sync between Judges & Admins
    (0, react_1.useEffect)(() => {
        const channel = supabaseClient_1.supabase
            .channel("public:tournament_state")
            .on("postgres_changes", { event: "*", schema: "public", table: "tournament_state" }, () => {
            if (onRemoteChange) {
                onRemoteChange();
            }
        })
            .subscribe();
        return () => {
            supabaseClient_1.supabase.removeChannel(channel);
        };
    }, [onRemoteChange]);
    return { get, set, resetAll };
}
const uid = () => Math.random().toString(36).slice(2, 10);
exports.uid = uid;
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
exports.STAGE_LABELS = {
    preliminary: "Preliminary Rounds",
    "quarter-final": "Quarter Finals",
    "semi-final": "Semi Finals",
    final: "Grand Finale",
};
function buildRounds(existingRounds = []) {
    return ROUND_TEMPLATE.map((tpl) => {
        const existing = existingRounds.find((r) => r.stage === tpl.stage && r.match === tpl.match && r.name === tpl.name);
        return { id: existing?.id || (0, exports.uid)(), ...tpl };
    });
}
function groupRoundsForDisplay(rounds) {
    const groups = [];
    const byKey = new Map();
    rounds.forEach((r) => {
        const key = `${r.stage}::${r.match || ""}`;
        if (!byKey.has(key)) {
            const label = r.match ? `${exports.STAGE_LABELS[r.stage]} · ${r.match}` : exports.STAGE_LABELS[r.stage];
            const group = { key, label, items: [] };
            byKey.set(key, group);
            groups.push(group);
        }
        byKey.get(key).items.push(r);
    });
    return groups;
}
const defaultConfig = () => ({
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
exports.defaultConfig = defaultConfig;
function normalizeConfig(config) {
    if (!config)
        return config;
    return {
        ...config,
        qualificationCount: config.qualificationCount || 8,
        conflictAvoidance: config.conflictAvoidance || "one-up-one-down",
        pairingMethod: config.pairingMethod || "fold",
        rounds: buildRounds(config.rounds),
    };
}
function todayStatus(cfg) {
    if (!cfg)
        return "unknown";
    const today = new Date().toISOString().slice(0, 10);
    if (today < cfg.startDate)
        return "upcoming";
    if (today > cfg.endDate)
        return "ended";
    return "live";
}
function computeStandings(teams, scores, rounds) {
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
function computeFoldPairings(teams) {
    const midpoint = Math.ceil(teams.length / 2);
    const upper = teams.slice(0, midpoint);
    const lower = teams.slice(midpoint).reverse();
    return upper.map((team, index) => ({
        number: index + 1,
        top: team,
        bottom: lower[index] || null,
    }));
}
const PRELIM_MATCH_ORDER = ["Match 1", "Match 2", "Match 3"];
function stageRoundsFor(config, stage, matchLabel) {
    if (stage === "preliminary") {
        return config.rounds.filter((r) => r.stage === "preliminary" && r.match === matchLabel);
    }
    return config.rounds.filter((r) => r.stage === stage);
}
function teamPointsIn(teamId, rounds, scores) {
    const ids = new Set(rounds.map((r) => r.id));
    return scores
        .filter((s) => s.teamId === teamId && ids.has(s.roundId))
        .reduce((sum, s) => sum + s.points, 0);
}
function matchWinner(pairing, config, scores) {
    if (!pairing.teamAId || !pairing.teamBId)
        return pairing.teamAId || pairing.teamBId || null;
    const rounds = stageRoundsFor(config, pairing.stage, pairing.matchLabel);
    const a = teamPointsIn(pairing.teamAId, rounds, scores);
    const b = teamPointsIn(pairing.teamBId, rounds, scores);
    if (a === b)
        return null;
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
function generateMatch1Pairings(teams) {
    const shuffled = shuffle(teams);
    const pairings = [];
    for (let i = 0; i < shuffled.length; i += 2) {
        pairings.push({
            id: (0, exports.uid)(),
            stage: "preliminary",
            matchLabel: "Match 1",
            teamAId: shuffled[i].id,
            teamBId: shuffled[i + 1] ? shuffled[i + 1].id : null,
        });
    }
    return pairings;
}
function generateSwissPairings(matchLabel, teams, config, scores, existingPairings) {
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
        if (used.has(teamA.id))
            continue;
        used.add(teamA.id);
        let partner = standings.slice(i + 1).find((c) => !used.has(c.id) && !priorOpponents.get(teamA.id)?.has(c.id));
        if (!partner)
            partner = standings.slice(i + 1).find((c) => !used.has(c.id)) || null;
        if (partner)
            used.add(partner.id);
        pairings.push({
            id: (0, exports.uid)(),
            stage: "preliminary",
            matchLabel,
            teamAId: teamA.id,
            teamBId: partner ? partner.id : null,
        });
    }
    return pairings;
}
function generateFoldPairingsForStage(seededTeams, stage, labels) {
    const midpoint = Math.ceil(seededTeams.length / 2);
    const upper = seededTeams.slice(0, midpoint);
    const lower = seededTeams.slice(midpoint).reverse();
    return upper.map((team, index) => ({
        id: (0, exports.uid)(),
        stage,
        matchLabel: labels[index] || `${stage} ${index + 1}`,
        teamAId: team.id,
        teamBId: lower[index] ? lower[index].id : null,
    }));
}
function preliminarySeedOrder(teams, config, scores) {
    const prelimRounds = config.rounds.filter((r) => r.stage === "preliminary");
    return computeStandings(teams, scores, prelimRounds).slice(0, config.qualificationCount || 8);
}
function generateQuarterFinalPairings(teams, config, scores) {
    const top = preliminarySeedOrder(teams, config, scores);
    return generateFoldPairingsForStage(top, "quarter-final", ["QF 1", "QF 2", "QF 3", "QF 4"]);
}
function advanceWinners(fromStage, toStage, labels, teams, config, scores, pairings) {
    const seedOrder = preliminarySeedOrder(teams, config, scores);
    const winnerIds = pairings
        .filter((p) => p.stage === fromStage)
        .map((p) => matchWinner(p, config, scores))
        .filter(Boolean);
    const advancing = seedOrder.filter((t) => winnerIds.includes(t.id));
    return generateFoldPairingsForStage(advancing, toStage, labels);
}
function generateSemiFinalPairings(teams, config, scores, pairings) {
    return advanceWinners("quarter-final", "semi-final", ["SF 1", "SF 2"], teams, config, scores, pairings);
}
function generateFinalPairing(teams, config, scores, pairings) {
    return advanceWinners("semi-final", "final", ["Final"], teams, config, scores, pairings);
}
/* ---------------------------------------------------------
   SHARED UI ATOMS
--------------------------------------------------------- */
function LiveDot({ status }) {
    const label = status === "live" ? "LIVE" : status === "upcoming" ? "UPCOMING" : "ENDED";
    const color = status === "live" ? "#06AED5" : status === "upcoming" ? "#FFB627" : "#6B7490";
    return className = "inline-flex items-center gap-1.5 font-mono text-[11px] tracking-widest";
    style = {};
    {
        color;
    }
}
 >
    className;
"relative flex h-2 w-2" >
    { status } === "live" && className;
"animate-ping absolute inline-flex h-full w-full rounded-full opacity-60";
style = {};
{
    backgroundColor: color;
}
/>;
className;
"relative inline-flex rounded-full h-2 w-2";
style = {};
{
    backgroundColor: color;
}
/>
    < /span>;
{
    label;
}
/span>;
;
function Field({ label, children, hint }) {
    return className = "block mb-4" >
        className;
    "block text-xs font-semibold tracking-wide uppercase mb-1.5";
    style = {};
    {
        color: "#6B7490";
    }
}
 >
    { label }
    < /span>;
{
    children;
}
{
    hint && className;
    "block text-[11px] mt-1";
    style = {};
    {
        color: "#9098B0";
    }
}
 > { hint } < /span>;
/label>;
;
exports.inputBase = "w-full rounded-lg border px-3 py-2.5 text-[15px] outline-none transition-colors focus:ring-2";
function TextInput(props) {
    return { ...props };
    className = { inputBase: exports.inputBase } + " " + (props.className || "");
}
style = {};
{
    borderColor: "#DBD8CE", background;
    "#FFFFFF", color;
    "#14213D", ;
    props.style;
}
onFocus = {}(e);
(e.target.style.borderColor = "#06AED5");
onBlur = {}(e);
(e.target.style.borderColor = "#DBD8CE");
/>;
;
function Btn({ children, variant = "primary", className = "", ...props }) {
    const styles = {
        primary: { background: "#14213D", color: "#F7F5F0" },
        accent: { background: "#06AED5", color: "#0A1830" },
        gold: { background: "#FFB627", color: "#14213D" },
        ghost: { background: "transparent", color: "#14213D", border: "1px solid #DBD8CE" },
        danger: { background: "#EF6461", color: "#FFFFFF" },
    };
    return { ...props };
    style = { styles, [variant]:  };
    className = {
        "font-display font-semibold text-sm px-4 py-2.5 rounded-lg transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 ": +className
    }
        >
            { children }
        < /button>;
    ;
}
function Banner({ kind = "error", children }) {
    const map = {
        error: { bg: "#FDECEB", color: "#C1443E", icon: lucide_react_1.AlertCircle },
        success: { bg: "#E6F7F3", color: "#0F8A6B", icon: lucide_react_1.CheckCircle2 },
    };
    const s = map[kind];
    const Icon = s.icon;
    return className = "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm mb-4";
    style = {};
    {
        background: s.bg, color;
        s.color;
    }
}
 >
    size;
{
    16;
}
className = "shrink-0" /  >
    { children } < /span>
    < /div>;
;
/* ---------------------------------------------------------
   APP SHELL
--------------------------------------------------------- */
function App() {
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [config, setConfig] = (0, react_1.useState)(null);
    const [teams, setTeams] = (0, react_1.useState)([]);
    const [scores, setScores] = (0, react_1.useState)([]);
    const [pairings, setPairings] = (0, react_1.useState)([]);
    const [view, setView] = (0, react_1.useState)("landing");
    const [adminAuthed, setAdminAuthed] = (0, react_1.useState)(false);
    const [judgeSession, setJudgeSession] = (0, react_1.useState)(null);
    const loadAll = (0, react_1.useCallback)(async () => {
        const { get } = storageRef.current;
        const [c, t, s, p] = await Promise.all([get(exports.STORAGE.config), get(exports.STORAGE.teams), get(exports.STORAGE.scores), get(exports.STORAGE.pairings)]);
        const normalizedConfig = normalizeConfig(c);
        setConfig(normalizedConfig);
        setTeams(t || []);
        setScores(s || []);
        setPairings(p || []);
        return { c: normalizedConfig, t: t || [], s: s || [], p: p || [] };
    }, []);
    const handleRemoteChange = (0, react_1.useCallback)(() => {
        loadAll();
    }, [loadAll]);
    const { get, set, resetAll } = useStorage(handleRemoteChange);
    const storageRef = (0, react_1.useRef)({ get, set, resetAll });
    (0, react_1.useEffect)(() => {
        storageRef.current = { get, set, resetAll };
    }, [get, set, resetAll]);
    (0, react_1.useEffect)(() => {
        (async () => {
            const { c } = await loadAll();
            setView(c && c.setupDone ? "landing" : "gate-setup");
            setLoading(false);
        })();
    }, [loadAll]);
    if (loading) {
        return className = "flex flex-col items-center justify-center py-24 gap-3";
        style = {};
        {
            color: "#6B7490";
        }
    }
     >
        className;
    "animate-spin";
    size = { 28:  } /  >
        className;
    "font-mono text-xs tracking-widest" > LOADING;
    TOURNAMENT < /span>
        < /div>
        < /Shell>;
    ;
}
return ({ view } === "gate-setup" && onCancel) = {}();
setView("landing");
hint = "No tournament has been set up yet. Sign in with your admin account to start.";
onSubmit = {}();
setView("setup");
/>;
{
    view === "setup" && onDone;
    {
        async (cfg) => {
            const normalizedConfig = normalizeConfig(cfg);
            await set(exports.STORAGE.config, normalizedConfig);
            setConfig(normalizedConfig);
            setAdminAuthed(true);
            setView("admin");
        };
    }
    />;
}
{
    view === "landing" && config && config;
    {
        config;
    }
    onStandings = {}();
    setView("standings");
}
onJudge = {}();
setView("judge-login");
onAdmin = {}();
setView(adminAuthed ? "admin" : "admin-login");
/>;
{
    view === "admin-login" && onCancel;
    {
        () => setView("landing");
    }
    onSubmit = {}();
    {
        setAdminAuthed(true);
        setView("admin");
    }
}
/>;
{
    view === "admin" && config && config;
    {
        config;
    }
    teams = { teams };
    scores = { scores };
    pairings = { pairings };
    onConfigChange = { async(next) { }, };
    {
        const normalizedConfig = normalizeConfig(next);
        await set(exports.STORAGE.config, normalizedConfig);
        setConfig(normalizedConfig);
    }
}
onTeamsChange = { async(next) { }, };
{
    await set(exports.STORAGE.teams, next);
    setTeams(next);
}
onScoresChange = { async(next) { }, };
{
    await set(exports.STORAGE.scores, next);
    setScores(next);
}
onPairingsChange = { async(next) { }, };
{
    await set(exports.STORAGE.pairings, next);
    setPairings(next);
}
onResetTournament = { async() { }, };
{
    await resetAll();
    setConfig(null);
    setTeams([]);
    setScores([]);
    setPairings([]);
    setView("gate-setup");
}
onRefresh = { loadAll };
onLogout = {}();
{
    supabaseClient_1.supabase.auth.signOut();
    setAdminAuthed(false);
    setView("landing");
}
/>;
{
    view === "judge-login" && onCancel;
    {
        () => setView("landing");
    }
    onSubmit = {}(name);
    {
        setJudgeSession({ name });
        setView("judge");
    }
}
/>;
{
    view === "judge" && config && judgeSession && config;
    {
        config;
    }
    teams = { teams };
    scores = { scores };
    judgeName = { judgeSession, : .name };
    getLatestTeams = { async() { }, };
    {
        const latest = await get(exports.STORAGE.teams);
        return latest || [];
    }
}
onTeamsChange = { async(next) { }, };
{
    await set(exports.STORAGE.teams, next);
    setTeams(next);
}
onScoresChange = { async(next) { }, };
{
    await set(exports.STORAGE.scores, next);
    setScores(next);
}
onRefresh = { loadAll };
onLogout = {}();
{
    supabaseClient_1.supabase.auth.signOut();
    setJudgeSession(null);
    setView("landing");
}
/>;
{
    view === "standings" && config && config;
    {
        config;
    }
    teams = { teams };
    scores = { scores };
    pairings = { pairings };
    onRefresh = { loadAll };
    onBack = {}();
    setView("landing");
}
/>;
/Shell>;
;
function Shell({ children }) {
    return style = {};
    {
        background: "#F7F5F0", minHeight;
        "100%";
    }
}
className = "w-full" >
    className;
"max-w-3xl mx-auto px-4 py-8 sm:py-12" > { children } < /div>
    < /div>;
;
/* ---------------------------------------------------------
   LANDING
--------------------------------------------------------- */
function Landing({ config, onStandings, onJudge, onAdmin }) {
    const status = todayStatus(config);
    return className = "mb-10 relative" >
        onClick;
    {
        onAdmin;
    }
    title = "Admin";
    className = "absolute right-0 top-0 p-2 rounded-full transition-colors";
    style = {};
    {
        color: "#6B7490";
    }
}
    >
        size;
{
    18;
}
/>
    < /button>
    < div;
className = "mb-1" >
    status;
{
    status;
}
/>
    < /div>
    < h1;
className = "font-display font-700 text-3xl sm:text-4xl leading-tight";
style = {};
{
    color: "#14213D";
}
 >
    { config, : .name }
    < /h1>
    < p;
className = "font-mono text-xs mt-2";
style = {};
{
    color: "#6B7490";
}
 >
    { formatDateRange(config) { }, : .startDate, config, : .endDate, }
    < /p>
    < /header>
    < button;
onClick = { onStandings };
className = "w-full text-left rounded-2xl p-6 sm:p-8 mb-4 transition-transform active:scale-[0.99] group";
style = {};
{
    background: "#14213D";
}
    >
        className;
"flex items-start justify-between" >
    className;
"inline-flex items-center gap-1.5 font-mono text-[11px] tracking-widest mb-3";
style = {};
{
    color: "#FFB627";
}
 >
    size;
{
    14;
}
/> LEADERBOARD
    < /span>
    < h2;
className = "font-display font-700 text-2xl";
style = {};
{
    color: "#F7F5F0";
}
 >
    See;
standings
    < /h2>
    < p;
className = "text-sm mt-1";
style = {};
{
    color: "#9098B0";
}
 >
    Live;
scores, open;
to;
everyone;
no;
sign -  in needed.
    < /p>
    < /div>
    < ChevronRight /  >
    /div>
    < /button>
    < button;
onClick = { onJudge };
className = "w-full text-left rounded-2xl p-6 mb-4 border transition-transform active:scale-[0.99]";
style = {};
{
    borderColor: "#DBD8CE", background;
    "#FFFFFF";
}
    >
        className;
"flex items-start justify-between" >
    className;
"inline-flex items-center gap-1.5 font-mono text-[11px] tracking-widest mb-3";
style = {};
{
    color: "#06AED5";
}
 >
    size;
{
    14;
}
/> JUDGE PORTAL
    < /span>
    < h2;
className = "font-display font-700 text-xl";
style = {};
{
    color: "#14213D";
}
 >
    Register;
teams & amp;
enter;
scores
    < /h2>
    < p;
className = "text-sm mt-1";
style = {};
{
    color: "#6B7490";
}
 >
    Requires;
your;
judge;
account.
    < /p>
    < /div>
    < ChevronRight;
color = "#14213D" /  >
    /div>
    < /button>
    < /div>;
;
function ChevronRight({ color = "#F7F5F0" }) {
    return width = "20";
    height = "20";
    viewBox = "0 0 24 24";
    fill = "none";
    stroke = { color };
    strokeWidth = "2";
    className = "shrink-0 mt-1" >
        d;
    "M9 6l6 6-6 6";
    strokeLinecap = "round";
    strokeLinejoin = "round" /  >
        /svg>;
    ;
}
function formatDateRange(start, end) {
    const opts = { month: "short", day: "numeric" };
    try {
        const s = new Date(start + "T00:00:00");
        const e = new Date(end + "T00:00:00");
        return `${s.toLocaleDateString(undefined, opts)} – ${e.toLocaleDateString(undefined, { ...opts, year: "numeric" })}`;
    }
    catch {
        return `${start} – ${end}`;
    }
}
/* ---------------------------------------------------------
   ADMIN GATE + SETUP
--------------------------------------------------------- */
function AdminGate({ onSubmit, onCancel, hint }) {
    const [email, setEmail] = (0, react_1.useState)("");
    const [password, setPassword] = (0, react_1.useState)("");
    const [err, setErr] = (0, react_1.useState)("");
    const [loading, setLoading] = (0, react_1.useState)(false);
    const submit = async (e) => {
        e.preventDefault();
        setErr("");
        setLoading(true);
        const { data, error } = await supabaseClient_1.supabase.auth.signInWithPassword({ email, password });
        if (error) {
            setLoading(false);
            setErr("Sign-in failed — check your email and password.");
            return;
        }
        const { data: profile } = await supabaseClient_1.supabase
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .single();
        setLoading(false);
        if (profile?.role !== "admin") {
            await supabaseClient_1.supabase.auth.signOut();
            setErr("This account isn't set up as an admin.");
            return;
        }
        onSubmit();
    };
    return icon = {} < lucide_react_1.Shield;
    size = { 20:  } /  > ;
}
title = "Admin access";
onCancel = { onCancel } >
    { err } && { err } < /Banner>;
{
    hint && className;
    "text-sm mb-4";
    style = {};
    {
        color: "#6B7490";
    }
}
 > { hint } < /p>;
onSubmit;
{
    submit;
}
 >
    label;
"Email" >
    type;
"email";
autoFocus;
value = { email };
onChange = {}(e);
setEmail(e.target.value);
placeholder = "you@example.com" /  >
    /Field>
    < Field;
label = "Password" >
    type;
"password";
value = { password };
onChange = {}(e);
setPassword(e.target.value);
placeholder = "Your password" /  >
    /Field>
    < Btn;
variant = "primary";
type = "submit";
className = "w-full";
disabled = { loading } >
    { loading, "Signing in…": "Sign in" }
    < /Btn>
    < /form>
    < /GateShell>;
;
function RoundStructurePreview({ rounds }) {
    const groups = groupRoundsForDisplay(rounds);
    return className = "space-y-2.5" >
        { groups, : .map((g) => key = { g, : .key }, className = "rounded-lg border px-3 py-2.5", style = {}, { borderColor: "#DBD8CE", background: "#F7F5F0" }) } >
        className;
    "text-[11px] font-semibold uppercase tracking-wide mb-1.5";
    style = {};
    {
        color: "#06AED5";
    }
}
 >
    { g, : .label }
    < /div>
    < ul;
className = "space-y-0.5" >
    { g, : .items.map((r) => key = { r, : .id }, className = "text-sm", style = {}, { color: "#14213D" }) } > { r, : .name } < /li>;
/ul>
    < /div>;
/div>;
;
function GateShell({ icon, title, children, onCancel }) {
    return className = "max-w-sm mx-auto mt-8" >
        onClick;
    {
        onCancel;
    }
    className = "text-sm mb-6 inline-flex items-center gap-1";
    style = {};
    {
        color: "#6B7490";
    }
}
 >
;
Back
    < /button>
    < div;
className = "rounded-2xl p-6 border";
style = {};
{
    borderColor: "#DBD8CE", background;
    "#FFFFFF";
}
 >
    className;
"flex items-center gap-2 mb-4";
style = {};
{
    color: "#14213D";
}
 >
    { icon }
    < h2;
className = "font-display font-600 text-lg" > { title } < /h2>
    < /div>;
{
    children;
}
/div>
    < /div>;
;
function AdminSetup({ onDone }) {
    const [cfg, setCfg] = (0, react_1.useState)((0, exports.defaultConfig)());
    const [step, setStep] = (0, react_1.useState)(0);
    const [err, setErr] = (0, react_1.useState)("");
    const finish = () => {
        if (!cfg.name.trim())
            return setErr("Give your tournament a name.");
        setErr("");
        onDone({ ...cfg, setupDone: true });
    };
    return className = "max-w-md mx-auto mt-4" >
        className;
    "mb-6" >
        className;
    "font-mono text-xs tracking-widest";
    style = {};
    {
        color: "#06AED5";
    }
}
 > SETUP;
STEP;
{
    step + 1;
}
OF;
2 < /span>
    < h1;
className = "font-display font-700 text-2xl mt-1";
style = {};
{
    color: "#14213D";
}
 >
    { step } === 0 && "Name your tournament";
{
    step === 1 && "Set the rounds";
}
/h1>
    < /div>;
{
    err && { err } < /Banner>;
}
className;
"rounded-2xl p-6 border";
style = {};
{
    borderColor: "#DBD8CE", background;
    "#FFFFFF";
}
 >
    { step } === 0 && label;
"Tournament name" >
    value;
{
    cfg.name;
}
onChange = {}(e);
setCfg((c) => ({ ...c, name: e.target.value }));
placeholder = "e.g. Junior Quiz Challenge 2026" /  >
    /Field>
    < div;
className = "grid grid-cols-2 gap-3" >
    label;
"Starts" >
    type;
"date";
value = { cfg, : .startDate };
onChange = {}(e);
setCfg((c) => ({ ...c, startDate: e.target.value }));
/>
    < /Field>
    < Field;
label = "Ends" >
    type;
"date";
value = { cfg, : .endDate };
onChange = {}(e);
setCfg((c) => ({ ...c, endDate: e.target.value }));
/>
    < /Field>
    < /div>
    < />;
{
    step === 1 && className;
    "rounded-lg px-3 py-2.5 mb-5";
    style = {};
    {
        background: "#E6F7F3", color;
        "#0F8A6B";
    }
}
 >
    className;
"font-semibold text-sm" > Tournament;
format;
locked;
to;
the;
rubric < /div>
    < div;
className = "text-xs mt-1" > 3;
preliminary;
matches(2, rounds, each);
top;
8;
qualify;
quarter - finals;
semi - finals;
grand;
finale < /div>
    < div;
className = "text-xs mt-1" > Pairing;
Fold;
Method;
Conflict;
avoidance: One - up - One - down < /div>
    < /div>
    < Field;
label = "Max points per round" >
    type;
"number";
min = { 1:  };
value = { cfg, : .maxScorePerRound };
onChange = {}(e);
setCfg((c) => ({ ...c, maxScorePerRound: Number(e.target.value) || 1 }));
/>
    < /Field>
    < span;
className = "block text-xs font-semibold tracking-wide uppercase mb-2";
style = {};
{
    color: "#6B7490";
}
 > Rounds < /span>
    < RoundStructurePreview;
rounds = { cfg, : .rounds } /  >
    />;
/div>
    < div;
className = "flex justify-between mt-4" >
    variant;
"ghost";
onClick = {}();
setStep((s) => Math.max(0, s - 1));
disabled = { step } === 0;
 >
    Back
    < /Btn>;
{
    step < 1 ? variant = "primary" : ;
    onClick = {}();
    setStep((s) => s + 1);
}
 > Next < /Btn>;
variant = "gold";
onClick = { finish } > Launch;
tournament < /Btn>;
/div>
    < /div>;
;
/* ---------------------------------------------------------
   JUDGE GATE
--------------------------------------------------------- */
function JudgeGate({ onSubmit, onCancel }) {
    const [email, setEmail] = (0, react_1.useState)("");
    const [password, setPassword] = (0, react_1.useState)("");
    const [err, setErr] = (0, react_1.useState)("");
    const [loading, setLoading] = (0, react_1.useState)(false);
    const submit = async (e) => {
        e.preventDefault();
        setErr("");
        setLoading(true);
        const { data, error } = await supabaseClient_1.supabase.auth.signInWithPassword({ email, password });
        if (error) {
            setLoading(false);
            setErr("Sign-in failed — check your email and password.");
            return;
        }
        const { data: profile } = await supabaseClient_1.supabase
            .from("profiles")
            .select("role, display_name")
            .eq("id", data.user.id)
            .single();
        setLoading(false);
        if (profile?.role !== "judge") {
            await supabaseClient_1.supabase.auth.signOut();
            setErr("This account isn't set up as a judge.");
            return;
        }
        onSubmit(profile.display_name || email);
    };
    return icon = {} < lucide_react_1.ClipboardList;
    size = { 20:  } /  > ;
}
title = "Judge access";
onCancel = { onCancel } >
    { err } && { err } < /Banner>;
onSubmit;
{
    submit;
}
 >
    label;
"Email" >
    type;
"email";
autoFocus;
value = { email };
onChange = {}(e);
setEmail(e.target.value);
placeholder = "you@example.com" /  >
    /Field>
    < Field;
label = "Password" >
    type;
"password";
value = { password };
onChange = {}(e);
setPassword(e.target.value);
placeholder = "Your password" /  >
    /Field>
    < Btn;
variant = "primary";
type = "submit";
className = "w-full";
disabled = { loading } >
    { loading, "Signing in…": "Sign in" }
    < /Btn>
    < /form>
    < /GateShell>;
;
/* ---------------------------------------------------------
   ADMIN DASHBOARD
--------------------------------------------------------- */
function Tabs({ tabs, active, onChange }) {
    return className = "flex gap-1 mb-6 overflow-x-auto pb-1 -mx-1 px-1" >
        { tabs, : .map((t) => key = { t, : .key }, onClick = {}(), onChange(t.key)) };
    className = "shrink-0 px-3.5 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-1.5 transition-colors";
    style = {
        active
    } === t.key
        ? { background: "#14213D", color: "#F7F5F0" }
        : { background: "transparent", color: "#6B7490" };
}
    >
        { t, : .icon };
{
    t.label;
}
/button>;
/div>;
;
function StatCard({ label, value, accent = "#14213D" }) {
    return className = "rounded-xl border p-4";
    style = {};
    {
        borderColor: "#DBD8CE", background;
        "#FFFFFF";
    }
}
 >
    className;
"font-mono text-2xl font-700";
style = {};
{
    color: accent;
}
 > { value } < /div>
    < div;
className = "text-xs mt-1";
style = {};
{
    color: "#6B7490";
}
 > { label } < /div>
    < /div>;
;
function AdminDashboard({ config, teams, scores, pairings, onConfigChange, onTeamsChange, onScoresChange, onPairingsChange, onResetTournament, onRefresh, onLogout }) {
    const [tab, setTab] = (0, react_1.useState)("overview");
    const status = todayStatus(config);
    return title = { config, : .name };
    subtitle = "Admin";
    status = { status };
    onLogout = { onLogout };
    onRefresh = { onRefresh } /  >
        active;
    {
        tab;
    }
    onChange = { setTab };
    tabs = { [{ key: "overview", label: "Overview", icon: size, }]: { 15:  } /  >  },
        { key: "settings", label: "Settings", icon: size, };
    {
        15;
    }
    />;
}
{
    key: "teams", label;
    "Teams", icon;
    size;
    {
        15;
    }
    />;
}
{
    key: "scores", label;
    "Scores", icon;
    size;
    {
        15;
    }
    />;
}
{
    key: "pairings", label;
    "Pairings", icon;
    size;
    {
        15;
    }
    />;
}
/>;
{
    tab === "overview" && className;
    "grid grid-cols-2 gap-3" >
        label;
    "Teams registered";
    value = { teams, : .length } /  >
        label;
    "Scores entered";
    value = { scores, : .length };
    accent = "#06AED5" /  >
        label;
    "Rounds";
    value = { config, : .rounds.length } /  >
        label;
    "Status";
    value = { status, : .toUpperCase() };
    accent = { status } === "live" ? "#06AED5" : "#FFB627";
}
/>
    < /div>;
{
    tab === "settings" && config;
    {
        config;
    }
    onConfigChange = { onConfigChange };
    onResetTournament = { onResetTournament } /  >
    ;
}
{
    tab === "teams" && teams;
    {
        teams;
    }
    onTeamsChange = { onTeamsChange };
    scores = { scores };
    onScoresChange = { onScoresChange };
    editable /  >
    ;
}
{
    tab === "scores" && teams;
    {
        teams;
    }
    scores = { scores };
    rounds = { config, : .rounds };
    onScoresChange = { onScoresChange };
    editable /  >
    ;
}
{
    tab === "pairings" && config;
    {
        config;
    }
    teams = { teams };
    scores = { scores };
    pairings = { pairings };
    onPairingsChange = { onPairingsChange } /  >
    ;
}
/div>;
;
function DashHeader({ title, subtitle, status, onLogout, onRefresh }) {
    const [spinning, setSpinning] = (0, react_1.useState)(false);
    return className = "flex items-start justify-between mb-6" >
        className;
    "inline-flex items-center gap-1.5 font-mono text-[11px] tracking-widest";
    style = {};
    {
        color: "#6B7490";
    }
}
 >
    { subtitle, : .toUpperCase() }
    < /span>
    < h1;
className = "font-display font-700 text-2xl";
style = {};
{
    color: "#14213D";
}
 > { title } < /h1>;
{
    status && className;
    "mt-1" > status;
    {
        status;
    }
    /></div > ;
}
/div>
    < div;
className = "flex items-center gap-1" >
    onClick;
{
    async () => { setSpinning(true); await onRefresh(); setTimeout(() => setSpinning(false), 400); };
}
className = "p-2 rounded-full";
style = {};
{
    color: "#6B7490";
}
title = "Refresh"
    >
        size;
{
    17;
}
className = { spinning, "animate-spin": "" } /  >
    /button>
    < button;
onClick = { onLogout };
className = "p-2 rounded-full";
style = {};
{
    color: "#6B7490";
}
title = "Log out" >
    size;
{
    17;
}
/>
    < /button>
    < /div>
    < /div>;
;
function SettingsPanel({ config, onConfigChange, onResetTournament }) {
    const [draft, setDraft] = (0, react_1.useState)(config);
    const [saved, setSaved] = (0, react_1.useState)(false);
    const [err, setErr] = (0, react_1.useState)("");
    const [showConfirmReset, setShowConfirmReset] = (0, react_1.useState)(false);
    const save = async () => {
        if (!draft.name.trim())
            return setErr("Give your tournament a name.");
        setErr("");
        await onConfigChange(draft);
        setSaved(true);
        setTimeout(() => setSaved(false), 1800);
    };
    return ({ err } && { err } < /Banner>);
}
{
    saved && kind;
    "success" > Settings;
    saved. < /Banner>;
}
label;
"Tournament name" >
    value;
{
    draft.name;
}
onChange = {}(e);
setDraft((c) => ({ ...c, name: e.target.value }));
/>
    < /Field>
    < div;
className = "grid grid-cols-2 gap-3" >
    label;
"Starts" >
    type;
"date";
value = { draft, : .startDate };
onChange = {}(e);
setDraft((c) => ({ ...c, startDate: e.target.value }));
/>
    < /Field>
    < Field;
label = "Ends" >
    type;
"date";
value = { draft, : .endDate };
onChange = {}(e);
setDraft((c) => ({ ...c, endDate: e.target.value }));
/>
    < /Field>
    < /div>
    < Field;
label = "Max points per round" >
    type;
"number";
min = { 1:  };
value = { draft, : .maxScorePerRound };
onChange = {}(e);
setDraft((c) => ({ ...c, maxScorePerRound: Number(e.target.value) || 1 }));
/>
    < /Field>
    < div;
className = "rounded-lg px-3 py-2.5 mb-5";
style = {};
{
    background: "#E6F7F3", color;
    "#0F8A6B";
}
 >
    className;
"font-semibold text-sm" > Tournament;
format < /div>
    < div;
className = "text-xs mt-1" > 3;
preliminary;
matches(2, rounds, each);
top;
8;
qualify;
quarter - finals;
semi - finals;
grand;
finale < /div>
    < div;
className = "text-xs mt-1" > Pairing;
Fold;
Method;
Conflict;
avoidance: One - up - One - down < /div>
    < /div>
    < span;
className = "block text-xs font-semibold tracking-wide uppercase mb-2";
style = {};
{
    color: "#6B7490";
}
 > Rounds < /span>
    < div;
className = "mb-6" > rounds;
{
    draft.rounds;
}
/></div >
    variant;
"gold";
onClick = { save };
className = "w-full mt-2" > Save;
settings < /Btn>;
{ /* ADMIN-ONLY RESET TOURNAMENT BUTTON */ }
className;
"mt-8 pt-6 border-t";
style = {};
{
    borderColor: "#DBD8CE";
}
 >
    className;
"block text-xs font-semibold tracking-wide uppercase mb-2";
style = {};
{
    color: "#EF6461";
}
 > Admin;
Danger;
Zone < /span>;
{
    !showConfirmReset ? variant = "danger" : ;
    onClick = {}();
    setShowConfirmReset(true);
}
className = "w-full" >
    size;
{
    16;
}
/> Reset Tournament
    < /Btn>;
className = "p-4 rounded-xl border";
style = {};
{
    borderColor: "#F3C8C6", background;
    "#FDECEB";
}
 >
    className;
"text-xs mb-3 font-semibold";
style = {};
{
    color: "#C1443E";
}
 >
    Are;
you;
sure ? Admin : ;
action;
only;
This;
will;
permanently;
delete all;
registered;
teams, scores, pairings, and;
setup;
configurations
    < /p>
    < div;
className = "flex gap-2" >
    variant;
"danger";
onClick = { onResetTournament };
className = "flex-1" > Confirm;
Reset < /Btn>
    < Btn;
variant = "ghost";
onClick = {}();
setShowConfirmReset(false);
className = "flex-1" > Cancel < /Btn>
    < /div>
    < /div>;
/div>
    < /div>;
;
function TeamsPanel({ teams, onTeamsChange, scores, onScoresChange, editable }) {
    const [q, setQ] = (0, react_1.useState)("");
    const filtered = teams.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()) || (t.category || "").toLowerCase().includes(q.toLowerCase()));
    const removeTeam = async (id) => {
        await onTeamsChange(teams.filter((t) => t.id !== id));
        if (onScoresChange)
            await onScoresChange(scores.filter((s) => s.teamId !== id));
    };
    return className = "relative mb-4" >
        size;
    {
        15;
    }
    className = "absolute left-3 top-1/2 -translate-y-1/2";
    style = {};
    {
        color: "#9098B0";
    }
}
/>
    < TextInput;
value = { q };
onChange = {}(e);
setQ(e.target.value);
placeholder = "Search teams";
className = "pl-9" /  >
    /div>;
{
    filtered.length === 0 && No;
    teams;
    match;
    yet. < /EmptyNote>;
}
className;
"space-y-2" >
    { filtered, : .map((t) => key = { t, : .id }, className = "flex items-center justify-between rounded-xl border p-3.5", style = {}, { borderColor: "#DBD8CE", background: "#FFFFFF" }) } >
    className;
"font-medium text-sm";
style = {};
{
    color: "#14213D";
}
 > { t, : .name } < /div>
    < div;
className = "text-xs mt-0.5";
style = {};
{
    color: "#6B7490";
}
 >
    { t, : .category || "No category" };
{
    t.members || "—";
}
members;
registered;
by;
{
    t.registeredBy || "admin";
}
/div>
    < /div>;
{
    editable && onClick;
    {
        () => removeTeam(t.id);
    }
    style = {};
    {
        color: "#EF6461";
    }
}
className = "p-2" >
    size;
{
    16;
}
/>
    < /button>;
/div>;
/div>
    < /div>;
;
function ScoresPanel({ teams, scores, rounds, onScoresChange, editable }) {
    const teamName = (id) => teams.find((t) => t.id === id)?.name || "Unknown team";
    const roundName = (id) => rounds.find((r) => r.id === id)?.name || "Unknown round";
    const remove = async (id) => {
        await onScoresChange(scores.filter((s) => s.id !== id));
    };
    const sorted = [...scores].sort((a, b) => (b.enteredAt || "").localeCompare(a.enteredAt || ""));
    return ({ sorted, : .length === 0 && No, scores, entered, yet, : . < /EmptyNote> }
        < div);
    className = "space-y-2" >
        { sorted, : .map((s) => key = { s, : .id }, className = "flex items-center justify-between rounded-xl border p-3.5", style = {}, { borderColor: "#DBD8CE", background: "#FFFFFF" }) } >
        className;
    "font-medium text-sm";
    style = {};
    {
        color: "#14213D";
    }
}
 > { teamName(s) { }, : .teamId, } < /div>
    < div;
className = "text-xs mt-0.5";
style = {};
{
    color: "#6B7490";
}
 >
    { roundName(s) { }, : .roundId, };
by;
{
    s.judgeName || "—";
}
/div>
    < /div>
    < div;
className = "flex items-center gap-3" >
    className;
"font-mono font-700";
style = {};
{
    color: "#06AED5";
}
 > { s, : .points } < /span>;
{
    editable && onClick;
    {
        () => remove(s.id);
    }
    style = {};
    {
        color: "#EF6461";
    }
}
className = "p-2" >
    size;
{
    16;
}
/>
    < /button>;
/div>
    < /div>;
/div>
    < /div>;
;
function PairingsPanel({ config, teams, scores, pairings, onPairingsChange }) {
    const [busy, setBusy] = (0, react_1.useState)(null);
    const top8 = preliminarySeedOrder(teams, config, scores);
    const teamName = (id) => (id ? teams.find((t) => t.id === id)?.name || "Unknown team" : "Bye");
    const hasPairings = (stage, matchLabel) => pairings.some((p) => p.stage === stage && (stage !== "preliminary" || p.matchLabel === matchLabel));
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
    /* ADMIN COMMAND: Clear/delete generated draw for a stage if made by mistake */
    const clearDraw = async (sec) => {
        setBusy(sec.label);
        const remaining = pairings.filter((p) => !(p.stage === sec.stage && (sec.stage !== "preliminary" || p.matchLabel === sec.matchLabel)));
        await onPairingsChange(remaining);
        setBusy(null);
    };
    return className = "space-y-3" >
        { sections, : .map((sec) => {
                const rows = pairings.filter((p) => p.stage === sec.stage && (sec.stage !== "preliminary" || p.matchLabel === sec.matchLabel));
                return key = { sec, : .label };
                className = "rounded-xl border p-4";
                style = {};
                {
                    borderColor: "#DBD8CE", background;
                    "#FFFFFF";
                }
            },  >
                className, "flex items-center justify-between gap-3 mb-1" >
                className, "font-display font-700 text-sm", style = {}, { color: "#14213D" }) } > { sec, : .label } < /span>
        < div;
    className = "flex gap-2" >
        { /* ADMIN RESET DRAW BUTTON */};
    {
        rows.length > 0 && variant;
        "danger";
        onClick = {}();
        clearDraw(sec);
    }
    disabled = { busy } === sec.label;
}
className = "shrink-0 text-xs py-1.5 px-3";
title = "Delete this generated draw to recreate it"
    >
        size;
{
    14;
}
/> Delete Draw
    < /Btn>;
variant;
"ghost";
onClick = {}();
regenerate(sec);
disabled = {};
sec.ready || busy === sec.label;
className = "shrink-0 text-xs py-1.5 px-3"
    >
        size;
{
    14;
}
/> {rows.length ? "Regenerate" : "Generate Draw"}
    < /Btn>
    < /div>
    < /div>
    < p;
className = "text-[11px] mb-3";
style = {};
{
    color: "#9098B0";
}
 > { sec, : .note } < /p>;
{
    !sec.ready ? className = "text-xs" : ;
    style = {};
    {
        color: "#9098B0";
    }
}
 > Waiting;
on;
the;
previous;
stage. < /p>;
rows.length === 0 ? className = "text-xs" : ;
style = {};
{
    color: "#9098B0";
}
 > Not;
generated;
yet. < /p>;
className = "space-y-1.5" >
    { rows, : .map((p) => {
            const winner = sec.stage !== "preliminary" ? matchWinner(p, config, scores) : null;
            return key = { p, : .id };
            className = "flex items-center justify-between text-sm rounded-lg px-2.5 py-1.5";
            style = {};
            {
                background: "#F7F5F0";
            }
        },  >
            style, {}, { color: winner === p.teamAId ? "#0F8A6B" : "#14213D", fontWeight: winner === p.teamAId ? 600 : 400 }) } >
    { teamName(p) { }, : .teamAId, }
    < /span>
    < span;
className = "text-xs";
style = {};
{
    color: "#9098B0";
}
 > vs < /span>
    < span;
style = {};
{
    color: winner === p.teamBId ? "#0F8A6B" : "#14213D", fontWeight;
    winner === p.teamBId ? 600 : 400;
}
 >
    { teamName(p) { }, : .teamBId, }
    < /span>
    < /div>;
;
/div>;
/div>;
;
/div>;
;
function EmptyNote({ children }) {
    return className = "rounded-xl border border-dashed p-6 text-center text-sm";
    style = {};
    {
        borderColor: "#DBD8CE", color;
        "#9098B0";
    }
}
 >
    { children }
    < /div>;
;
/* ---------------------------------------------------------
   JUDGE DASHBOARD
--------------------------------------------------------- */
function JudgeDashboard({ config, teams, scores, judgeName, getLatestTeams, onTeamsChange, onScoresChange, onRefresh, onLogout }) {
    const [tab, setTab] = (0, react_1.useState)("register");
    const status = todayStatus(config);
    return title = { config, : .name };
    subtitle = {} `Judge · ${judgeName}`;
}
status = { status };
onLogout = { onLogout };
onRefresh = { onRefresh } /  >
    active;
{
    tab;
}
onChange = { setTab };
tabs = { [{ key: "register", label: "Register team", icon: size, }]: { 15:  } /  >  },
    { key: "score", label: "Enter scores", icon: size, };
{
    15;
}
/>;
{
    key: "teams", label;
    "Teams", icon;
    size;
    {
        15;
    }
    />;
}
/>;
{
    tab === "register" && teams;
    {
        teams;
    }
    judgeName = { judgeName };
    getLatestTeams = { getLatestTeams };
    onTeamsChange = { onTeamsChange } /  >
    ;
}
{
    tab === "score" && config;
    {
        config;
    }
    teams = { teams };
    scores = { scores };
    judgeName = { judgeName };
    onScoresChange = { onScoresChange } /  >
    ;
}
{
    tab === "teams" && teams;
    {
        teams;
    }
    onTeamsChange = { onTeamsChange };
    editable = { false:  } /  >
    ;
}
/div>;
;
function RegisterTeamForm({ teams, judgeName, getLatestTeams, onTeamsChange }) {
    const [name, setName] = (0, react_1.useState)("");
    const [category, setCategory] = (0, react_1.useState)("");
    const [members, setMembers] = (0, react_1.useState)("");
    const [err, setErr] = (0, react_1.useState)("");
    const [saved, setSaved] = (0, react_1.useState)(false);
    const submit = async (e) => {
        e.preventDefault();
        const cleanName = name.trim();
        if (!cleanName)
            return setErr("Enter the team's name.");
        // Fetch latest server teams to prevent duplicate registrations
        const currentTeams = getLatestTeams ? await getLatestTeams() : teams;
        if (currentTeams.some((t) => t.name.toLowerCase() === cleanName.toLowerCase())) {
            return setErr("A team with that name has already been registered.");
        }
        setErr("");
        const team = {
            id: (0, exports.uid)(),
            name: cleanName,
            category: category.trim(),
            members: members.trim(),
            registeredBy: judgeName,
            createdAt: new Date().toISOString(),
        };
        await onTeamsChange([...currentTeams, team]);
        setName("");
        setCategory("");
        setMembers("");
        setSaved(true);
        setTimeout(() => setSaved(false), 1800);
    };
    return onSubmit = { submit } >
        { err } && { err } < /Banner>;
}
{
    saved && kind;
    "success" > Team;
    registered. < /Banner>;
}
label;
"Team name" >
    autoFocus;
value = { name };
onChange = {}(e);
setName(e.target.value);
placeholder = "e.g. The Quiz Wizards" /  >
    /Field>
    < Field;
label = "Category";
hint = "Optional — e.g. an age group or school" >
    value;
{
    category;
}
onChange = {}(e);
setCategory(e.target.value);
placeholder = "e.g. Ages 10–12" /  >
    /Field>
    < Field;
label = "Number of members";
hint = "Optional" >
    value;
{
    members;
}
onChange = {}(e);
setMembers(e.target.value);
placeholder = "e.g. 4" /  >
    /Field>
    < Btn;
variant = "accent";
type = "submit";
className = "w-full" > size;
{
    16;
}
/> Register team</Btn >
    /form>;
;
function EnterScoreForm({ config, teams, scores, judgeName, onScoresChange }) {
    const [teamId, setTeamId] = (0, react_1.useState)("");
    const [roundId, setRoundId] = (0, react_1.useState)(config.rounds[0]?.id || "");
    const [points, setPoints] = (0, react_1.useState)("");
    const [err, setErr] = (0, react_1.useState)("");
    const [saved, setSaved] = (0, react_1.useState)(false);
    const existing = scores.find((s) => s.teamId === teamId && s.roundId === roundId);
    const submit = async (e) => {
        e.preventDefault();
        if (!teamId)
            return setErr("Choose a team.");
        if (!roundId)
            return setErr("Choose a round.");
        const val = Number(points);
        if (Number.isNaN(val) || val < 0 || val > config.maxScorePerRound) {
            return setErr(`Points must be between 0 and ${config.maxScorePerRound}.`);
        }
        setErr("");
        const entry = {
            id: existing?.id || (0, exports.uid)(),
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
    return { teams, : .length === 0 ? Register : , a, team, first, then, come, back, to, enter, scores, : . < /EmptyNote>, }(onSubmit, { submit } >
        { err } && { err } < /Banner>);
}
{
    saved && kind;
    "success" > Score;
    saved. < /Banner>;
}
label;
"Team" >
    value;
{
    teamId;
}
onChange = {}(e);
{
    setTeamId(e.target.value);
    setPoints("");
}
className = { inputBase: exports.inputBase };
style = {};
{
    borderColor: "#DBD8CE", background;
    "#FFFFFF", color;
    "#14213D";
}
    >
        value;
"" > Select;
a;
team;
/option>;
{
    teams.map((t) => key, { t, : .id }, value = { t, : .id } > { t, : .name } < /option>);
}
/select>
    < /Field>
    < Field;
label = "Round" >
    value;
{
    roundId;
}
onChange = {}(e);
{
    setRoundId(e.target.value);
    setPoints("");
}
className = { inputBase: exports.inputBase };
style = {};
{
    borderColor: "#DBD8CE", background;
    "#FFFFFF", color;
    "#14213D";
}
    >
        { groupRoundsForDisplay(config) { }, : .rounds, : .map((g) => key = { g, : .key }, label = { g, : .label } >
                { g, : .items.map((r) => key, { r, : .id }, value = { r, : .id } > { r, : .name } < /option>) }
                < /optgroup>), }
    < /select>
    < /Field>
    < Field;
label = {} `Points (0–${config.maxScorePerRound})`;
hint = { existing, "Already scored — submitting will update it.": undefined } >
    type;
"number";
min = { 0:  };
max = { config, : .maxScorePerRound };
value = { points };
onChange = {}(e);
setPoints(e.target.value);
placeholder = "0" /  >
    /Field>
    < Btn;
variant = "accent";
type = "submit";
className = "w-full" >
    { existing, "Update score": "Save score" }
    < /Btn>
    < /form>;
{
    recent.length > 0 && className;
    "mt-8" >
        className;
    "block text-xs font-semibold tracking-wide uppercase mb-2";
    style = {};
    {
        color: "#6B7490";
    }
}
 > Your;
recent;
entries < /span>
    < div;
className = "space-y-2" >
    { recent, : .map((s) => key = { s, : .id }, className = "flex items-center justify-between text-sm rounded-lg px-3 py-2", style = {}, { background: "#FFFFFF", border: "1px solid #DBD8CE" }) } >
    style;
{
    {
        color: "#14213D";
    }
}
 >
    { teams, : .find((t) => t.id === s.teamId)?.name || "—" };
{
    config.rounds.find((r) => r.id === s.roundId)?.name || "—";
}
/span>
    < span;
className = "font-mono font-700";
style = {};
{
    color: "#06AED5";
}
 > { s, : .points } < /span>
    < /div>;
/div>
    < /div>;
/div>;
;
/* ---------------------------------------------------------
   STANDINGS (PUBLIC)
--------------------------------------------------------- */
exports.MEDAL = ["#FFB627", "#C7CDD9", "#C97B4A"];
function Standings({ config, teams, scores, pairings, onRefresh, onBack }) {
    const [q, setQ] = (0, react_1.useState)("");
    const [expanded, setExpanded] = (0, react_1.useState)(null);
    const [lastUpdated, setLastUpdated] = (0, react_1.useState)(new Date());
    const [copied, setCopied] = (0, react_1.useState)(false);
    const intervalRef = (0, react_1.useRef)(null);
    const status = todayStatus(config);
    (0, react_1.useEffect)(() => {
        intervalRef.current = setInterval(async () => {
            await onRefresh();
            setLastUpdated(new Date());
        }, 6000);
        return () => clearInterval(intervalRef.current);
    }, [onRefresh]);
    const preliminaryRounds = config.rounds.filter((round) => round.stage === "preliminary");
    const allStandings = computeStandings(teams, scores, preliminaryRounds);
    const standings = allStandings.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()) || (t.category || "").toLowerCase().includes(q.toLowerCase()));
    const copyStandings = () => {
        const text = standings.map((t, i) => `${i + 1}. ${t.name} — ${t.total}`).join("\n");
        navigator.clipboard?.writeText(`${config.name} — Standings\n\n${text}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };
    return onClick = { onBack };
    className = "text-sm mb-6 inline-flex items-center gap-1";
    style = {};
    {
        color: "#6B7490";
    }
}
 > ;
Back < /button>
    < div;
className = "mb-6" >
    className;
"flex items-center justify-between" >
    status;
{
    status;
}
/>
    < span;
className = "font-mono text-[10px]";
style = {};
{
    color: "#9098B0";
}
 >
    updated;
{
    lastUpdated.toLocaleTimeString();
}
/span>
    < /div>
    < h1;
className = "font-display font-700 text-2xl mt-1";
style = {};
{
    color: "#14213D";
}
 > { config, : .name } < /h1>
    < /div>
    < div;
className = "relative mb-4" >
    size;
{
    15;
}
className = "absolute left-3 top-1/2 -translate-y-1/2";
style = {};
{
    color: "#9098B0";
}
/>
    < TextInput;
value = { q };
onChange = {}(e);
setQ(e.target.value);
placeholder = "Search by team or category";
className = "pl-9" /  >
    /div>
    < BracketPanel;
config = { config };
teams = { teams };
scores = { scores };
pairings = { pairings } /  >
    { standings, : .length === 0 ? No : , teams, registered, yet, check, back, once, judges, start, registering, teams, : . < /EmptyNote>, }(className, "space-y-2" >
        { standings, : .map((t, i) => key = { t, : .id }, className = "rounded-xl border overflow-hidden", style = {}, { borderColor: "#DBD8CE", background: "#FFFFFF" }) } >
        className, "w-full flex items-center gap-3 p-3.5 text-left", onClick = {}(), setExpanded(expanded === t.id ? null : t.id), 
        >
            className, "font-mono font-700 text-sm w-8 h-8 rounded-full flex items-center justify-center shrink-0", style = {}, {
        background: i < 3 ? exports.MEDAL[i] : "#F0EEE7",
        color: i < 3 ? "#14213D" : "#6B7490",
    }, 
        >
            { i } + 1, /span>
        < span, className = "flex-1 min-w-0" >
        className, "font-medium text-sm truncate", style = {}, { color: "#14213D" },  > { t, : .name } < /div>, { t, : .category && className, "text-xs": style = {} }, { color: "#6B7490" },  > { t, : .category } < /div>, /span>
        < span, className = "font-mono font-700 text-lg", style = {}, { color: "#06AED5" },  > { t, : .total } < /span>, { expanded } === t.id ? size : , { 16:  }, color = "#9098B0" /  > , size, { 16:  }, color = "#9098B0" /  > , /button>, { expanded } === t.id && className, "px-3.5 pb-3.5 pt-1 space-y-2" >
        { groupRoundsForDisplay(config) { }, : .rounds }).map((g) => key = { g, : .key } >
        className, "text-[10px] font-semibold uppercase tracking-wide mb-1", style = {}, { color: "#9098B0" },  > { g, : .label } < /div>
        < div, className = "grid grid-cols-2 sm:grid-cols-3 gap-2" >
        { g, : .items.map((r) => key = { r, : .id }, className = "rounded-lg px-2.5 py-2", style = {}, { background: "#F7F5F0" }) } >
        className, "text-[10px] uppercase tracking-wide", style = {}, { color: "#9098B0" },  > { r, : .name } < /div>
        < div, className = "font-mono font-600 text-sm", style = {}, { color: "#14213D" },  >
        { t, : .byRound[r.id] ?? "—" }
        < /div>
        < /div>);
/div>
    < /div>;
/div>;
/div>;
/div>;
{
    standings.length > 0 && variant;
    "ghost";
    onClick = { copyStandings };
    className = "w-full mt-4" >
        {} < lucide_react_1.Check;
    size = { 15:  } /  > Copied < /> : <><Copy size={15} / > lucide_react_1.Copy;
    standings < />;
}
/Btn>;
/div>;
;
function BracketPanel({ config, teams, scores, pairings }) {
    const qualifiedCount = config.qualificationCount || 8;
    const teamName = (id) => (id ? teams.find((t) => t.id === id)?.name || "Unknown team" : "Bye");
    const stageRows = (stage) => pairings
        .filter((p) => p.stage === stage)
        .map((p) => ({ ...p, winnerId: matchWinner(p, config, scores) }));
    const qf = stageRows("quarter-final");
    const sf = stageRows("semi-final");
    const final = stageRows("final");
    if (qf.length === 0) {
        return className = "rounded-xl border p-4 mb-4";
        style = {};
        {
            borderColor: "#DBD8CE", background;
            "#FFFFFF";
        }
    }
     >
        className;
    "font-display font-700 text-lg mb-1";
    style = {};
    {
        color: "#14213D";
    }
}
 > Road;
to;
the;
final < /div>
    < p;
className = "text-sm";
style = {};
{
    color: "#6B7490";
}
 >
    Quarter;
Final;
pairings;
haven;
't been drawn yet. The top {qualifiedCount} teams after all preliminary matches will qualify.
    < /p>
    < /section>;
;
const StageBlock = ({ title, rows }) => className = "space-y-2" >
    className;
"text-[11px] font-semibold uppercase tracking-wide";
style = {};
{
    color: "#06AED5";
}
 > { title } < /div>;
{
    rows.map((p) => key = { p, : .id }, className = "flex items-center gap-2 text-sm" >
        className, "flex-1 rounded-lg px-2.5 py-2", style = {}, {
        background: p.winnerId === p.teamAId ? "#E6F7F3" : "#F7F5F0",
        color: "#14213D",
        fontWeight: p.winnerId === p.teamAId ? 600 : 400,
    });
}
    >
        { teamName(p) { }, : .teamAId, }
    < /span>
    < span;
className = "text-xs";
style = {};
{
    color: "#9098B0";
}
 > vs < /span>
    < span;
className = "flex-1 rounded-lg px-2.5 py-2 text-right";
style = {};
{
    background: p.winnerId === p.teamBId ? "#E6F7F3" : "#F7F5F0",
        color;
    "#14213D",
        fontWeight;
    p.winnerId === p.teamBId ? 600 : 400,
    ;
}
    >
        { teamName(p) { }, : .teamBId, }
    < /span>
    < /div>;
/div>;
;
return className = "rounded-xl border p-4 mb-4 space-y-4";
style = {};
{
    borderColor: "#DBD8CE", background;
    "#FFFFFF";
}
 >
    className;
"flex items-start justify-between gap-3" >
    className;
"font-display font-700 text-lg";
style = {};
{
    color: "#14213D";
}
 > Road;
to;
the;
final < /div>
    < p;
className = "text-xs mt-1";
style = {};
{
    color: "#6B7490";
}
 >
    Top;
{
    qualifiedCount;
}
after;
preliminaries;
qualify.Power - protected;
seeding;
throughout;
the;
knockout;
stages.
    < /p>
    < /div>
    < span;
className = "font-mono text-[10px] tracking-widest";
style = {};
{
    color: "#06AED5";
}
 > BRACKET < /span>
    < /div>
    < StageBlock;
title = "Quarter Finals";
rows = { qf } /  >
    { sf, : .length > 0 && title, "Semi Finals": rows = { sf } /  >  };
{
    sf.length === 0 && className;
    "text-xs";
    style = {};
    {
        color: "#9098B0";
    }
}
 > Semi;
Final;
pairings;
will;
appear;
once;
all;
Quarter;
Finals;
have;
a;
winner. < /p>;
{
    final.length > 0 && title;
    "Grand Finale";
    rows = { final } /  > ;
}
{
    sf.length > 0 && final.length === 0 && className;
    "text-xs";
    style = {};
    {
        color: "#9098B0";
    }
}
 > The;
Final;
pairing;
will;
appear;
once;
both;
Semi;
Finals;
have;
a;
winner. < /p>;
/section>;
;
//# sourceMappingURL=gemini-code-1787116151227.js.map