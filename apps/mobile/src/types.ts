export interface User {
  id: string;
  phone: string;
}
export interface Entry {
  id: string;
  friendName: string;
  amount: string;
  dueDate: string;
  note: string;
  repaidAt: string | null;
  createdAt: string;
  hasReceipt: boolean;
  isOverdue: boolean;
}
export interface Summary {
  totalLent: string;
  totalRepaid: string;
  outstanding: string;
  overdueAmount: string;
  entryCount: number;
  pendingCount: number;
  overdueCount: number;
  today: string;
  timeZone: string;
}
