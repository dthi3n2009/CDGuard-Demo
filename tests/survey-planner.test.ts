import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSurveyPlan, SURVEY_BUDGETS } from '../src/utils/surveyPlanner';

const config = { length: 100, width: 100, rowSpacing: 8, treeSpacing: 8, startDate: '2026-09-06' };
const key = (p: { row: number; col: number }) => `${p.row}:${p.col}`;

test('1ha plan has 124 unique trees, 48 points per day and unchanged anchors', () => {
  const plan = createSurveyPlan(config);
  assert.equal(plan.total, 144);
  assert.equal(plan.uniqueTrees, 124);
  const anchors = plan.days[0].filter(p => p.fixed).map(key).sort();
  const rotating = new Set<string>();
  for (const day of plan.days) {
    assert.equal(day.length, 16);
    assert.deepEqual(day.filter(p => p.fixed).map(key).sort(), anchors);
    assert.equal(new Set(day.map(key)).size, day.length);
    for (const p of day.filter(p => !p.fixed)) {
      assert.ok(!rotating.has(key(p)) && !anchors.includes(key(p)));
      rotating.add(key(p));
    }
  }
  assert.equal(rotating.size, 120);
});

test('all square presets and rectangle dimensions stay in bounds, repeat deterministically', () => {
  for (let side = 100; side <= 1000; side += 50) {
    for (const width of [side, 100]) {
      const input = { ...config, length: side, width };
      const plan = createSurveyPlan(input);
      assert.deepEqual(plan, createSurveyPlan(input));
      const unique = new Set(plan.days.flat().map(key));
      assert.equal(unique.size, plan.uniqueTrees);
      assert.ok(plan.uniqueTrees <= plan.total);
      for (const p of plan.days.flat()) {
        assert.ok(p.x >= 4 && p.x <= width - 4);
        assert.ok(p.y >= 4 && p.y <= side - 4);
      }
    }
  }
  for (const budget of SURVEY_BUDGETS) {
    const plan = createSurveyPlan({ ...config, length: budget.side, width: budget.side });
    assert.equal(plan.fixedCount, budget.fixed);
    assert.equal(plan.days[0].length, budget.fixed + budget.rotating);
  }
});

test('tiny and narrow gardens exhaust available trees without duplicates or a loop', () => {
  for (const [length, width] of [[8, 8], [16, 16], [1000, 8], [8, 1000]]) {
    const plan = createSurveyPlan({ ...config, length, width });
    assert.ok(plan.uniqueTrees <= plan.total);
    for (const day of plan.days) assert.equal(new Set(day.map(key)).size, day.length);
  }
});

test('invalid inputs are rejected', () => {
  for (const patch of [{ length: 0 }, { width: NaN }, { length: 1001 }, { rowSpacing: 0 }, { treeSpacing: 101 }, { startDate: '' }]) {
    assert.throws(() => createSurveyPlan({ ...config, ...patch }));
  }
});
