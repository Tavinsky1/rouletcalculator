import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Trash2, PieChart, Info, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Roulette Win Probability & Risk/Reward Calculator — Fancy Felt Skin
 * - European (single-zero) and American (double-zero) modes
 * - Drag chips (1,5,10,25,50,100,200,500) to betting areas on the table
 * - All common inside & outside bets with correct payouts
 * - Per-bet analytics and overall EV, win/loss probabilities per spin
 * - Casino-style fancy skin: felt texture, gold trim, glossy cells, colored chips
 *
 * Single-file React component. Default export is <RouletteApp />.
 */

// ---- Config ----
const DENOMINATIONS = [1, 5, 10, 25, 50, 100, 200, 500];

const COLORS: Record<number | "0" | "00", "red" | "black" | "green"> = {
  0: "green",
  1: "red", 2: "black", 3: "red", 4: "black", 5: "red", 6: "black",
  7: "red", 8: "black", 9: "red", 10: "black", 11: "black", 12: "red",
  13: "black", 14: "red", 15: "black", 16: "red", 17: "black", 18: "red",
  19: "red", 20: "black", 21: "red", 22: "black", 23: "red", 24: "black",
  25: "red", 26: "black", 27: "red", 28: "black", 29: "black", 30: "red",
  31: "black", 32: "red", 33: "black", 34: "red", 35: "black", 36: "red",
};

function europeanNumbers(): (number | "0")[] {
  const base = Array.from({ length: 36 }, (_, i) => i + 1);
  return ["0", ...base];
}
function americanNumbers(): (number | "0" | "00")[] {
  const base = Array.from({ length: 36 }, (_, i) => i + 1);
  return ["0", ...base, "00"]; // 38 slots
}

// ---- Bet model ----
export type WheelType = "european" | "american";
export type Slot = number | "0" | "00";

export type BetArea = {
  id: string;
  label: string;
  covered: Slot[]; // numbers that win
  payout: number; // profit multiple, e.g. straight=35, split=17
  kind: "inside" | "outside" | "special";
};

export type PlacedBet = {
  id: string; // unique per placement
  areaId: string;
  amount: number; // stake
};

function rrLabel(payout: number) {
  return `1:${payout}`; // risk:reward for a single unit stake
}

