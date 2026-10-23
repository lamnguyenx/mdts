import { Alert, Box, Center, Code, Loader } from '@mantine/core';
import React, { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../../../store/store';
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
          initialisers.push(listener as () => void);
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
      <Alert color="red" variant="light" title="PlantUML Error" my="sm">
        {error}
        <Box mt="xs" ff="monospace" fz="xs">
          <Code block>{chart}</Code>
        </Box>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <Center py="md">
        <Loader role="progressbar" size="sm" />
      </Center>
    );
  }

  if (!svg) {
    return (
      <Box my="sm">
        <Code block>{chart}</Code>
      </Box>
    );
  }

  return <Box ref={containerRef} maw="100%" my="sm" />;
};

export default PlantUMLRenderer;
