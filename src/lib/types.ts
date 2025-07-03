
export type User = {
  id: string;
  name: string;
  avatarUrl: string;
};

export type Transaction = {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  type: 'income' | 'expense';
  userId: string;
  roomId?: string;
  sharedExpenseId?: string;
};

export type ParticipantPayment = {
  userId: string;
  amountDue: number;
  amountPaid: number;
};

export type Comment = {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  createdAt: string; // ISO timestamp
};

export type PaymentPeriod = 'one-time' | 'hourly' | 'weekly' | 'bi-weekly' | 'monthly' | 'yearly';

export type SavingRoom = {
  id:string;
  name: string;
  creatorId: string;
  totalAmount: number; // The total amount for the room for a single payment period (amountPerParticipant * participantCount).
  participants: User[];
  participantIds: string[];
  goal?: string;
  paymentPeriod: PaymentPeriod;
  payments: ParticipantPayment[];
  discussion?: Comment[];
  createdAt: string; // ISO timestamp
};

export type SharedExpense = {
  id: string;
  name: string;
  creatorId: string;
  totalAmount: number;
  participants: User[];
  participantIds: string[];
  payments: ParticipantPayment[];
  discussion?: Comment[];
  createdAt: string; // ISO timestamp
};
