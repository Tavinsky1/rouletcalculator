import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { X, Trash2 } from "lucide-react";
import { calculatePreciseRiskReward, type PreciseRiskReward } from "./utils/ev";

/**
 * Mobile-First Authentic Roulette Risk/Reward Calculator
 * Focus: Visual roulette table + precise risk calculations
 */

// ---- Config ----
const CHIP_VALUES = [1, 5, 10, 25, 50, 100];

const COLORS: Record<number | "0" | "00", "red" | "black" | "green"> = {
  0: "green", "00": "green",
  1: "red", 2: "black", 3: "red", 4: "black", 5: "red", 6: "black",
  7: "red", 8: "black", 9: "red", 10: "black", 11: "black", 12: "red",
  13: "black", 14: "red", 15: "black", 16: "red", 17: "black", 18: "red",
  19: "red", 20: "black", 21: "red", 22: "black", 23: "red", 24: "black",
  25: "red", 26: "black", 27: "red", 28: "black", 29: "black", 30: "red",
  31: "black", 32: "red", 33: "black", 34: "red", 35: "black", 36: "red",
};

// ---- Types ----
export type WheelType = "european" | "american";
export type Slot = number | "0" | "00";
export type BetArea = {
  id: string;
  label: string;
  covered: Slot[];
  payout: number;
  kind: "inside" | "outside" | "special";
};
export type PlacedBet = { id: string; areaId: string; amount: number; };

// Track multiple bets per area
type BetSummary = {
  areaId: string;
  totalAmount: number;
  betCount: number;
  bets: PlacedBet[];
};

// ---- Build betting areas ----
export function buildBetAreas(wheel: WheelType): BetArea[] {
  const slots = wheel === "european" ? 
    ["0", ...Array.from({length: 36}, (_, i) => i + 1)] :
    ["0", ...Array.from({length: 36}, (_, i) => i + 1), "00"];
  
  const onlyNums = slots.filter(s => typeof s === "number") as number[];
  const areas: BetArea[] = [];
  
  // Straights
  slots.forEach(n => {
    areas.push({ id: `straight-${n}`, label: `${n}`, covered: [n as Slot], payout: 35, kind: "inside" });
  });
  
  // Outside bets (most common)
  const reds = onlyNums.filter(n => COLORS[n] === "red");
  const blacks = onlyNums.filter(n => COLORS[n] === "black");
  
  areas.push(
    { id: "red", label: "Red", covered: reds, payout: 1, kind: "outside" },
    { id: "black", label: "Black", covered: blacks, payout: 1, kind: "outside" },
    { id: "even", label: "Even", covered: onlyNums.filter(n => n % 2 === 0), payout: 1, kind: "outside" },
    { id: "odd", label: "Odd", covered: onlyNums.filter(n => n % 2 === 1), payout: 1, kind: "outside" },
    { id: "low", label: "1-18", covered: onlyNums.filter(n => n <= 18), payout: 1, kind: "outside" },
    { id: "high", label: "19-36", covered: onlyNums.filter(n => n >= 19), payout: 1, kind: "outside" },
    { id: "dozen-1", label: "1st 12", covered: onlyNums.slice(0, 12), payout: 2, kind: "outside" },
    { id: "dozen-2", label: "2nd 12", covered: onlyNums.slice(12, 24), payout: 2, kind: "outside" },
    { id: "dozen-3", label: "3rd 12", covered: onlyNums.slice(24, 36), payout: 2, kind: "outside" }
  );
  
  return areas;
}

// ---- UI Components ----
function Cell({ children, color, onDrop, onDragOver, className = "", chipCount = 0, betAmount = 0 }: { 
  children: React.ReactNode; 
  color?: "red" | "black" | "green"; 
  onDrop?: (e: React.DragEvent) => void; 
  onDragOver?: (e: React.DragEvent) => void;
  className?: string;
  chipCount?: number;
  betAmount?: number;
}) {
  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      className={`cell-base ${color ? `cell-${color}` : 'cell-neutral'} ${className} ${chipCount > 0 ? 'relative' : ''}`}
    >
      <span className="cell-label">{children}</span>
      {chipCount > 0 && (
        <div className="chip-stack-indicator">
          {chipCount}
        </div>
      )}
      {betAmount > 0 && (
        <div className="absolute bottom-0 right-0 bg-yellow-400 text-black text-xs px-1 rounded-tl font-bold">
          ${betAmount}
        </div>
      )}
    </div>
  );
}

function MiniChip({ value, onDrag }: { value: number; onDrag: (value: number) => void }) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", String(value));
    onDrag(value);
  };
  
  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={`chip-mini chip-${value} cursor-grab active:cursor-grabbing`}
    >
      {value}
    </div>
  );
}

