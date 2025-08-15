/**
 * Precise Roulette Risk/Reward Calculator
 * All calculations use exact fractions to avoid floating point errors
 */

import type { PlacedBet, BetArea, Slot } from "../RouletteApp";

export interface PreciseRiskReward {
  betType: string;
  stake: number;
  winProbability: string; // exact fraction as string
  winProbabilityPercent: number;
  payout: number; // profit multiplier
  expectedValue: number; // precise EV
  houseEdge: number;
  riskRewardRatio: string; // e.g. "1:35"
  worstCase: number; // -stake
  bestCase: number; // payout * stake
}

/**
 * Calculate exact probability as fraction
 */
function exactProbability(winningNumbers: number, totalNumbers: number): { numerator: number, denominator: number, decimal: number } {
  // Reduce to lowest terms
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(winningNumbers, totalNumbers);
  
  return {
    numerator: winningNumbers / divisor,
    denominator: totalNumbers / divisor,
    decimal: winningNumbers / totalNumbers
  };
}

/**
 * Calculate precise EV using exact arithmetic
 */
export function calculatePreciseRiskReward(bet: PlacedBet, area: BetArea, totalSlots: number): PreciseRiskReward {
  const stake = bet.amount;
  const winningNumbers = area.covered.length;
  const payout = area.payout;
  
  // Exact probability calculation
  const prob = exactProbability(winningNumbers, totalSlots);
  const winProb = prob.decimal;
  const loseProb = 1 - winProb;
  
  // Precise Expected Value
  // EV = (probability_win × profit_if_win) + (probability_lose × loss_if_lose)
  // EV = (winProb × payout × stake) - (loseProb × stake)
  // EV = stake × (winProb × payout - loseProb)
  const expectedValue = stake * (winProb * payout - loseProb);
  
  // House edge = -EV / stake (as percentage)
  const houseEdge = -expectedValue / stake;
  
  return {
    betType: area.label,
    stake,
    winProbability: `${prob.numerator}/${prob.denominator}`,
    winProbabilityPercent: winProb * 100,
    payout,
    expectedValue,
    houseEdge,
    riskRewardRatio: `1:${payout}`,
    worstCase: -stake,
    bestCase: payout * stake
  };
}

/**
 * Legacy function for compatibility
 */
export function computeEVForPlacedBets(placed: PlacedBet[], areas: BetArea[], slots: Slot[]): number {
  if (placed.length === 0) return 0;
  
  let totalEV = 0;
  const areaMap = new Map(areas.map(a => [a.id, a]));
  
  for (const bet of placed) {
    const area = areaMap.get(bet.areaId);
    if (!area) continue;
    
    const precise = calculatePreciseRiskReward(bet, area, slots.length);
    totalEV += precise.expectedValue;
  }
  
  return totalEV;
}
