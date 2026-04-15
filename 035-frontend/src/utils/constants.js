export const PRESET_SERVICES = [
  { name: "YouTube Premium", price: 14900, category: "OTT" },
  { name: "Netflix", price: 17000, category: "OTT" },
  { name: "Spotify", price: 10900, category: "음악" },
  { name: "Disney+", price: 9900, category: "OTT" },
  { name: "Coupang Wow", price: 7890, category: "쇼핑" },
  { name: "직접 입력", price: "", category: "" },
];

export const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
export const CYCLES = [1, 3, 6, 12];

// 차트 색상 생성 함수
export const generateColors = (count) => {
  return Array.from({ length: count }, (_, i) => {
    const hue = (i * (360 / count)) % 360;
    return `hsl(${hue}, 70%, 60%)`;
  });
};