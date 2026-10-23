import { useMediaQuery } from '@mantine/hooks';

const useIsMobile = (): boolean => useMediaQuery('(max-width: 56.25em)', false);

export default useIsMobile;
