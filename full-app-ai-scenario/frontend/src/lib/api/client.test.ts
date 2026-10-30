import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCategories, getQuestion, getQuestionsByCategory } from './client';

const BASE = 'http://localhost:8000';

function mockFetch(body: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getCategories', () => {
  it('issues GET /categories and returns the category list', async () => {
    const categories = [
      { name: 'arte', label: 'Arte', label_en: 'Art', description: 'Pintura y escultura' },
    ];
    const fetchMock = mockFetch(categories);
    vi.stubGlobal('fetch', fetchMock);

    const result = await getCategories();

    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/categories`);
    expect(result).toEqual(categories);
  });
});

describe('getQuestionsByCategory', () => {
  it('builds the category page URL with query params when provided', async () => {
    const fetchMock = mockFetch([]);
    vi.stubGlobal('fetch', fetchMock);

    await getQuestionsByCategory('arte', { skip: 0, limit: 4 });

    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/questions/category/arte?skip=0&limit=4`);
  });

  it('omits query params when none are provided', async () => {
    const fetchMock = mockFetch([]);
    vi.stubGlobal('fetch', fetchMock);

    await getQuestionsByCategory('arte');

    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/questions/category/arte`);
  });
});

describe('getQuestion', () => {
  it('builds the single question URL', async () => {
    const question = { id: 7, question: '¿Quién pintó la Mona Lisa?', answer: 'Leonardo da Vinci' };
    const fetchMock = mockFetch(question);
    vi.stubGlobal('fetch', fetchMock);

    const result = await getQuestion(7);

    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/questions/7`);
    expect(result).toEqual(question);
  });
});

describe('request error handling', () => {
  it('rejects on a non-2xx response', async () => {
    const fetchMock = mockFetch(null, false, 500);
    vi.stubGlobal('fetch', fetchMock);

    await expect(getCategories()).rejects.toThrow('HTTP 500 for /categories');
  });
});
