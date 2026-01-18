/**
 * @jest-environment jsdom
 */

import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { ThemeProvider, useTheme } from '@/components/providers/ThemeProvider';

function setupMatchMedia(isDark: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: isDark && query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

function TestComponent() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button id="theme-toggle" onClick={toggleTheme}>
      {theme}
    </button>
  );
}

describe('ThemeProvider', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    localStorage.clear();
    document.documentElement.className = '';
  });

  afterEach(() => {
    root.unmount();
    container.remove();
  });

  it('initializes theme from system preference and applies dark class', async () => {
    setupMatchMedia(true);

    root.render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await new Promise(resolve => setTimeout(resolve, 0));

    const button = container.querySelector('#theme-toggle');
    expect(button?.textContent).toBe('dark');
  });

  it('toggles between dark and light themes and updates document', async () => {
    setupMatchMedia(true);

    root.render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await new Promise(resolve => setTimeout(resolve, 0));

    const button = container.querySelector('#theme-toggle') as HTMLButtonElement;

    expect(button.textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(button.textContent).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('theme')).toBe('light');
  });
});
