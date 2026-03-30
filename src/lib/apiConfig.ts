const VITE_API_URL = import.meta.env.VITE_API_URL as string | undefined;
export const API_BASE = VITE_API_URL ?? (
  import.meta.env.DEV
    ? 'http://localhost:3000'
    : 'https://backendcontrolarapp-production-3182.up.railway.app'
);
