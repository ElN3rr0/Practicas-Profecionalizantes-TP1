import type { CategoryName } from '../game/types';

export const CATEGORY_COLORS: Record<CategoryName, string> = {
  arte: '#E63946',
  historia: '#F59E0B',
  deportes: '#FF6B35',
  entretenimiento: '#9D4EDD',
  geografia: '#0077B6',
  ciencia: '#06D6A0',
};

export const CATEGORY_LABELS: Record<CategoryName, string> = {
  arte: 'Arte',
  historia: 'Historia',
  deportes: 'Deportes',
  entretenimiento: 'Entretenimiento',
  geografia: 'Geografía',
  ciencia: 'Ciencia',
};

export const CATEGORY_ICONS: Record<CategoryName, string> = {
  arte: 'palette',
  historia: 'menu_book',
  deportes: 'sports_soccer',
  entretenimiento: 'movie',
  geografia: 'public',
  ciencia: 'science',
};
