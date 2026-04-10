export interface LottoDraw {
  product: string;
  drawNumber: number;
  sequenceNumber: number;
  drawDate: string;
  numbers: number[];
  bonus: number;
}

export interface FrequencyItem {
  number: number;
  frequency: number;
}

export interface DelayItem {
  number: number;
  delays: number[];
}

export interface PositionStat {
  position: number;
  min: number;
  max: number;
  mode: number;
  avg: number;
}

export interface MaxDelayInfo {
  position: string;
  min: number;
  max: number;
  mode: number;
  maxDelayNumber: number;
  drawsAbsent: number;
}

export interface Strategy {
  name: string;
  numbers: number[];
}

export interface YearlyStat {
  year: string;
  draws: number;
  topNumbers: { number: number; freq: number }[];
}

export interface PairFreq {
  numbers: number[];
  frequency: number;
}

export interface AnalysisResult {
  sum: { value: number; ideal: string; trend: string };
  balance: { value: string; trend: string };
  consecutive: { value: number; trend: string };
  sectors: { value: string; distribution: number[]; trend: string };
  gap: { value: string; trend: string };
  repeats: { value: number; trend: string };
  frequency: { value: string; trend: string };
  dnaScore: number;
  dnaRating: string;
}

export interface VerifyResult {
  numbers: number[];
  summary: Record<number, number>;
  matchDates: Record<number, string[]>;
  totalDrawsChecked: number;
  bestResults: Array<{
    drawDate: string;
    drawNumber: number;
    matches: number;
    numbers: number[];
    bonus: number;
    bonusMatch: boolean;
  }>;
  bestMatch: number;
}

export interface LottoData {
  totalMainDraws: number;
  totalAllDraws: number;
  dateRange: { start: string; end: string };
  lastDraw: LottoDraw;
  recentDraws: LottoDraw[];
  frequency: FrequencyItem[];
  frequencyMain: FrequencyItem[];
  delayByPosition: DelayItem[];
  positionStats: PositionStat[];
  suggestedByDelay: number[];
  strategies: Strategy[];
  generatedLines: number[][];
  maxDelayInfo: MaxDelayInfo[];
  bonusFrequency: FrequencyItem[];
  yearlyStats: YearlyStat[];
  topPairs: PairFreq[];
  allMainDraws: LottoDraw[];
}
