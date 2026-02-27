export interface Transaction {
  id?: number;
  type: 'expense' | 'revenue';
  amount: number;
  category: string;
  date: string;
  note?: string;
}

export const CATEGORIES = {
  expense: [
    'Food',
    'Transport',
    'Rent',
    'Utilities',
    'Entertainment',
    'Shopping',
    'Health',
    'Education',
    'Other'
  ],
  revenue: [
    'Salary',
    'Freelance',
    'Investment',
    'Gift',
    'Other'
  ]
};
