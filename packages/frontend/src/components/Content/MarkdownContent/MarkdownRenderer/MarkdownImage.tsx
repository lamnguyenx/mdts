import React from 'react';
import { withFolder } from '../../../../api';

interface MarkdownImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string;
  selectedFilePath: string | null;
  node?: unknown;
}

const isExternalSource = (src: string): boolean =>
  /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(src);

export const resolveMarkdownImageSource = (
  src: string | undefined,
  selectedFilePath: string | null,
): string | undefined => {
  if (!src || isExternalSource(src)) return src;

  const cleanedPath = selectedFilePath?.replace(/^\/+/, '') ?? '';
  const lastSlash = cleanedPath.lastIndexOf('/');
  const basePath = selectedFilePath
    ? (lastSlash >= 0 ? `/${cleanedPath.slice(0, lastSlash + 1)}` : '/')
    : window.location.pathname;

  try {
    const resolved = new URL(src, new URL(basePath, window.location.origin));
    if (resolved.origin !== window.location.origin) return src;

    const localUrl = `${resolved.pathname}${resolved.search}${resolved.hash}`;
    return withFolder(localUrl);
  } catch {
    return src;
  }
};

const MarkdownImage: React.FC<MarkdownImageProps> = (props) => {
  const { src, selectedFilePath, node, ...imageProps } = props;
  void node;

  return <img src={resolveMarkdownImageSource(src, selectedFilePath)} {...imageProps} />;
};

export default MarkdownImage;
