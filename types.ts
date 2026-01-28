
export interface FormulaResponse {
  latex: string;
  explanation: string;
}

export interface ImageInputProps {
  onImageSelect: (base64: string) => void;
  selectedImage: string | null;
  isAnalyzing: boolean;
  onClear: () => void;
}

export interface ResultCardProps {
  result: FormulaResponse | null;
  isLoading: boolean;
  hasImage: boolean;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface PaperHistoryItem {
  id: string;
  type: 'note' | 'chart' | 'chat';
  fileName?: string; // For PDFs
  timestamp: number;
  content: string | ChatMessage[]; // string for note/chart, array for chat
  sourcePreview?: string; // Thumbnail or Base64 snippet (optional)
}
