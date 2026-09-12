export interface IUpdateBaristaProfilePayload {
  isAvailable?: boolean;
  skillLevel?: number;
  station?: string;
  name?: string;
  phone?: string;
  profileImage?: string;
}

export interface IBaristaScoreResult {
  baristaId: string;
  name: string;
  score: number;
  activeOrderCount: number;
  skillLevel: number;
  isAvailable: boolean;
}

export interface IBaristaProfileResponse {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  profileImage?: string | null;
  role: string;
  station?: string | null;
  skillLevel?: number | null;
  isAvailable: boolean;
  activeOrderCount: number;
  metrics: {
    activeOrdersCount: number;
    completedTodayCount: number;
    totalCompletedCount: number;
  };
}
