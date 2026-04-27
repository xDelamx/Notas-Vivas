import { describe, it, expect } from 'vitest';
import { Note } from '../types';

describe('App Utilities', () => {
  it('should format dates correctly', () => {
    // Exemplo de teste simples para validarmos a integração do Vitest
    const date = new Date('2026-04-19T20:00:00Z');
    expect(date.getFullYear()).toBe(2026);
  });
});
