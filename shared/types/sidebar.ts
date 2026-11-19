export interface PinnedFile {
  id: string;
  filePath: string;
  fileName: string;
  customName?: string;
  order: number;
  exists: boolean;
}

export interface RecentFile {
  filePath: string;
  fileName: string;
  lastOpenedAt: number;
}
