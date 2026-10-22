export const getCurrentFolder = (search: string = window.location.search): string | null => {
  try {
    return new URLSearchParams(search).get('folder');
  } catch {
    return null;
  }
};

/**
 * Keep the selected folder in the query string of every folder-scoped API
 * request. The server uses it to resolve which directory a request belongs to.
 */
export const withFolder = (url: string, search: string = window.location.search): string => {
  const folder = getCurrentFolder(search);
  if (!folder) return url;

  const hashIndex = url.indexOf('#');
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : '';
  const base = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}folder=${encodeURIComponent(folder)}${hash}`;
};

export const folderUrl = (
  pathname: string,
  search: string = window.location.search,
): string => {
  const folder = getCurrentFolder(search);
  if (!folder) return pathname;

  const separator = pathname.includes('?') ? '&' : '?';
  return `${pathname}${separator}folder=${encodeURIComponent(folder)}`;
};

export const fetchData = async <T>(
  url: string,
  responseType: 'json' | 'text',
  signal?: AbortSignal,
): Promise<T | null> => {
  try {
    const response = await fetch(withFolder(url), { signal });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    if (responseType === 'json') {
      return await response.json();
    } else {
      return await response.text() as T;
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    console.error(`Error fetching from ${url}:`, error);
    throw error;
  }
};