function PreciseDisplay({ data, onClose }: { data: PreciseRiskReward; onClose: () => void }) {
  const isCombined = data.betType.includes("Combined");
  
  return (
    <>
      <div className="risk-reward-backdrop" onClick={onClose}></div>
      <div className="risk-reward-display">
        <div className="risk-reward-title">{data.betType}</div>
        <div className="risk-reward-stats">
          <div>💰 Total Stake: ${data.stake}</div>
          
          {/* RISK/REWARD RATIO - The KEY feature */}
          <div className="risk-reward-highlight">
            🎯 RISK/REWARD RATIO: {data.riskRewardRatio}
          </div>
          
          {/* REWARD BANNER - Separate section for dollar amounts */}
          <div className="reward-banner">
            💵 POTENTIAL REWARD: $${data.stake} → $${data.bestCase} ({(data.bestCase / data.stake).toFixed(1)}x Return)
          </div>
          
          {!isCombined && data.winProbability !== "Multiple" && (
            <div>📊 Win Probability: {data.winProbability} ({data.winProbabilityPercent.toFixed(2)}%)</div>
          )}
          <div className="exact-calculation">� Expected Value: ${data.expectedValue.toFixed(4)}</div>
          <div>🏠 House Edge: {(data.houseEdge * 100).toFixed(2)}%</div>
          <div>✅ Best Case: +${data.bestCase}</div>
          <div>❌ Worst Case: ${data.worstCase}</div>
          {isCombined && (
            <div className="combo-note">
              📋 Combined analysis of all your table bets
            </div>
          )}
        </div>
        <Button onClick={onClose} className="mt-4 w-full bg-red-600 hover:bg-red-700">
          <X className="w-4 h-4 mr-2" />Close
        </Button>
      </div>
    </>
  );
}

