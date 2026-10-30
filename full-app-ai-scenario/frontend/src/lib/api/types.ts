export type Category = {
  name: string;
  label: string;
  label_en: string;
  description: string;
  candidate_phrase_en?: string;
};

export type Question = {
  id: string | number;
  question: string;
  answer: string;
  source?: string;
  category_name?: string;
  confidence_score?: number;
  is_automatic?: boolean;
  category?: string;
};
