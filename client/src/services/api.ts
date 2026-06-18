import axios from 'axios';

// Resolve API base URL with a sensible local fallback for dev.
// Note: import.meta.env is only available inside bundled code (not in browser console).
const envBase = (import.meta as any)?.env?.VITE_API_BASE_URL as string | undefined;
let resolvedBase = envBase?.replace(/\/$/, '');
if (!resolvedBase) {
  // Default to the current page host to keep cookies same-site
  resolvedBase = `${location.protocol}//${location.hostname}:4000/api`;
}
// Warn if API host differs from page host — cookies may not be sent cross-site
try {
  const apiUrl = new URL(resolvedBase);
  if (apiUrl.hostname !== location.hostname) {
    // eslint-disable-next-line no-console
    console.warn('[API] base host differs from page host; auth cookies may not be sent cross-site:', {
      pageHost: location.hostname,
      apiHost: apiUrl.hostname,
    });
  }
} catch {}

const API = axios.create({
  baseURL: resolvedBase,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export default API;
