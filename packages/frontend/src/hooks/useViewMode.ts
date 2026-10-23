
import { useSearchParams } from 'react-router-dom';

export type ViewMode = 'preview' | 'frontmatter' | 'raw';

export const useViewMode = (): ViewMode => {
  const [searchParams] = useSearchParams();
  return (searchParams.get('tab') as ViewMode) || 'preview';
};
