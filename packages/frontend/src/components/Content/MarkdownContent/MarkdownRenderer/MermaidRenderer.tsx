import React, { useEffect, useState } from 'react';
import mermaid from 'mermaid';
import { useComputedColorScheme } from '@mantine/core';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../store/store';

interface MermaidProps {
  chart: string;
}

/**
 * Mermaid flowcharts render labels inside SVG <foreignObject> elements, which
 * contain standard HTML (e.g. <p>, <div>). The `.mermaid-wrapper` rules in
 * index.css isolate those elements from global typography styles.
 */
const MermaidRenderer: React.FC<MermaidProps> = ({ chart }) => {
  const [svg, setSvg] = useState<string | null>(null);
  const colorScheme = useComputedColorScheme('light', { getInitialValueInEffect: false });
  const { fontFamily } = useSelector((state: RootState) => state.config);

  useEffect(() => {
    if (!chart) {
      return;
    }

    const renderMermaid = async () => {
      try {
        // Wait for fonts to load before rendering to ensure accurate text measurement
        if (document.fonts) {
          await document.fonts.ready;
        }

        mermaid.initialize({
          startOnLoad: false,
          theme: colorScheme === 'dark' ? 'dark' : 'neutral',
          // Mermaid 12 switched the defaults to look: 'neo' and layout: 'elk'.
          // Pin the previous defaults so diagrams keep rendering as before, and
          // so the container CSS above keeps matching what mermaid measures.
          look: 'classic',
          layout: 'dagre',
          securityLevel: 'loose',
          fontFamily: fontFamily || 'inherit',
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
          },
        });

        const id = `mermaid-div-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        setSvg(svg);
      } catch (error) {
        console.error('Error rendering mermaid chart:', error);
        setSvg(null);
      }
    };

    renderMermaid();
  }, [chart, colorScheme, fontFamily]);

  if (!svg) {
    return <pre><code>{chart}</code></pre>;
  }

  return (
    <div
      className="mermaid-wrapper"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

export default MermaidRenderer;