// ---- Build betting areas for a given wheel ----
export function buildBetAreas(wheel: WheelType): BetArea[] {
  const slots = wheel === "european" ? europeanNumbers() : americanNumbers();
  const onlyNums = slots.filter((s) => typeof s === "number") as number[];

  // 3 columns: 1–34–… pattern
  const columns: number[][] = [[], [], []];
  for (let n = 1; n <= 36; n++) {
    const colIndex = (n - 1) % 3; // 1,4,7 => col0; 2,5,8 => col1; 3,6,9 => col2
    columns[colIndex].push(n);
  }

  // dozens
  const dozen1 = Array.from({ length: 12 }, (_, i) => i + 1);
  const dozen2 = Array.from({ length: 12 }, (_, i) => i + 13);
  const dozen3 = Array.from({ length: 12 }, (_, i) => i + 25);

  // even money sets
  const reds = onlyNums.filter((n) => COLORS[n] === "red");
  const blacks = onlyNums.filter((n) => COLORS[n] === "black");
  const evens = onlyNums.filter((n) => n % 2 === 0);
  const odds = onlyNums.filter((n) => n % 2 === 1);
  const low = onlyNums.filter((n) => n >= 1 && n <= 18);
  const high = onlyNums.filter((n) => n >= 19 && n <= 36);

  // Inside bet helpers
  const straights: BetArea[] = onlyNums.map((n) => ({ id: `straight-${n}`, label: `${n}`, covered: [n], payout: 35, kind: "inside" }));
  straights.push({ id: "straight-0", label: "0", covered: ["0"], payout: 35, kind: "inside" });
  if (wheel === "american") straights.push({ id: "straight-00", label: "00", covered: ["00"], payout: 35, kind: "inside" });

  const rows: number[][] = [];
  for (let r = 0; r < 12; r++) rows.push([r * 3 + 1, r * 3 + 2, r * 3 + 3]);

  const splits: BetArea[] = [];
  const corners: BetArea[] = [];
  const streets: BetArea[] = rows.map((row, i) => ({ id: `street-${i}`, label: `${row[0]}-${row[2]} (row)`, covered: [...row], payout: 11, kind: "inside" }));
  const lines: BetArea[] = [];

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    // horizontal splits
    splits.push({ id: `split-${row[0]}-${row[1]}`, label: `${row[0]}-${row[1]}`, covered: [row[0], row[1]], payout: 17, kind: "inside" });
    splits.push({ id: `split-${row[1]}-${row[2]}`, label: `${row[1]}-${row[2]}`, covered: [row[1], row[2]], payout: 17, kind: "inside" });
    // vertical splits and corners with next row
    if (r < rows.length - 1) {
      const next = rows[r + 1];
      for (let c = 0; c < 3; c++) {
        splits.push({ id: `split-${row[c]}-${next[c]}`, label: `${row[c]}-${next[c]}`, covered: [row[c], next[c]], payout: 17, kind: "inside" });
      }
      corners.push({ id: `corner-${row[0]}-${row[1]}-${next[0]}-${next[1]}`, label: `${row[0]}-${row[1]}-${next[0]}-${next[1]}`, covered: [row[0], row[1], next[0], next[1]], payout: 8, kind: "inside" });
      corners.push({ id: `corner-${row[1]}-${row[2]}-${next[1]}-${next[2]}`, label: `${row[1]}-${row[2]}-${next[1]}-${next[2]}`, covered: [row[1], row[2], next[1], next[2]], payout: 8, kind: "inside" });
      lines.push({ id: `line-${row[0]}-${next[2]}`, label: `${row[0]}-${next[2]} (line)`, covered: [...row, ...next], payout: 5, kind: "inside" });
    }
  }

  const columnsAreas: BetArea[] = columns.map((col, i) => ({ id: `col-${i + 1}`, label: `Column ${i + 1}`, covered: col, payout: 2, kind: "outside" }));
  const dozensAreas: BetArea[] = [
    { id: "dozen-1", label: "1st 12", covered: dozen1, payout: 2, kind: "outside" },
    { id: "dozen-2", label: "2nd 12", covered: dozen2, payout: 2, kind: "outside" },
    { id: "dozen-3", label: "3rd 12", covered: dozen3, payout: 2, kind: "outside" },
  ];
  const evenMoneyAreas: BetArea[] = [
    { id: "red", label: "Red", covered: reds, payout: 1, kind: "outside" },
    { id: "black", label: "Black", covered: blacks, payout: 1, kind: "outside" },
    { id: "even", label: "Even", covered: evens, payout: 1, kind: "outside" },
    { id: "odd", label: "Odd", covered: odds, payout: 1, kind: "outside" },
    { id: "low", label: "1-18", covered: low, payout: 1, kind: "outside" },
    { id: "high", label: "19-36", covered: high, payout: 1, kind: "outside" },
  ];

  const areas: BetArea[] = [
    ...straights,
    ...splits,
    ...streets,
    ...corners,
    ...lines,
    ...columnsAreas,
    ...dozensAreas,
    ...evenMoneyAreas,
  ];
  if (wheel === "american") areas.push({ id: "topline", label: "0-00-1-2-3 (Top Line)", covered: ["0", "00", 1, 2, 3], payout: 6, kind: "special" });
  return areas;
}

// ---- UI Helpers ----
function classNames(...a: (string | false | undefined)[]) {
  return a.filter(Boolean).join(" ");
}

function Cell({ children, color, onDrop, onDragOver }: { children: React.ReactNode; color?: "red" | "black" | "green"; onDrop?: (e: React.DragEvent) => void; onDragOver?: (e: React.DragEvent) => void; }) {
  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      className={classNames(
        "relative flex items-center justify-center text-sm md:text-base font-semibold rounded-xl select-none h-12 md:h-14",
        "shadow-[inset_0_2px_0_rgba(255,255,255,0.15),inset_0_-3px_8px_rgba(0,0,0,0.35),0_6px_14px_rgba(0,0,0,0.25)] border-2",
        color === "red" && "bg-gradient-to-br from-[#b01919] to-[#6f0d0d] text-white border-[#e7b66a]",
        color === "black" && "bg-gradient-to-br from-[#1f1f1f] to-[#0b0b0b] text-white border-[#e7b66a]",
        color === "green" && "bg-gradient-to-br from-[#116b3a] to-[#0a4425] text-white border-[#e7b66a]",
        !color && "bg-gradient-to-br from-[#1a7a3e] to-[#0f5730] text-white border-[#e7b66a]"
      )}
      style={{
        backgroundImage:
          color
            ? undefined
            : "repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0 2px, rgba(0,0,0,0.05) 2px 4px)",
      }}
    >
      <span className="drop-shadow-sm tracking-wide">{children}</span>
      <div className="pointer-events-none absolute inset-0 rounded-xl" style={{
        background: "linear-gradient(to bottom, rgba(255,255,255,0.18), rgba(255,255,255,0.02) 40%, rgba(0,0,0,0.15) 95%)"
      }} />
    </div>
  );
}

