import { distanceMeters } from './geo';

describe('distanceMeters', () => {
  it('returns ~0 for same point', () => {
    expect(distanceMeters(115.857, 28.687, 115.857, 28.687)).toBeLessThan(1);
  });

  it('computes short distance within city scale', () => {
    // ~100m-ish offset
    const d = distanceMeters(115.857, 28.687, 115.858, 28.687);
    expect(d).toBeGreaterThan(50);
    expect(d).toBeLessThan(200);
  });
});
