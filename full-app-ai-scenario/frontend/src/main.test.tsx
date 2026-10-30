import { describe, expect, it, vi } from 'vitest';

const render = vi.fn();

vi.mock('react-dom/client', () => ({
  createRoot: () => ({ render }),
}));

describe('main entry point', () => {
  it('bootstraps the app by rendering App into the root element', async () => {
    await import('./main');

    expect(render).toHaveBeenCalledTimes(1);
  });
});