function Chip({ value }: { value: number }) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", String(value));
  };
  const palette: Record<string, string> = {
    "1": "from-[#f9fafb] to-[#e5e7eb] text-neutral-900 border-neutral-300",
    "5": "from-[#76b947] to-[#3d8b2e] text-white border-[#e7b66a]",
    "10": "from-[#3b82f6] to-[#1d4ed8] text-white border-[#e7b66a]",
    "25": "from-[#ef4444] to-[#991b1b] text-white border-[#e7b66a]",
    "50": "from-[#a855f7] to-[#6b21a8] text-white border-[#e7b66a]",
    "100": "from-[#f59e0b] to-[#b45309] text-white border-[#e7b66a]",
    "200": "from-[#10b981] to-[#047857] text-white border-[#e7b66a]",
    "500": "from-[#111827] to-[#0b0f19] text-white border-[#e7b66a]",
  };
  const color = palette[String(value)] || palette["1"];
  return (
    <motion.div
      draggable
      onDragStart={handleDragStart}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.96 }}
      className={classNames(
        "relative w-12 h-12 md:w-14 md:h-14 rounded-full shadow-xl border-2 font-extrabold flex items-center justify-center text-sm md:text-base",
        `bg-gradient-to-br ${color}`
      )}
      style={{
        boxShadow:
          "inset 0 2px 0 rgba(255,255,255,.45), inset 0 -3px 8px rgba(0,0,0,.35), 0 6px 14px rgba(0,0,0,.25)",
      }}
    >
      <div className="absolute inset-1 rounded-full border-2 border-white/40" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="drop-shadow-sm">{value}</span>
      </div>
      <div className="pointer-events-none absolute -inset-[1px] rounded-full" style={{
        background:
          "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.55), rgba(255,255,255,0.0) 40%)",
      }} />
    </motion.div>
  );
}

