import type { NovaAPI } from '@shared/types/ipc';

declare global {
  interface Window {
    novaAPI?: NovaAPI;
  }
}

export function getNovaAPI(): NovaAPI {
  if (!window.novaAPI) {
    throw new Error('NovaAPI bridge is unavailable. Ensure preload script is configured.');
  }
  return window.novaAPI;
}

export function hasNovaAPI(): boolean {
  return typeof window !== 'undefined' && Boolean(window.novaAPI);
}
