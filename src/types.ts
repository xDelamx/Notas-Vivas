export interface NoteItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Note {
  id: string;
  originalText: string;
  title: string;
  type: string;
  items: NoteItem[];
  createdAt: number;
  completedAt?: number;
  deadline?: number;
  deadlineNotification?: boolean;
  deadlineNotified?: boolean;
  checkInTime: number | null;
  status: 'active' | 'completed' | 'archived';
  checkInPrompted: boolean;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  followUpStrategy: 'app' | 'whatsapp' | 'call' | 'notification';
  summary: string;
}
