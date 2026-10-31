import type { Category, Question } from './types';

const API_BASE_URL = 'http://localhost:8000';

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${path}`);
  }
  return (await response.json()) as T;
}

export function getCategories(): Promise<Category[]> {
  return request<Category[]>('/categories');
}

export function getQuestionsByCategory(
  category: string,
  opts?: { skip?: number; limit?: number; lang?: 'en' | 'es' },
): Promise<Question[]> {
  const params = new URLSearchParams();
  if (opts?.skip !== undefined) {
    params.set('skip', String(opts.skip));
  }
  if (opts?.limit !== undefined) {
    params.set('limit', String(opts.limit));
  }
  if (opts?.lang !== undefined) {
    params.set('lang', opts.lang);
  }
  const query = params.toString();
  const path = `/questions/category/${category}${query ? `?${query}` : ''}`;
  return request<Question[]>(path);
}

export function getQuestion(id: string | number): Promise<Question> {
  return request<Question>(`/questions/${id}`);
}
