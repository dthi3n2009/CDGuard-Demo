// The judge/demo APK is built with VITE_DEMO_MODE=true.
// Keeping this switch separate means the normal hardware build remains unchanged.
const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
export const IS_DEMO_MODE = viteEnv?.VITE_DEMO_MODE === 'true';
