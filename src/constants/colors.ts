// src/constants/colors.ts
export const COLORS = [
  "#FF3B30", "#FF9500", "#FFCC00", "#34C759",
  "#00C7BE", "#007AFF", "#5856D6", "#AF52DE",
  "#FF2D55", "#8E8E93", "#5AC8FA", "#FFD60A",
  "#64D2FF", "#30D158", "#BF5AF2", "#AC8E68",
] as const;

export type ColorHex = typeof COLORS[number];
