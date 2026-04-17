export interface YMMessage {
  timestamp: number;
  sender: string;
  text: string;
  isLocal: boolean;
  isBuzz?: boolean;
  isImageShare?: boolean;
}

export interface YMConversation {
  peer: string;
  messages: YMMessage[];
}

export interface YMProfile {
  username: string;
  avatarUrl: string | null;
  avatarHistory: string[];
  conversations: YMConversation[];
}

export type ProcessingStage =
  | "idle"
  | "unzipping"
  | "detecting"
  | "decoding"
  | "loading-avatars"
  | "ready"
  | "error";

export interface ProcessingProgress {
  stage: ProcessingStage;
  message?: string;
  filesDone?: number;
  filesTotal?: number;
  ratePerSec?: number;
  etaSeconds?: number;
  fromCache?: boolean;
}
