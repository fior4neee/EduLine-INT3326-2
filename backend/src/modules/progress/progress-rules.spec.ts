import { courseProgressPercent, ratioPercent, videoPercent } from './progress-rules';

describe('videoPercent', () => {
  it.each([
    [300, 600, 50],
    [540, 600, 90],
    [599, 600, 99],
    [0, 600, 0],
    [610, 600, 100], // player overshoots the end
  ])('%i s of %i s is %i%%', (pos, dur, pct) => {
    expect(videoPercent(pos, dur)).toBe(pct);
  });
});

describe('courseProgressPercent', () => {
  it('rounds down, so 100 means every lesson is done', () => {
    expect(courseProgressPercent(2, 3)).toBe(66);
    expect(courseProgressPercent(299, 300)).toBe(99);
    expect(courseProgressPercent(3, 3)).toBe(100);
  });
  it('is 0 for a course with no lessons', () => {
    expect(courseProgressPercent(0, 0)).toBe(0);
  });
});

describe('ratioPercent', () => {
  it('rounds to a whole number and returns null with nothing to measure', () => {
    expect(ratioPercent(1, 3)).toBe(33);
    expect(ratioPercent(2, 3)).toBe(67);
    expect(ratioPercent(0, 0)).toBeNull();
  });
});
