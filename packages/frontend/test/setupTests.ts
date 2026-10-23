import '@testing-library/jest-dom';
import type { ComponentType, ReactNode } from 'react';

jest.mock('@mantine/hooks', () => {
  const actual = jest.requireActual('@mantine/hooks');
  const React = jest.requireActual('react');
  return {
    ...actual,
    useId: (staticId?: string) => {
      const reactId = React.useId();
      return staticId ?? `mantine-${String(reactId).replace(/[^a-zA-Z0-9_-]/g, '')}`;
    },
  };
});

// Mantine components require a MantineProvider in the component tree. Wrap the
// Testing Library render/renderHook helpers once so individual tests do not have
// to repeat the provider boilerplate.
jest.mock('@testing-library/react', () => {
  const actual = jest.requireActual('@testing-library/react');
  const React = jest.requireActual('react');
  const { MantineProvider } = jest.requireActual('@mantine/core');

  const wrap = (ui: ReactNode): ReactNode => (
    React.createElement(
      MantineProvider,
      { withCssVariables: false, withGlobalClasses: false },
      ui,
    )
  );

  return {
    ...actual,
    render: (ui: ReactNode, options?: unknown) => {
      const result = actual.render(wrap(ui), options);
      const originalRerender = result.rerender;
      result.rerender = (nextUi: ReactNode) => originalRerender(wrap(nextUi));
      return result;
    },
    renderHook: (hook: () => unknown, options?: { wrapper?: ComponentType<{ children: ReactNode }> }) => {
      const Wrapper = options?.wrapper;
      return actual.renderHook(hook, {
        ...options,
        wrapper: Wrapper
          ? ({ children }: { children: ReactNode }) => wrap(React.createElement(Wrapper, null, children))
          : ({ children }: { children: ReactNode }) => wrap(children),
      });
    },
  };
});

// Mock fetch API
global.fetch = jest.fn((url) => {
  if (url.includes('/api/filetree')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve([
        { 'folder1': ['file1.md', 'file2.txt'] },
        { 'folder2': ['file3.md'] }
      ]),
    });
  }
  if (url.includes('/api/markdown')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve('# Mock Markdown Content'),
    });
  }
  if (url.includes('/api/outline')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve([{ level: 1, text: 'Mock Outline', id: 'mock-outline' }]),
    });
  }
  return Promise.reject(new Error(`Unhandled fetch for ${url}`));
});

// Polyfill TextEncoder and TextDecoder
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Polyfill scrollIntoView, which jsdom does not implement
Element.prototype.scrollIntoView = jest.fn();

// Polyfill ResizeObserver, used by several Mantine components
class ResizeObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
