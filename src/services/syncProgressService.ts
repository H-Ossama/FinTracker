type ProgressPayload = {
  operation?: string;
  stage?: string;
  progress?: number; // 0-100
  message?: string;
  complete?: boolean;
  syncedData?: any;
  cancelled?: boolean;
  failed?: boolean;
  error?: string;
};

const listeners: Array<(p: ProgressPayload) => void> = [];
let lastValue: ProgressPayload | null = null;
let cancelRequested = false;
let abortHandler: (() => void) | null = null;

export const syncProgressService = {
  subscribe(cb: (p: ProgressPayload) => void) {
    listeners.push(cb);
    if (lastValue) {
      try { cb(lastValue); } catch { /* ignore */ }
    }
    return () => {
      const idx = listeners.indexOf(cb);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  },
  setProgress(p: ProgressPayload) {
    // merge cancel flag
    if (cancelRequested) p.cancelled = true;
    lastValue = p;
    for (const cb of listeners.slice()) {
      try { cb(p); } catch { /* ignore listener errors */ }
    }
  },
  clear() {
    cancelRequested = false;
    lastValue = null;
    for (const cb of listeners.slice()) {
      try { cb({}); } catch { }
    }
  },
  requestCancel() {
    cancelRequested = true;
    try {
      abortHandler?.();
    } catch {
      // ignore abort handler errors
    }
    const payload: ProgressPayload = { stage: 'cancelling', progress: 0, message: 'Cancelling...', cancelled: true };
    lastValue = payload;
    for (const cb of listeners.slice()) {
      try { cb(payload); } catch { }
    }
  },
  setAbortHandler(handler: (() => void) | null) {
    abortHandler = handler;
  },
  clearAbortHandler() {
    abortHandler = null;
  },
  clearCancel() {
    cancelRequested = false;
    // notify listeners cancel cleared
    for (const cb of listeners.slice()) {
      try { cb({ stage: 'cancelled_cleared', progress: lastValue?.progress ?? 0, message: '' }); } catch { }
    }
  },
  isCancelRequested() {
    return cancelRequested;
  }
};

export type { ProgressPayload };
