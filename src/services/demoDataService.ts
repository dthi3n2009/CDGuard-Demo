import { Garden, SensorReading, RemediationTask } from '../types';
import { calculateCRS } from '../utils/crsCalculator';

export const DEFAULT_GARDEN: Garden = {
  id: 'iot',
  deviceId: 'esp32-01',
  name: 'Vườn 5 Cây Sầu Riêng Cai Lậy',
  province: 'Tiền Giang',
  district: 'Cai Lậy',
  shape: 'rectangle',
  length: 70, // 70 mét
  width: 50, // 50 mét
  area: 3.5, // 3.5 công đất (3.500 m2)
  cornerTopLeft: 'Kênh tưới nước ngọt & giếng khoan',
  cornerTopRight: 'Đường lộ đan & trạm bơm',
  cornerBottomLeft: 'Rãnh xả phèn cuối bờ liếp',
  cornerBottomRight: 'Đê bao ngăn mặn sông Tiền',
  centerLandmark: 'Gò đất cao ráo (Thoát nước tốt)',
  terrainFeatures: ['Gò cao ráo', 'Gần mương ngọt', 'Bờ liếp cao'],
  soilType: 'Đất phù sa cao ráo (quanh gốc 5 cây sầu riêng)',
  crop: 'Sầu riêng Ri6 & Monthong (5 cây lớn)',
  age: 15,
  waterSource: 'Nước mưa & Sông Tiền',
  fertilizerType: 'Hữu cơ vi sinh',
  ph: 6.45,
  ec: 0.22, // dS/m (Rất sạch, hoàn toàn không nhiễm mặn)
  moisture: 72, // % (Độ ẩm tốt nhờ mấy nay có mưa rào nhẹ)
  temperature: 28.0, // °C (Mát mẻ)
  battery: 92,
  online: true,
  lastUpdated: Date.now()
};

export interface SpotMeasurement {
  id: string;
  dayStr: string; // "16/08" - "31/08"
  timeStr: string; // "07:15"
  dateObj: Date;
  timestamp: number;
  sessionName: 'Sáng' | 'Trưa' | 'Chiều';
  spotNumber: number; // 1 to 10
  locationName: string; // e.g. "Cây 1 - Gốc chính sát đất (0.3m)", "Cây 2 - Gốc chính sát đất (0.3m)"
  ph: number;
  ec: number;
  moisture: number;
  temperature: number;
  crs: number;
}

// 10 fixed locations near the soil across 5 trees in the garden
export const SPOT_LOCATIONS = [
  'Cây 1 - Gốc chính sát đất (0.3m)',
  'Cây 1 - Vùng rễ tán ngoài (1.5m)',
  'Cây 2 - Gốc chính sát đất (0.3m)',
  'Cây 2 - Vùng rễ tán ngoài (1.5m)',
  'Cây 3 - Gốc trung tâm sát đất (0.3m)',
  'Cây 3 - Rãnh đệm hữu cơ (1.2m)',
  'Cây 4 - Gốc hướng Nam sát đất (0.3m)',
  'Cây 4 - Vùng rễ tán ngoài (1.5m)',
  'Cây 5 - Gốc hướng Bắc sát đất (0.3m)',
  'Cây 5 - Bờ mương tưới (1.5m)'
];

/**
 * Generates spot measurements across 5 trees from August 16 to noon of August 31 (16/08 - 31/08 trưa).
 * - Aug 16 to Aug 30 (15 days): 3 sessions (Sáng, Trưa, Chiều) x 10 spots = 450 spot readings
 * - Aug 31 (today, up to noon): 2 sessions (Sáng, Trưa) x 10 spots = 20 spot readings
 * Total = 470 spot measurements spanning the complete 16-day historical dataset.
 */
