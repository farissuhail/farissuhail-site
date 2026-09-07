/* ZF 8HP application matrix: ZF passenger-car transmission brochure (2017).
   These are the five gear-selection elements, excluding converter lock-up.
   BMW F26 petrol specifications, valid July 2014. Not VIN-verified. */
export const bmwElements = ['A', 'B', 'C', 'D', 'E'];

export const bmwRatios = {
  1: 4.714, 2: 3.143, 3: 2.106, 4: 1.667, 5: 1.285, 6: 1, 7: 0.839, 8: 0.667, R: 3.295
};

export const bmwEngagements = {
  1: ['A', 'B', 'C'], 2: ['A', 'B', 'E'], 3: ['B', 'C', 'E'], 4: ['B', 'D', 'E'],
  5: ['B', 'C', 'D'], 6: ['C', 'D', 'E'], 7: ['A', 'C', 'D'], 8: ['A', 'D', 'E'], R: ['A', 'B', 'D']
};

export function appliedBmwElements(mode, gear) {
  return mode === 'R' ? bmwEngagements.R : mode === 'D' ? (bmwEngagements[String(gear)] || []) : [];
}
