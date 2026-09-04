import { calculateCRS } from './crsCalculator';

export function runCRSTests() {
  const results: { test: string; passed: boolean; expected: number; actual: number }[] = [];

  function assertCRS(testName: string, ph: number, ec: number, moisture: number, temp: number, expected: number) {
    const actual = calculateCRS(ph, ec, moisture, temp);
    const passed = actual === expected;
    results.push({ test: testName, passed, expected, actual });
  }

  // 1. Trường hợp an toàn (Safe case: pH 6.5, EC 1.2, Moisture 65%, Temp 28°C)
  // Expected: 0
  assertCRS('Safe case (pH 6.5, EC 1.2, moisture 65%, temp 28°C)', 6.5, 1.2, 65, 28, 0);

  // 2. pH thấp (Low pH: pH 5.0, EC 1.2, Moisture 65%, Temp 28°C)
  // (5.5 - 5.0) * 25 = 12.5 -> round to 13
  assertCRS('Low pH case (pH 5.0)', 5.0, 1.2, 65, 28, 13);

  // 3. EC cao (High EC: pH 6.5, EC 3.0, Moisture 65%, Temp 28°C)
  // (3.0 - 2.5) * 12 = 6
  assertCRS('High EC case (EC 3.0, pH 6.5)', 6.5, 3.0, 65, 28, 6);

  // 4. Độ ẩm cao (High moisture: pH 6.5, EC 1.2, Moisture 85%, Temp 28°C)
  // (85 - 80) * 1.2 = 6
  assertCRS('High Moisture case (Moisture 85%)', 6.5, 1.2, 85, 28, 6);

  // 5. Tương tác pH thấp + EC cao (pH 5.0, EC 3.0)
  // pH penalty: (5.5 - 5.0) * 25 = 12.5
  // EC penalty: (3.0 - 2.5) * 12 = 6
  // EC > 2.5 & pH < 5.5 penalty: +10
  // Total: 12.5 + 6 + 10 = 28.5 -> round to 29
  assertCRS('Combined low pH + high EC (pH 5.0, EC 3.0)', 5.0, 3.0, 65, 28, 29);

  // 6. Trường hợp giới hạn CRS tối đa 100
  // Extremely bad conditions: pH 3.5, EC 5.0, Moisture 95%, Temp 35°C
  // pH: (5.5-3.5)*25 = 50
  // EC: (5-2.5)*12 = 30 + 10 = 40
  // Moisture: (95-80)*1.2 = 18
  // Extremes: pH < 5 & EC > 3 => +15, Temp > 32 & Moist > 80 => +5
  // Raw Total: 50 + 40 + 18 + 15 + 5 = 128 -> Clamped to 100
  assertCRS('Extreme limit clamped to 100', 3.5, 5.0, 95, 35, 100);

  return results;
}
