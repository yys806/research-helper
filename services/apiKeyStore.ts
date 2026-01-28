const STORAGE_KEY = 'siliconflow_api_key';

export const getApiKey = (): string | null => {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
};

export const setApiKey = (key: string) => {
  if (typeof localStorage === 'undefined') return;
  if (key) {
    localStorage.setItem(STORAGE_KEY, key.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
};

export const hasApiKey = () => !!getApiKey();

