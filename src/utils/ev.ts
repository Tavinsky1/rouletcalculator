import type { BetArea, PlacedBet, Slot } from "../RouletteApp";

export function computeEVForPlacedBets(placed: PlacedBet[], areas: Map<string, BetArea>, slots: Slot[]) {
  if (placed.length === 0) return null;
  let totalEV = 0;
  for (const outcome of slots) {
    let net = 0;
    for (const b of placed) {
      const area = areas.get(b.areaId)!;
      const wins = area.covered.some((n) => n === outcome);
      if (wins) net += area.payout * b.amount; else net -= b.amount;
    }
    totalEV += net;
  }
  return totalEV / slots.length;
}
