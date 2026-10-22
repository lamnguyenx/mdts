import { useLocation } from 'react-router-dom';
import { getCurrentFolder } from '../api';

export const useFolder = (): string | null => {
  const location = useLocation();
  return getCurrentFolder(location.search ?? '');
};
