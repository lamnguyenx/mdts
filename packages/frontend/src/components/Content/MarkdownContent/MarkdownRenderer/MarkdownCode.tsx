import { Code } from '@mantine/core';
import React from 'react';
import { useSelector } from 'react-redux';
import { PrismAsyncLight } from 'react-syntax-highlighter';
import { useSyntaxHighlighterTheme, useSyntaxHighlighterThemeMeta } from '../../../../hooks/useSyntaxHighlighterTheme';
import type { RootState } from '../../../../store/store';
import MermaidRenderer from './MermaidRenderer';
import PlantUMLRenderer from './PlantUMLRenderer';

interface MarkdownCodeProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const MarkdownCode: React.FC<MarkdownCodeProps> = ({ inline, className, children, ...props }) => {
  const { fontFamilyMonospace, syntaxHighlighterTheme } = useSelector((state: RootState) => state.config);
  const syntaxHighlighterStyle = useSyntaxHighlighterTheme(syntaxHighlighterTheme);
  const syntaxHighlighterThemeMeta = useSyntaxHighlighterThemeMeta(syntaxHighlighterTheme);

  const match = /language-(\w+)/.exec(className || '');
  if (match && match[1] === 'mermaid') {
    return <MermaidRenderer chart={String(children).replace(/\n$/, '')} />;
  }
  if (match && (match[1] === 'plantuml' || match[1] === 'puml')) {
    return <PlantUMLRenderer chart={String(children).replace(/\n$/, '')} />;
  }

  return !inline && match ? (
    <PrismAsyncLight
      style={syntaxHighlighterStyle}
      className={'syntax-highlighter'}
      customStyle={{ margin: 0 }}
      showLineNumbers={true}
      language={match[1]}
      codeTagProps={{ style: { fontFamily: fontFamilyMonospace } }}
      PreTag="div"
      {...props}
    >
      {String(children).replace(/\n$/, '')}
    </PrismAsyncLight>
  ) : (
    <Code
      {...props}
      className={className}
      ff={fontFamilyMonospace}
      bg={syntaxHighlighterThemeMeta.color}
      c={syntaxHighlighterThemeMeta.type === 'light' ? '#000c' : '#fff'}
    >
      {children}
    </Code>
  );
};

export default MarkdownCode;
