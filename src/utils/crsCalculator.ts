import { CRSResult, CRSLevel } from '../types';

/**
 * Calculates Cadmium Risk Score (CRS) based on soil condition parameters.
 * Scale: 0 to 100.
 * CRS is a screening risk indicator for plant-available Cadmium, NOT a direct measurement of Cadmium concentration.
 * 
 * Formula:
 * CRS = 100 * (0.45 * S_pH + 0.25 * S_EC + 0.20 * S_moist + 0.10 * S_temp)
 * - S_pH = 1 if pH <= 4.5; = 0 if pH >= 7.0; else (7.0 - pH) / 2.5
 * - S_EC = 0 if EC <= 0.5; = 1 if EC >= 4.0; else (EC - 0.5) / 3.5
 * - S_moist = max(0, 1 - |moisture - 30| / 30) (Note: peak solubility under oxidizing/fluctuating moisture around 30-40%)
 * - S_temp = 0 if pH >= 7.0; else clamp((temperature - 20) / 20, 0, 1)
 * 
 * Note: N, P, K DO NOT participate in CRS calculation to avoid collinearity with EC.
 * 
 * @param ph Soil pH (3.0 - 9.0)
 * @param ec Soil Electrical Conductivity in dS/m
 * @param moisture Soil moisture percentage (0 - 100%)
 * @param temperature Soil temperature in °C
 * @returns CRS score integer from 0 to 100
 */
export function calculateCRS(
  ph: number,
  ec: number,
  moisture: number,
  temperature: number
): number {
  // S_pH component
  let s_ph = 0;
  if (ph <= 4.5) {
    s_ph = 1;
  } else if (ph >= 7.0) {
    s_ph = 0;
  } else {
    s_ph = (7.0 - ph) / 2.5;
  }

  // S_EC component
  let s_ec = 0;
  if (ec <= 0.5) {
    s_ec = 0;
  } else if (ec >= 4.0) {
    s_ec = 1;
  } else {
    s_ec = (ec - 0.5) / 3.5;
  }

  // S_moist component
  const s_moist = Math.max(0, 1 - Math.abs(moisture - 30) / 30);

  // S_temp component
  let s_temp = 0;
  if (ph >= 7.0) {
    s_temp = 0;
  } else {
    s_temp = Math.min(1, Math.max(0, (temperature - 20) / 20));
  }

  const rawScore = 100 * (0.45 * s_ph + 0.25 * s_ec + 0.20 * s_moist + 0.10 * s_temp);
  const finalScore = Math.round(rawScore);
  return Math.min(100, Math.max(0, finalScore));
}

/**
 * Helper to get detailed classification, colors, and root causes for a CRS score and reading.
 * Levels:
 * - Green (Safe): < 34
 * - Yellow (Caution): 34 - 66
 * - Red (High Risk): >= 67
 */
export function getCRSInfo(
  score: number,
  ph: number,
  ec: number,
  moisture: number,
  temperature: number
): CRSResult {
  let level: CRSLevel = 'safe';
  let levelText = 'An toàn';
  let color = '#2D7D46';
  let bgLightColor = '#E8F5E9';
  let borderColor = '#A5D6A7';

  if (score >= 67) {
    level = 'high_risk';
    levelText = 'Nguy cơ cao (Đỏ)';
    color = '#DC2626';
    bgLightColor = '#FEF2F2';
    borderColor = '#FCA5A5';
  } else if (score >= 34) {
    level = 'caution';
    levelText = 'Cần chú ý (Vàng)';
    color = '#D97706';
    bgLightColor = '#FFFBEB';
    borderColor = '#FCD34D';
  } else {
    level = 'safe';
    levelText = 'An toàn (Xanh)';
    color = '#16A34A';
    bgLightColor = '#F0FDF4';
    borderColor = '#86EFAC';
  }

  const rootCauses: string[] = [];
  const drivers: string[] = [];

  if (ph < 5.5) {
    drivers.push(`pH ${ph.toFixed(1)}`);
    rootCauses.push(`Đất bị axit hoá mạnh (pH ${ph.toFixed(1)} < 5.5): Ion Cd²⁺ dễ bị giải hấp và hoà tan vào dung dịch đất.`);
  } else if (ph < 6.0) {
    drivers.push(`pH ${ph.toFixed(1)}`);
    rootCauses.push(`pH đất hơi thấp (pH ${ph.toFixed(1)}): Cần nâng nhẹ về vùng an toàn 6.0 - 6.5.`);
  }

  if (ec > 2.0) {
    drivers.push(`EC ${ec.toFixed(2)} dS/m`);
    rootCauses.push(`Độ dẫn điện EC cao (${ec.toFixed(2)} dS/m): Tích tụ muối/ion làm tăng hoạt độ và độ linh động của Cadimi.`);
  } else if (ec > 1.5) {
    drivers.push(`EC ${ec.toFixed(2)} dS/m`);
    rootCauses.push(`EC có dấu hiệu gia tăng (${ec.toFixed(2)} dS/m): Cần chú ý nguồn nước tưới và phân bón.`);
  }

  if (moisture > 75) {
    drivers.push(`Độ ẩm ${moisture.toFixed(0)}%`);
    rootCauses.push(`Độ ẩm đất cao (${moisture.toFixed(0)}%): Đất bão hoà nước dài ngày làm giảm thế oxy hoá khử.`);
  }

  if (temperature > 32) {
    drivers.push(`Nhiệt độ ${temperature.toFixed(1)}°C`);
    rootCauses.push(`Nhiệt độ đất cao (${temperature.toFixed(1)}°C) thúc đẩy tốc độ phản ứng sinh hoá.`);
  }

  let mainCause = 'Các chỉ số thổ nhưỡng hiện tại đang trong dải thuận lợi.';
  if (drivers.length > 0) {
    mainCause = `Điểm cao chủ yếu do ${drivers.join(' và ')}.`;
  }

  return {
    score,
    level,
    levelText,
    color,
    bgLightColor,
    borderColor,
    mainCause,
    rootCauses
  };
}