export function generateDailyDetailedSpotData(garden: Garden): SpotMeasurement[] {
  const spotData: SpotMeasurement[] = [];

  // Daily profiles from 16/08/2026 to 31/08/2026 (trưa ngày 31)
  const dailyBaselines = [
    { day: 16, dayStr: '16/08', basePh: 6.38, baseEc: 0.21, baseMoist: 73, baseTemp: 28.2, sessions: ['Sáng', 'Trưa', 'Chiều'] as const },
    { day: 17, dayStr: '17/08', basePh: 6.42, baseEc: 0.20, baseMoist: 70, baseTemp: 28.8, sessions: ['Sáng', 'Trưa', 'Chiều'] as const },
    { day: 18, dayStr: '18/08', basePh: 6.35, baseEc: 0.22, baseMoist: 76, baseTemp: 27.5, sessions: ['Sáng', 'Trưa', 'Chiều'] as const },
    { day: 19, dayStr: '19/08', basePh: 6.40, baseEc: 0.21, baseMoist: 74, baseTemp: 28.0, sessions: ['Sáng', 'Trưa', 'Chiều'] as const },
    { day: 20, dayStr: '20/08', basePh: 6.45, baseEc: 0.23, baseMoist: 69, baseTemp: 29.1, sessions: ['Sáng', 'Trưa', 'Chiều'] as const },
    { day: 21, dayStr: '21/08', basePh: 6.48, baseEc: 0.22, baseMoist: 72, baseTemp: 28.5, sessions: ['Sáng', 'Trưa', 'Chiều'] as const },
    { day: 22, dayStr: '22/08', basePh: 6.52, baseEc: 0.24, baseMoist: 71, baseTemp: 28.3, sessions: ['Sáng', 'Trưa', 'Chiều'] as const },
    { day: 23, dayStr: '23/08', basePh: 6.50, baseEc: 0.23, baseMoist: 70, baseTemp: 28.7, sessions: ['Sáng', 'Trưa', 'Chiều'] as const },
    { day: 24, dayStr: '24/08', basePh: 6.47, baseEc: 0.21, baseMoist: 73, baseTemp: 27.9, sessions: ['Sáng', 'Trưa', 'Chiều'] as const },
    { day: 25, dayStr: '25/08', basePh: 6.39, baseEc: 0.20, baseMoist: 77, baseTemp: 27.0, sessions: ['Sáng', 'Trưa', 'Chiều'] as const },
    { day: 26, dayStr: '26/08', basePh: 6.44, baseEc: 0.21, baseMoist: 74, baseTemp: 28.1, sessions: ['Sáng', 'Trưa', 'Chiều'] as const },
    { day: 27, dayStr: '27/08', basePh: 6.48, baseEc: 0.22, baseMoist: 70, baseTemp: 28.9, sessions: ['Sáng', 'Trưa', 'Chiều'] as const },
    { day: 28, dayStr: '28/08', basePh: 6.51, baseEc: 0.23, baseMoist: 72, baseTemp: 28.4, sessions: ['Sáng', 'Trưa', 'Chiều'] as const },
    { day: 29, dayStr: '29/08', basePh: 6.53, baseEc: 0.22, baseMoist: 71, baseTemp: 28.6, sessions: ['Sáng', 'Trưa', 'Chiều'] as const },
    { day: 30, dayStr: '30/08', basePh: 6.50, baseEc: 0.22, baseMoist: 70, baseTemp: 28.5, sessions: ['Sáng', 'Trưa', 'Chiều'] as const },
    { 
      day: 31, 
      dayStr: '31/08', 
      basePh: garden.ph || 6.45, 
      baseEc: garden.ec || 0.22, 
      baseMoist: garden.moisture || 72, 
      baseTemp: garden.temperature || 28.0, 
      // Riêng ngày 31/08 chỉ lấy buổi Sáng và Trưa theo đúng yêu cầu "đến trưa ngày 31"
      sessions: ['Sáng', 'Trưa'] as const 
    }
  ];

  const sessionTimeProfiles = {
    'Sáng': { baseHour: 7, baseMin: 15, tempDelta: -1.4, moistDelta: +2 },
    'Trưa': { baseHour: 11, baseMin: 45, tempDelta: +2.3, moistDelta: -3 },
    'Chiều': { baseHour: 16, baseMin: 20, tempDelta: +0.6, moistDelta: +1 }
  };

  dailyBaselines.forEach((dayInfo) => {
    dayInfo.sessions.forEach((sessionName) => {
      const timeProf = sessionTimeProfiles[sessionName];

      // Create 10 spot measurements per session across the 5 trees
      for (let spotIdx = 0; spotIdx < 10; spotIdx++) {
        // Deterministic micro-variations across points
        const seed = (dayInfo.day * 37) + (timeProf.baseHour * 11) + (spotIdx * 7);
        const pseudoRand1 = Math.sin(seed * 1.1) * 0.07;
        const pseudoRand2 = Math.cos(seed * 2.3) * 0.02;
        const pseudoRand3 = Math.sin(seed * 3.7) * 2.2;
        const pseudoRand4 = Math.cos(seed * 4.9) * 0.5;

        const ph = Math.max(5.8, Math.min(7.2, parseFloat((dayInfo.basePh + pseudoRand1).toFixed(2))));
        const ec = Math.max(0.1, Math.min(1.5, parseFloat((dayInfo.baseEc + pseudoRand2).toFixed(2))));
        const moisture = Math.max(40, Math.min(95, Math.round(dayInfo.baseMoist + timeProf.moistDelta + pseudoRand3)));
        const temperature = Math.max(22, Math.min(38, parseFloat((dayInfo.baseTemp + timeProf.tempDelta + pseudoRand4).toFixed(1))));

        // Minute offsets between measurements (2-3 mins apart)
        const minuteOffset = spotIdx * 3;
        const totalMinutes = timeProf.baseMin + minuteOffset;
        const hour = timeProf.baseHour + Math.floor(totalMinutes / 60);
        const minute = totalMinutes % 60;

        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        // Exact calendar date: Year 2026, Month 8 (August = index 7), Day 16..31
        const dateObj = new Date(2026, 7, dayInfo.day, hour, minute, 0);
        const timestamp = dateObj.getTime();
        const crs = calculateCRS(ph, ec, moisture, temperature);

        spotData.push({
          id: `spot-${dayInfo.dayStr.replace('/', '')}-${sessionName}-${spotIdx + 1}`,
          dayStr: dayInfo.dayStr,
          timeStr,
          dateObj,
          timestamp,
          sessionName,
          spotNumber: spotIdx + 1,
          locationName: SPOT_LOCATIONS[spotIdx],
          ph,
          ec,
          moisture,
          temperature,
          crs
        });
      }
    });
  });

  return spotData;
}

