import { useMediaQuery } from '@mantine/hooks';

// Keep in sync with the `md` AppShell breakpoint used in Layout.tsx.
const useIsMobile = (): boolean => useMediaQuery('(max-width: 61.99em)', false);

export default useIsMobile;
