export interface SurveyConfig {
  length: number;
  width: number;
  rowSpacing: number;
  treeSpacing: number;
  startDate: string;
}

export interface SurveyPoint {
  row: number;
  col: number;
  x: number;
  y: number;
  fixed: boolean;
}

// Pilot workload budgets, not validated agronomic sample-size requirements.
export const SURVEY_BUDGETS = [
  { side: 100, fixed: 4, rotating: 12 },
  { side: 150, fixed: 4, rotating: 16 },
  { side: 200, fixed: 4, rotating: 20 },
  { side: 250, fixed: 6, rotating: 24 },
  { side: 300, fixed: 6, rotating: 30 },
  { side: 400, fixed: 8, rotating: 40 },
  { side: 500, fixed: 10, rotating: 50 },
  { side: 750, fixed: 16, rotating: 80 },
  { side: 1000, fixed: 20, rotating: 100 },
];

export function createSurveyPlan(config: SurveyConfig) {
  const { length, width, rowSpacing, treeSpacing } = config;
  if (![length, width, rowSpacing, treeSpacing].every(Number.isFinite) ||
      length <= 0 || width <= 0 || length > 1000 || width > 1000 ||
      rowSpacing < 2 || treeSpacing < 2 || rowSpacing > length || treeSpacing > width) {
    throw new Error('Nhập kích thước lớn hơn 0, tối đa 1.000 m; khoảng cách từ 2 m và không vượt kích thước vườn.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(config.startDate) ||
      !Number.isFinite(Date.parse(config.startDate + 'T12:00:00'))) {
    throw new Error('Vui lòng chọn ngày bắt đầu.');
  }
  const rows = Math.floor(length / rowSpacing);
  const cols = Math.floor(width / treeSpacing);
  const total = rows * cols;
  const area = length * width / 10000;
  const budget = SURVEY_BUDGETS.find(b => area <= b.side * b.side / 10000)!;
  const fixedCount = Math.min(budget.fixed, total);
  // Split contiguous row/column ranges into spatial zones, each with one anchor.
  const zoneRows = Math.min(rows, Math.max(1, Math.round(Math.sqrt(fixedCount * rows / cols))));
  const zoneCols = Math.min(cols, Math.ceil(fixedCount / zoneRows));
  const zones: SurveyPoint[][] = Array.from({ length: zoneRows * zoneCols }, () => []);
  for (let row = 1; row <= rows; row++) {
    for (let col = 1; col <= cols; col++) {
      const point: SurveyPoint = {
        row, col,
        x: (width - (cols - 1) * treeSpacing) / 2 + (col - 1) * treeSpacing,
        y: (length - (rows - 1) * rowSpacing) / 2 + (row - 1) * rowSpacing,
        fixed: false,
      };
      const zone = Math.floor((row - 1) * zoneRows / rows) * zoneCols + Math.floor((col - 1) * zoneCols / cols);
      zones[zone].push(point);
    }
  }
  const anchors: SurveyPoint[] = [];
  // Stable scattered order within each zone avoids scanning only one corner first.
  const hash = (p: SurveyPoint) => Math.imul(p.row, 73856093) ^ Math.imul(p.col, 19349663);
  zones.forEach((zone, index) => {
    zone.sort((a, b) => hash(a) - hash(b) || a.row - b.row || a.col - b.col);
    if (index < fixedCount) anchors.push({ ...zone.shift()!, fixed: true });
  });
  // Very narrow gardens can have fewer zones; fill remaining anchors evenly.
  let cursor = 0;
  while (anchors.length < fixedCount) {
    const zone = zones[cursor++ % zones.length];
    if (zone.length) anchors.push({ ...zone.shift()!, fixed: true });
  }
  const days: SurveyPoint[][] = [];
  for (let day = 0; day < 10; day++) {
    const selected = [...anchors];
    let misses = 0;
    while (selected.length < anchors.length + budget.rotating && misses < zones.length) {
      const zone = zones[cursor++ % zones.length];
      if (zone.length) { selected.push(zone.pop()!); misses = 0; }
      else misses++;
    }
    const usedRows = [...new Set(selected.map(p => p.row))].sort((a, b) => a - b);
    const rowOrder = new Map(usedRows.map((r, i) => [r, i]));
    selected.sort((a, b) => a.row - b.row || (rowOrder.get(a.row)! % 2 ? b.col - a.col : a.col - b.col));
    days.push(selected);
  }
  const uniqueTrees = anchors.length + days.reduce((n, day) => n + day.filter(p => !p.fixed).length, 0);
  return { rows, cols, total, area, budget, days, uniqueTrees, fixedCount: anchors.length };
}