/**
 * Historical measurements averaged per session for charts.
 */
export function generateHistoricalReadings(
  garden: Garden,
  rangeDays: number = 7
): SensorReading[] {
  const allSpots = generateDailyDetailedSpotData(garden);

  // Group by dayStr + sessionName
  const grouped: Record<string, SpotMeasurement[]> = {};
  allSpots.forEach(s => {
    const key = `${s.dayStr}-${s.sessionName}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  });

  const sessionAverages: SensorReading[] = Object.keys(grouped).map(key => {
    const spots = grouped[key];
    const avgPh = spots.reduce((acc, x) => acc + x.ph, 0) / spots.length;
    const avgEc = spots.reduce((acc, x) => acc + x.ec, 0) / spots.length;
    const avgMoist = spots.reduce((acc, x) => acc + x.moisture, 0) / spots.length;
    const avgTemp = spots.reduce((acc, x) => acc + x.temperature, 0) / spots.length;
    const avgCrs = Math.round(spots.reduce((acc, x) => acc + x.crs, 0) / spots.length);

    return {
      timestamp: spots[0].timestamp,
      ph: parseFloat(avgPh.toFixed(2)),
      ec: parseFloat(avgEc.toFixed(2)),
      moisture: Math.round(avgMoist),
      temperature: parseFloat(avgTemp.toFixed(1)),
      crs: avgCrs
    };
  });

  return sessionAverages.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Standard Remediation Tasks Template
 */
export function getDefaultRemediationTasks(ph: number, ec: number, moisture: number): RemediationTask[] {
  const tasks: RemediationTask[] = [];

  // Immediate Tasks (Việc cần làm ngay)
  if (ph < 5.5) {
    tasks.push({
      id: 'task-ph-lime',
      title: 'Bón vôi nông nghiệp (CaCO3) hoặc dolomite',
      period: 'immediate',
      costTier: 'low',
      completed: false,
      category: 'ph',
      description: 'Cân bằng axit đất, nâng pH từ ' + ph.toFixed(1) + ' lên mức an toàn 6.0 - 6.5. Tham khảo dải vôi 20-30 kg/công tùy kết cấu đất.',
      impact: 'Rất cao - Giảm khả năng hòa tan của Cadmium trong dung dịch đất.'
    });
  }

  if (ec > 2.0) {
    tasks.push({
      id: 'task-ec-flush',
      title: 'Xả mặn / Rửa muối bằng nước ngọt sạch',
      period: 'immediate',
      costTier: 'low',
      completed: false,
      category: 'ec',
      description: 'Tưới xả tràn bằng nước sông ngọt (EC < 0.5 dS/m) để xả lượng muối dư thừa trong dải rễ.',
      impact: 'Cao - Giảm hàm lượng ion muối đệm bẩy nồng độ Cadmium.'
    });
  }

  if (moisture > 78) {
    tasks.push({
      id: 'task-drainage',
      title: 'Xẻ rãnh thoát nước mương vườn sầu riêng',
      period: 'immediate',
      costTier: 'low',
      completed: false,
      category: 'moisture',
      description: 'Hạ mực nước mương, tạo độ thông thoáng gốc, tránh đất ngập úng gây tình trạng khử khử khử giải phóng Cadmium.',
      impact: 'Trực tiếp - Tăng oxy hòa tan cho vi sinh vật đất.'
    });
  }

  // Short Term Tasks (Kế hoạch 7 - 30 ngày)
  tasks.push({
    id: 'task-organic-matter',
    title: 'Bổ sung phân hữu cơ hoai mục & Axit Humic',
    period: 'short_term',
    costTier: 'medium',
    completed: false,
    category: 'general',
    description: 'Tăng cường chất mùn gắn kết và cố định ion kim loại nặng, giúp rễ cây hấp thụ cân đối vi chất.',
    impact: 'Lâu dài - Giảm độc tính tự do của Cadmium.'
  });

  tasks.push({
    id: 'task-bio-fertilizer',
    title: 'Sử dụng chế phẩm sinh học Trichoderma',
    period: 'short_term',
    costTier: 'low',
    completed: false,
    category: 'general',
    description: 'Kích thích vi sinh vật có lợi phát triển, bảo vệ hệ rễ tơ sầu riêng khỏi tổn thương.',
    impact: 'Trung bình - Nâng cao sức đề kháng kháng khuẩn.'
  });

  // Long Term Tasks (Theo dõi dài hạn)
  tasks.push({
    id: 'task-lab-testing',
    title: 'Lấy mẫu đất & lá sầu riêng gửi phân tích phòng thí nghiệm',
    period: 'long_term',
    costTier: 'high',
    completed: false,
    category: 'general',
    description: 'Xác định chính xác hàm lượng Cadmium tổng số và Cadmium khả tiêu bằng phương pháp quang phổ AAS / ICP-MS.',
    impact: 'Bắt buộc khi CRS ở mức Đỏ hoặc Cam kéo dài.'
  });

  tasks.push({
    id: 'task-water-check',
    title: 'Kiểm tra chất lượng nguồn nước sông / mương định kỳ',
    period: 'long_term',
    costTier: 'medium',
    completed: false,
    category: 'ec',
    description: 'Đo EC và pH nguồn nước tưới trước khi bơm vào vườn, tránh dẫn nước phù sa nhiễm phèn hoặc mặn.',
    impact: 'Chủ động phòng ngừa ô nhiễm nguồn đầu vào.'
  });

  return tasks;
}
