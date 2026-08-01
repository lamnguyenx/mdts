import React, { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../../store/store';
import { generatePlantUMLSvg, selectPlantUMLData } from '../../../../store/slices/plantUMLSlice';

interface PlantUMLProps {
  chart: string;
}


const PlantUMLRenderer: React.FC<PlantUMLProps> = ({ chart }) => {
  const dispatch = useDispatch<AppDispatch>();
  const containerRef = useRef<HTMLDivElement>(null);
  const { svg, isLoading, error } = useSelector((state: RootState) =>
    selectPlantUMLData(state, chart)
  );

  useEffect(() => {
    if (chart && !svg && !isLoading) {
      dispatch(generatePlantUMLSvg(chart));
    }
  }, [chart, svg, isLoading, dispatch]);

  useEffect(() => {
    const container = containerRef.current;
    if (!svg || !container) {
      return;
    }

    container.innerHTML = svg;

    // <script> elements inside an <svg> (foreign content) are not executed when
    // injected via innerHTML. Re-insert each of them through the DOM API so they run.
    // The PlantUML interactive bundle only initialises on DOMContentLoaded, which has
    // already fired for dynamically injected content, so capture that callback and
    // invoke it directly instead of re-firing a document-wide event (which would
    // re-initialise every diagram already on the page).
    container.querySelectorAll('script').forEach((oldScript) => {
      const initialisers: Array<() => void> = [];
      const originalAddEventListener = document.addEventListener.bind(document);

      document.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === 'DOMContentLoaded' && typeof listener === 'function') {
          initialisers.push(listener);
          return;
        }
        return originalAddEventListener(type, listener);
      }) as typeof document.addEventListener;

      const freshScript = document.createElement('script');
      freshScript.textContent = oldScript.textContent;
      oldScript.replaceWith(freshScript);

      document.addEventListener = originalAddEventListener;

      initialisers.forEach((initialise) => initialise());
    });
  }, [svg]);

  if (error) {
    return (
      <div style={{ color: 'red', padding: '8px', border: '1px solid red', borderRadius: '4px' }}>
        <strong>PlantUML Error:</strong> {error}
        <pre><code>{chart}</code></pre>
      </div>
    );
  }

  if (isLoading) {
    return <div>Loading PlantUML diagram...</div>;
  }

  if (!svg) {
    return <pre><code>{chart}</code></pre>;
  }

  return <div ref={containerRef} style={{ maxWidth: '100%' }} />;
};

export default PlantUMLRenderer;