// ---- Main App ----
export default function RouletteApp() {
  const [wheel] = useState<WheelType>("european");
  const areas = useMemo(() => buildBetAreas(wheel), [wheel]);
  const slots = useMemo(() => (wheel === "european" ? 37 : 38), [wheel]);
  
  const [allBets, setAllBets] = useState<PlacedBet[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<PreciseRiskReward | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [selectedChip, setSelectedChip] = useState<number | null>(null);
  
  const areaMap = useMemo(() => new Map(areas.map(a => [a.id, a])), [areas]);
  
  // Group bets by area for display
  const betSummaries = useMemo(() => {
    const summaries = new Map<string, BetSummary>();
    
    allBets.forEach(bet => {
      if (!summaries.has(bet.areaId)) {
        summaries.set(bet.areaId, {
          areaId: bet.areaId,
          totalAmount: 0,
          betCount: 0,
          bets: []
        });
      }
      
      const summary = summaries.get(bet.areaId)!;
      summary.totalAmount += bet.amount;
      summary.betCount += 1;
      summary.bets.push(bet);
    });
    
    return summaries;
  }, [allBets]);

  // Get current bet info for display
  const currentBet = selectedAreaId ? {
    area: areaMap.get(selectedAreaId),
    amount: selectedChip || 0
  } : null;
  
  const totalBetAmount = useMemo(() => 
    allBets.reduce((sum, bet) => sum + bet.amount, 0), [allBets]
  );

  // Handle chip selection
  const setChipValue = (value: number) => {
    setSelectedChip(value);
  };

  // Clear all bets
  const clearBet = () => {
    setAllBets([]);
    setSelectedAreaId(null);
    setSelectedChip(null);
    setShowResult(false);
  };
  
  const handleDrop = (areaId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    const value = Number(e.dataTransfer.getData("text/plain"));
    if (!value) return;
    
    // Add new bet to existing bets
    const newBet: PlacedBet = { 
      id: `${areaId}-${Date.now()}-${Math.random()}`, 
      areaId, 
      amount: value 
    };
    
    setAllBets(prev => [...prev, newBet]);
    setSelectedAreaId(areaId);
  };

  // Calculate risk/reward for all current bets
  const calculateRiskReward = () => {
    if (allBets.length === 0) return;
    
    // Group bets by area and calculate combined results
    const betsByArea = new Map<string, number>();
    allBets.forEach(bet => {
      const current = betsByArea.get(bet.areaId) || 0;
      betsByArea.set(bet.areaId, current + bet.amount);
    });
    
    // If only one bet type, use the original precise calculation
    if (betsByArea.size === 1) {
      const [areaId, amount] = Array.from(betsByArea.entries())[0];
      const area = areaMap.get(areaId);
      if (area) {
        const bet = { id: 'single', areaId, amount };
        const precise = calculatePreciseRiskReward(bet, area, slots);
        setResult(precise);
        setShowResult(true);
      }
      return;
    }
    
    // Multiple bet types - calculate combined results
    let totalStake = 0;
    let totalExpectedValue = 0;
    let bestCaseWin = 0;
    let worstCase = 0;
    const betDetails: string[] = [];
    
    betsByArea.forEach((amount, areaId) => {
      const area = areaMap.get(areaId);
      if (area) {
        const bet = { id: 'calc', areaId, amount };
        const precise = calculatePreciseRiskReward(bet, area, slots);
        
        totalStake += amount;
        totalExpectedValue += precise.expectedValue;
        bestCaseWin += precise.bestCase;
        worstCase -= amount;
        
        betDetails.push(`${area.label}: $${amount} (${precise.riskRewardRatio})`);
      }
    });
    
    // Create combined result
    const combinedResult: PreciseRiskReward = {
      betType: `${betsByArea.size} Combined Bets`,
      stake: totalStake,
      winProbability: "Multiple", 
      winProbabilityPercent: 0,
      payout: bestCaseWin / totalStake, // Overall payout multiplier
      riskRewardRatio: `1:${Math.round(bestCaseWin / totalStake)}`, // Clean ratio format
      expectedValue: totalExpectedValue,
      houseEdge: Math.abs(totalExpectedValue) / totalStake,
      bestCase: bestCaseWin,
      worstCase: worstCase
    };
    
    setResult(combinedResult);
    setShowResult(true);
  };
  
  const allowDrop = (e: React.DragEvent) => e.preventDefault();
  
  const clearAllBets = () => {
    setAllBets([]);
    setShowResult(false);
    setResult(null);
    setSelectedAreaId(null);
  };
  
  const clearAreaBets = (areaId: string) => {
    setAllBets(prev => prev.filter(bet => bet.areaId !== areaId));
    if (selectedAreaId === areaId) {
      setShowResult(false);
      setResult(null);
      setSelectedAreaId(null);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col app-wood-bg">
      {/* Top calculate button - appears when bets are placed */}
      {allBets.length > 0 && (
        <div className="top-calculate-section p-4 bg-black/30">
          <div className="flex justify-center gap-3 mb-2">
            <Button 
              onClick={calculateRiskReward} 
              size="lg" 
              className="calculate-button px-8 py-3 text-lg font-bold"
            >
              🎯 Calculate Risk/Reward
            </Button>
            <Button onClick={clearBet} size="sm" variant="secondary" className="px-4">
              Clear All
            </Button>
          </div>
          <div className="text-center text-white">
            <div className="text-lg font-bold">
              Total Bets: ${totalBetAmount} • {allBets.length} bet{allBets.length > 1 ? 's' : ''} placed
            </div>
          </div>
        </div>
      )}

      {/* Compact Authentic Roulette Table */}
      <div className="flex-1 p-1 flex items-start justify-center pt-2">
        <div className="w-full max-w-sm mx-auto">
          {/* European Roulette Layout */}
          <div className="roulette-table bg-green-800 border-4 border-yellow-600 rounded-lg p-2">{/* Zero section */}
            <div className="roulette-zeros mb-1">
              <Cell 
                color="green" 
                onDrop={handleDrop("straight-0")} 
                onDragOver={allowDrop}
                chipCount={betSummaries.get("straight-0")?.betCount || 0}
                betAmount={betSummaries.get("straight-0")?.totalAmount || 0}
              >
                0
              </Cell>
            </div>
            
            {/* Main number grid (3x12) - authentic casino layout */}
            <div className="roulette-grid mb-2">
              {/* Row 3: 3,6,9,12... */}
              {Array.from({length: 12}, (_, i) => 3 + i * 3).reverse().map(n => (
                <Cell 
                  key={n} 
                  color={COLORS[n]} 
                  onDrop={handleDrop(`straight-${n}`)} 
                  onDragOver={allowDrop}
                  chipCount={betSummaries.get(`straight-${n}`)?.betCount || 0}
                  betAmount={betSummaries.get(`straight-${n}`)?.totalAmount || 0}
                >
                  {n}
                </Cell>
              ))}
              {/* Row 2: 2,5,8,11... */}
              {Array.from({length: 12}, (_, i) => 2 + i * 3).reverse().map(n => (
                <Cell 
                  key={n} 
                  color={COLORS[n]} 
                  onDrop={handleDrop(`straight-${n}`)} 
                  onDragOver={allowDrop}
                  chipCount={betSummaries.get(`straight-${n}`)?.betCount || 0}
                  betAmount={betSummaries.get(`straight-${n}`)?.totalAmount || 0}
                >
                  {n}
                </Cell>
              ))}
              {/* Row 1: 1,4,7,10... */}
              {Array.from({length: 12}, (_, i) => 1 + i * 3).reverse().map(n => (
                <Cell 
                  key={n} 
                  color={COLORS[n]} 
                  onDrop={handleDrop(`straight-${n}`)} 
                  onDragOver={allowDrop}
                  chipCount={betSummaries.get(`straight-${n}`)?.betCount || 0}
                  betAmount={betSummaries.get(`straight-${n}`)?.totalAmount || 0}
                >
                  {n}
                </Cell>
              ))}
            </div>
            
            {/* Outside bets */}
            <div className="outside-bets grid-cols-6 gap-1">
              <Cell 
                onDrop={handleDrop("low")} 
                onDragOver={allowDrop} 
                className="text-xs"
                chipCount={betSummaries.get("low")?.betCount || 0}
                betAmount={betSummaries.get("low")?.totalAmount || 0}
              >1-18</Cell>
              <Cell 
                onDrop={handleDrop("even")} 
                onDragOver={allowDrop} 
                className="text-xs"
                chipCount={betSummaries.get("even")?.betCount || 0}
                betAmount={betSummaries.get("even")?.totalAmount || 0}
              >Even</Cell>
              <Cell 
                onDrop={handleDrop("red")} 
                onDragOver={allowDrop} 
                className="text-xs bg-red-600"
                chipCount={betSummaries.get("red")?.betCount || 0}
                betAmount={betSummaries.get("red")?.totalAmount || 0}
              >◆</Cell>
              <Cell 
                onDrop={handleDrop("black")} 
                onDragOver={allowDrop} 
                className="text-xs bg-black"
                chipCount={betSummaries.get("black")?.betCount || 0}
                betAmount={betSummaries.get("black")?.totalAmount || 0}
              >◆</Cell>
              <Cell 
                onDrop={handleDrop("odd")} 
                onDragOver={allowDrop} 
                className="text-xs"
                chipCount={betSummaries.get("odd")?.betCount || 0}
                betAmount={betSummaries.get("odd")?.totalAmount || 0}
              >Odd</Cell>
              <Cell 
                onDrop={handleDrop("high")} 
                onDragOver={allowDrop} 
                className="text-xs"
                chipCount={betSummaries.get("high")?.betCount || 0}
                betAmount={betSummaries.get("high")?.totalAmount || 0}
              >19-36</Cell>
            </div>
            
            {/* Dozens */}
            <div className="outside-bets grid-cols-3 gap-1 mt-1">
              <Cell 
                onDrop={handleDrop("dozen-1")} 
                onDragOver={allowDrop} 
                className="text-xs"
                chipCount={betSummaries.get("dozen-1")?.betCount || 0}
                betAmount={betSummaries.get("dozen-1")?.totalAmount || 0}
              >1st 12</Cell>
              <Cell 
                onDrop={handleDrop("dozen-2")} 
                onDragOver={allowDrop} 
                className="text-xs"
                chipCount={betSummaries.get("dozen-2")?.betCount || 0}
                betAmount={betSummaries.get("dozen-2")?.totalAmount || 0}
              >2nd 12</Cell>
              <Cell 
                onDrop={handleDrop("dozen-3")} 
                onDragOver={allowDrop} 
                className="text-xs"
                chipCount={betSummaries.get("dozen-3")?.betCount || 0}
                betAmount={betSummaries.get("dozen-3")?.totalAmount || 0}
              >3rd 12</Cell>
            </div>
          </div>
        </div>
      </div>
      
      {/* Enhanced bottom UI with centered chips and prominent Calculate button */}
      <div className="minimal-ui">
        {/* Centered chips section */}
        <div className="flex justify-center mb-4">
          <div className="flex gap-4 bg-black/50 p-4 rounded-lg border-2 border-yellow-500/30">
            {CHIP_VALUES.map(value => (
              <MiniChip key={value} value={value} onDrag={setChipValue} />
            ))}
          </div>
        </div>
        
        {/* Status and prominent Calculate button */}
        <div className="flex flex-col items-center gap-3">
          <div className="text-white text-center">
            <div className="text-lg font-bold mb-1">
              {totalBetAmount > 0 ? `Total Bets: $${totalBetAmount}` : 'Select chips and place your bets!'}
            </div>
            <div className="text-sm text-gray-300">
              {allBets.length === 0 ? 'Drag chips from above to the roulette table' : `${allBets.length} bet${allBets.length > 1 ? 's' : ''} placed`}
            </div>
          </div>
          
          {/* Additional action buttons if needed can go here */}
        </div>
      </div>
      
      {/* Precise Risk/Reward Display */}
      {showResult && result && (
        <PreciseDisplay data={result} onClose={() => setShowResult(false)} />
      )}
    </div>
  );
}
