import { render } from '@testing-library/react';
import React from 'react';
import MarkdownImage, {
  resolveMarkdownImageSource,
} from '../../../../../../src/components/Content/MarkdownContent/MarkdownRenderer/MarkdownImage';

describe('MarkdownImage', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/?folder=%2Fworkspace');
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('keeps external image URLs untouched', () => {
    expect(resolveMarkdownImageSource('https://example.com/image.png', 'docs/readme.md'))
      .toBe('https://example.com/image.png');
    expect(resolveMarkdownImageSource('data:image/png;base64,abc', 'docs/readme.md'))
      .toBe('data:image/png;base64,abc');
  });

  it('adds the selected folder to root-relative images', () => {
    const { getByRole } = render(
      <MarkdownImage src="/assets/logo.png" alt="logo" selectedFilePath="docs/readme.md" />,
    );

    expect(getByRole('img')).toHaveAttribute('src', '/assets/logo.png?folder=%2Fworkspace');
  });

  it('resolves relative images against the current markdown file', () => {
    const { getByRole } = render(
      <MarkdownImage src="./images/diagram.png" alt="diagram" selectedFilePath="docs/readme.md" />,
    );

    expect(getByRole('img')).toHaveAttribute('src', '/docs/images/diagram.png?folder=%2Fworkspace');
  });

  it('preserves title, width, height and alt text', () => {
    const { getByRole } = render(
      <MarkdownImage
        src="/image.png"
        alt="preview"
        title="Preview"
        width={320}
        height="200"
        selectedFilePath={null}
      />,
    );

    const image = getByRole('img');
    expect(image).toHaveAttribute('alt', 'preview');
    expect(image).toHaveAttribute('title', 'Preview');
    expect(image).toHaveAttribute('width', '320');
    expect(image).toHaveAttribute('height', '200');
  });
});
