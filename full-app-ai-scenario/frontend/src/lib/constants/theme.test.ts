import { describe, expect, it } from 'vitest';
import tailwindConfig from '../../../tailwind.config';

const theme = tailwindConfig.theme.extend;

describe('design tokens', () => {
  it('resolves the Obsidian Quiz Minimal color tokens', () => {
    expect(theme.colors.obsidian).toBe('#0D0D0D');
    expect(theme.colors.plum).toBe('#381043');
    expect(theme.colors['lime-primary']).toBe('#B0F280');
    expect(theme.colors['lime-pastel']).toBe('#BEF299');
    expect(theme.colors['light-text']).toBe('#F2F2F2');
    expect(theme.colors.surface).toBe('#121212');
    expect(theme.colors['surface-card']).toBe('#171717');
  });

  it('exposes the display and body font families', () => {
    expect(theme.fontFamily.display).toContain('"Space Grotesk"');
    expect(theme.fontFamily.body).toContain('"Plus Jakarta Sans"');
  });

  it('defines the declared radius scale', () => {
    expect(theme.borderRadius.control).toBe('0.5rem');
    expect(theme.borderRadius.container).toBe('1rem');
    expect(theme.borderRadius.pill).toBe('9999px');
  });
});
