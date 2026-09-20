export type Difficulty = 'phrase' | 'sentence' | 'paragraph';

export type Card = {
  id: string;
  page_id: string;
  vi_text: string;
  en_text: string;
  difficulty: Difficulty;
  times_seen: number;
  times_correct: number;
  streak: number;
  next_due_at: string;
};

export type Page = {
  id: string;
  title: string;
  is_default: boolean;
  created_at: string;
  card_count?: number;
};

export type Profile = {
  id: string;
  total_points: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  preferred_difficulty: Difficulty;
  timezone: string;
};

export type Feedback = {
  verdict: 'sát nghĩa' | 'lệch nhẹ' | 'sai';
  errors: { wrong: string; fix: string; why: string }[];
  upgrades: { from: string; to: string; note: string }[];
  comment: string;
};

export type Pair = {
  vi: string;
  en: string;
  difficulty: Difficulty;
};
