import { describe, it, expect } from 'vitest';
import { computeEVForPlacedBets } from '../src/utils/ev';
import { buildBetAreas } from '../src/RouletteApp';

describe('EV utility', () => {
  it('calculates EV for a straight on european wheel', () => {
    const areas = buildBetAreas('european');
    const areaMap = new Map(areas.map(a => [a.id, a]));
    const slots = (['0', ...Array.from({length:36}, (_,i)=>i+1)] as (number|'0')[]);
    const placed = [{ id: 'b1', areaId: 'straight-17', amount: 1 }];
    const ev = computeEVForPlacedBets(placed as any, areaMap as any, slots as any);
    // For straight: win pays 35, probability 1/37, EV = (1/37)*35 - (36/37)*1 = -1/37 ≈ -0.027027
    expect(Number(ev!.toFixed(6))).toBe(Number((-(1/37)).toFixed(6)));
  });

  it('calculates EV for even-money bet (red) on european wheel', () => {
    const areas = buildBetAreas('european');
    const areaMap = new Map(areas.map(a => [a.id, a]));
    const slots = (['0', ...Array.from({length:36}, (_,i)=>i+1)] as (number|'0')[]);
    const placed = [{ id: 'b1', areaId: 'red', amount: 1 }];
    const ev = computeEVForPlacedBets(placed as any, areaMap as any, slots as any);
    // Reds: 18/37 win, payout 1 -> EV = (18/37)*1 - (19/37)*1 = -1/37
    expect(Number(ev!.toFixed(6))).toBe(Number((-(1/37)).toFixed(6)));
  });
});