// ---- Main App ----
export default function RouletteApp() {
  const [wheel, setWheel] = useState<WheelType>("european");
  const areas = useMemo(() => buildBetAreas(wheel), [wheel]);
  const slots: Slot[] = useMemo(() => (wheel === "european" ? europeanNumbers() : americanNumbers()), [wheel]);

  const [placed, setPlaced] = useState<PlacedBet[]>([]);
  const [activeAreaId, setActiveAreaId] = useState<string | null>(null);

  // Single-run calculator mode
  const SINGLE_MODE = true;
  const [locked, setLocked] = useState(false);

  const areaMap = useMemo(() => new Map(areas.map((a) => [a.id, a])), [areas]);

  const handleDropOnArea = (areaId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    if (locked) return;
    const raw = e.dataTransfer.getData("text/plain");
    const val = Number(raw);
    if (!Number.isFinite(val) || val <= 0) return;
    if (SINGLE_MODE) {
      setPlaced([{ id: `${areaId}-${Date.now()}`, areaId, amount: val }]);
    } else {
      setPlaced((prev) => [...prev, { id: `${areaId}-${Date.now()}-${Math.random()}`, areaId, amount: val }]);
    }
    setActiveAreaId(areaId);
  };
  const allowDrop = (e: React.DragEvent) => e.preventDefault();

  const removeBet = (id: string) => setPlaced((prev) => prev.filter((b) => b.id !== id));
  const clearAll = () => { setPlaced([]); setActiveAreaId(null); setLocked(false); };

  const activeBets = placed.filter((b) => b.areaId === activeAreaId);
  const activeArea = activeAreaId ? areaMap.get(activeAreaId) : undefined;
  const activeStake = activeBets.reduce((s, b) => s + b.amount, 0);
  const totalStake = placed.reduce((s, b) => s + b.amount, 0);

  const slotsCount = slots.length; // 37 or 38

  const perBetStats = useMemo(() => {
    if (!activeArea) return null;
    const pWin = activeArea.covered.length / slotsCount;
    const payout = activeArea.payout; // profit multiple
    const stake = activeStake || 1; // show per 1 if none
    const profitIfWin = payout * stake;
    const ev = pWin * profitIfWin - (1 - pWin) * stake;
    return { pWin, payout, rr: rrLabel(payout), stake, profitIfWin, ev };
  }, [activeArea, activeStake, slotsCount]);

  const overall = useMemo(() => {
    if (placed.length === 0) return null;
    let totalEV = 0;
    let winCount = 0;
    let loseCount = 0;
    let breakEvenCount = 0;
    let maxWin = -Infinity;
    let maxLoss = Infinity;

    for (const outcome of slots) {
      let net = 0;
      for (const b of placed) {
        const area = areaMap.get(b.areaId)!;
        const wins = area.covered.some((n) => n === outcome);
        if (wins) net += area.payout * b.amount; else net -= b.amount;
      }
      totalEV += net;
      if (net > 0) winCount++; else if (net < 0) loseCount++; else breakEvenCount++;
      if (net > maxWin) maxWin = net;
      if (net < maxLoss) maxLoss = net;
    }

    const N = slots.length;
    return { ev: totalEV / N, pWin: winCount / N, pLose: loseCount / N, pBreakEven: breakEvenCount / N, maxWin, maxLoss, totalStake };
  }, [placed, areaMap, slots, totalStake]);

  const houseEdge = wheel === "european" ? 0.027 : 0.0526;
  const straightAreaId = (n: Slot) => `straight-${n}`;
  function addBet(areaId: string, amount: number) {
    setPlaced((prev) => [...prev, { id: `${areaId}-${Date.now()}-${Math.random()}`, areaId, amount }]);
    setActiveAreaId(areaId);
  }

  return (
    <div className="min-h-screen w-full p-4 md:p-8" style={{ backgroundImage: 'linear-gradient(180deg,#2c1b10 0%,#1b110b 40%,#140d08 100%)' }}>
      <div className="relative mx-auto max-w-7xl space-y-4 md:space-y-6">
        {/* Glow header */}
        <div className="relative rounded-2xl p-4 md:p-6 border-4 border-[#e7b66a] bg-[#0e5a31] text-white shadow-2xl"
             style={{ backgroundImage: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.08), rgba(0,0,0,0.0) 40%), repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0 2px, rgba(0,0,0,0.03) 2px 4px)" }}>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-wide flex items-center gap-2">
                <Sparkles className="w-6 h-6"/> Royale Roulette — Probability & Risk/Reward
              </h1>
              <p className="text-sm/6 text-emerald-100/90">Drag chips to the felt, or use the toolbox to place compound bets. Switch European/American wheels.</p>
            </div>
            <div className="flex items-center gap-2">
              <Toggle pressed={wheel === "european"} onPressedChange={() => !locked && setWheel("european") }>
                European (1×0)
              </Toggle>
              <Toggle pressed={wheel === "american"} onPressedChange={() => !locked && setWheel("american") }>
                American (0 & 00)
              </Toggle>
              <Button variant="secondary" onClick={clearAll} title="Reset"><Trash2 className="w-4 h-4 mr-2"/>Reset</Button>
              <Button onClick={() => setLocked(true)} disabled={locked || placed.length === 0} title="Freeze current bet and show result">Calculate</Button>
            </div>
          </div>
        </div>

        {/* Chips row */}
        <Card className="shadow-xl border-4 border-[#e7b66a] rounded-2xl overflow-hidden">
          <CardContent className="p-3 md:p-4 bg-[#0e5a31]" style={{ backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 2px, rgba(0,0,0,0.04) 2px 4px)" }}>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-emerald-50/90">Chips:</span>
              {DENOMINATIONS.map((v) => (
                <Chip key={v} value={v} />
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Table */}
          <Card className="lg:col-span-2 shadow-2xl border-4 border-[#e7b66a] rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              {/* Felt frame */}
              <div className="p-3 md:p-4 bg-[#0e5a31]" style={{
                backgroundImage:
                  "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.08), rgba(0,0,0,0.0) 40%), repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0 2px, rgba(0,0,0,0.03) 2px 4px)",
                boxShadow: "inset 0 8px 24px rgba(0,0,0,0.35)",
              }}>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    {/* Zero / Double Zero */}
                    <div className="w-16 flex flex-col gap-2">
                      <Cell color="green" onDrop={handleDropOnArea(straightAreaId("0"))} onDragOver={allowDrop}>0</Cell>
                      {wheel === "american" && (
                        <Cell color="green" onDrop={handleDropOnArea(straightAreaId("00"))} onDragOver={allowDrop}>00</Cell>
                      )}
                    </div>

                    {/* 1–36 grid */}
                    <div className="grid grid-cols-3 gap-2 flex-1">
                      {Array.from({ length: 36 }, (_, i) => 36 - i).map((n) => (
                        <Cell key={n} color={COLORS[n]} onDrop={handleDropOnArea(straightAreaId(n))} onDragOver={allowDrop}>
                          {n}
                        </Cell>
                      ))}
                    </div>

                    {/* Column bets */}
                    <div className="w-28 flex flex-col gap-2">
                      {[1, 2, 3].map((i) => (
                        <Cell key={i} onDrop={handleDropOnArea(`col-${i}`)} onDragOver={allowDrop}>
                          Col {i}
                        </Cell>
                      ))}
                    </div>
                  </div>

                  {/* Dozens & Even-Money row */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "dozen-1", label: "1st 12" },
                      { id: "dozen-2", label: "2nd 12" },
                      { id: "dozen-3", label: "3rd 12" },
                    ].map((d) => (
                      <Cell key={d.id} onDrop={handleDropOnArea(d.id)} onDragOver={allowDrop}>{d.label}</Cell>
                    ))}
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {[
                      { id: "low", label: "1-18" },
                      { id: "even", label: "Even" },
                      { id: "red", label: "Red" },
                      { id: "black", label: "Black" },
                      { id: "odd", label: "Odd" },
                      { id: "high", label: "19-36" },
                    ].map((d) => (
                      <Cell key={d.id} onDrop={handleDropOnArea(d.id)} onDragOver={allowDrop}>{d.label}</Cell>
                    ))}
                  </div>

                  {wheel === "american" && (
                    <div>
                      <Cell onDrop={handleDropOnArea("topline")} onDragOver={allowDrop}>0-00-1-2-3 (Top Line)</Cell>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card className="shadow-xl border-4 border-[#e7b66a] rounded-2xl overflow-hidden">
              <CardContent className="p-3 md:p-4 bg-[#0e5a31]" style={{ backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 2px, rgba(0,0,0,0.04) 2px 4px)" }}>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-emerald-50">Your Bet</h2>
                  <span className="text-sm text-emerald-100/90">Mode: Single-run calculator</span>
                </div>

                {placed.length === 0 ? (
                  <p className="text-sm text-emerald-100/80">Drag a chip onto a table area to set your single bet, then click <b>Calculate</b>.</p>
                ) : (
                  <div className="space-y-2">
                    {placed.map((b) => {
                      const a = areaMap.get(b.areaId)!;
                      return (
                        <div key={b.id} className="flex items-center justify-between gap-2 p-2 rounded-md border bg-white/5 text-white">
                          <div className="text-sm">
                            <div className="font-medium">{a.label}</div>
                            <div className="text-emerald-100/80">Stake: {b.amount} • Payout {a.payout}:1</div>
                          </div>
                          {!locked && (
                            <Button size="sm" variant="secondary" onClick={() => setPlaced([])}>Change Bet</Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-xl border-4 border-[#e7b66a] rounded-2xl overflow-hidden">
              <CardContent className="p-3 md:p-4 bg-[#0e5a31]" style={{ backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 2px, rgba(0,0,0,0.04) 2px 4px)" }}>
                <div className="flex items-center gap-2 text-white"><Info className="w-4 h-4"/><h2 className="font-semibold">Compound Bet Toolbox</h2></div>
                <Tabs defaultValue="inside">
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="inside">Inside</TabsTrigger>
                    <TabsTrigger value="outside">Outside</TabsTrigger>
                    <TabsTrigger value="quick">Quick</TabsTrigger>
                  </TabsList>
                  <TabsContent value="inside" className="space-y-2 max-h-52 overflow-auto">
                    {areas.filter(a => a.kind === "inside" && !a.id.startsWith("straight-")).slice(0, 120).map((a) => (
                      <ToolboxRow key={a.id} a={a} onAdd={addBet} />
                    ))}
                  </TabsContent>
                  <TabsContent value="outside" className="space-y-2">
                    {areas.filter(a => a.kind !== "inside" || a.id.startsWith("col-") || a.id.startsWith("dozen-") || ["red","black","even","odd","low","high","topline"].includes(a.id)).map((a) => (
                      <ToolboxRow key={a.id} a={a} onAdd={addBet} />
                    ))}
                  </TabsContent>
                  <TabsContent value="quick" className="space-y-2">
                    <QuickPreset label="All Reds" targetId="red" onAdd={addBet} />
                    <QuickPreset label="All Blacks" targetId="black" onAdd={addBet} />
                    <QuickPreset label="1st 12" targetId="dozen-1" onAdd={addBet} />
                    <QuickPreset label="Middle Column" targetId="col-2" onAdd={addBet} />
                    {wheel === "american" && (
                      <QuickPreset label="Top Line (0-00-1-2-3)" targetId="topline" onAdd={addBet} />
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card className="shadow-xl border-4 border-[#e7b66a] rounded-2xl overflow-hidden">
              <CardContent className="p-3 md:p-4 bg-[#0e5a31]" style={{ backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 2px, rgba(0,0,0,0.04) 2px 4px)" }}>
                <div className="flex items-center gap-2 text-white"><PieChart className="w-4 h-4"/><h2 className="font-semibold">Result</h2></div>
                {activeArea && perBetStats && placed.length === 1 ? (
                  <div className="text-sm space-y-2 text-emerald-50">
                    <div className="font-medium">Bet: {activeArea.label} ({activeArea.kind})</div>
                    <div>Numbers covered: <b>{activeArea.covered.length}</b> / {slotsCount}</div>
                    <div>Win probability: <b>{(perBetStats.pWin * 100).toFixed(2)}%</b> ({perBetStats.pWin.toFixed(4)})</div>
                    <div>Payout: <b>{activeArea.payout}:1</b> • Risk/Reward: <b>{perBetStats.rr}</b></div>
                    <div>Stake: <b>{perBetStats.stake}</b> • Win profit if it hits: <b>{perBetStats.profitIfWin}</b></div>
                    <div className="pt-1 border-t border-white/20">Expected value (EV) for this spin: <b>{perBetStats.ev.toFixed(3)}</b></div>
                    {!locked && <p className="text-emerald-100/80">Press <b>Calculate</b> to freeze this result. Use <b>Reset</b> to start over.</p>}
                  </div>
                ) : (
                  <p className="text-sm text-emerald-100/80">Set a bet and click <b>Calculate</b> to see the result.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <footer className="text-xs text-emerald-100/80 text-center pt-2">
          Payouts: Straight 35:1, Split 17:1, Street 11:1, Corner 8:1, Line 5:1, Dozen/Column 2:1, Even-money 1:1. American adds 00 and Top Line 6:1.
        </footer>
      </div>
    </div>
  );
}

function ToolboxRow({ a, onAdd }: { a: BetArea; onAdd: (id: string, amt: number) => void }) {
  const [amt, setAmt] = useState(10);
  return (
    <div className="flex items-center justify-between gap-2 p-2 rounded-md border bg-white/5 text-white">
      <div>
        <div className="text-sm font-medium">{a.label}</div>
        <div className="text-xs text-emerald-100/80">Payout {a.payout}:1 • Covers {a.covered.length} numbers</div>
      </div>
      <div className="flex items-center gap-2">
  <input title="amount" type="number" className="w-20 px-2 py-1 border rounded-md bg-white/10" value={amt} min={1} onChange={(e) => setAmt(Number(e.target.value) || 0)} />
        <Button onClick={() => onAdd(a.id, Math.max(1, amt))}>Add</Button>
      </div>
    </div>
  );
}

function QuickPreset({ label, targetId, onAdd }: { label: string; targetId: string; onAdd: (id: string, amt: number) => void }) {
  const [amt, setAmt] = useState(10);
  return (
    <div className="flex items-center justify-between gap-2 p-2 rounded-md border bg-white/5 text-white">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex items-center gap-2">
  <input title="amount" type="number" className="w-20 px-2 py-1 border rounded-md bg-white/10" value={amt} min={1} onChange={(e) => setAmt(Number(e.target.value) || 0)} />
        <Button onClick={() => onAdd(targetId, Math.max(1, amt))}>Add</Button>
      </div>
    </div>
  );
}
