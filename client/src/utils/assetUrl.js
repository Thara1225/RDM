const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

let apiOrigin = 'http://localhost:5000';
try {
  apiOrigin = new URL(apiBaseUrl).origin;
} catch (_error) {
  apiOrigin = 'http://localhost:5000';
}

export function toAssetUrl(path) {
  if (!path) {
    return '';
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${apiOrigin}${path.startsWith('/') ? '' : '/'}${path}`;
}
