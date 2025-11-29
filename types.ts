export enum AppMode {
  CHAT = 'CHAT',
  LIVE = 'LIVE',
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string; // Base64
  isError?: boolean;
  groundingSources?: { uri: string; title: string }[];
}

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}
