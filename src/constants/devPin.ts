const readEnvPin = (): string | undefined => {
  const value = process.env.EXPO_PUBLIC_DEV_PIN;
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

const readLocalPin = (): string | undefined => {
  try {
    // This file is intentionally gitignored for local dev only.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('./devPin.local') as { DEV_PIN?: unknown };
    if (!mod?.DEV_PIN) return undefined;
    const value = String(mod.DEV_PIN).trim();
    return value.length ? value : undefined;
  } catch {
    return undefined;
  }
};

export const DEV_PIN: string = readLocalPin() ?? readEnvPin() ?? '00000000';
export const DEV_PIN_LENGTH = 8;
