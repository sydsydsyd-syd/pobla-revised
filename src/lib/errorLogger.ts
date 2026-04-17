//errorLogger
// ── Centralized Error Logging & Handling ─────────────────────

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type ErrorSeverity = 'error' | 'warning' | 'info';

export interface ErrorLog {
    message: string;
    stack?: string;
    component?: string;
    action?: string;
    userId?: string;
    userEmail?: string;
    severity: ErrorSeverity;
    metadata?: Record<string, any>;
    timestamp?: any;
}

// ── In-memory buffer (last 50 errors) ────────────────────────
const ERROR_BUFFER_MAX = 50;
const errorBuffer: ErrorLog[] = [];
const listeners: Set<(errors: ErrorLog[]) => void> = new Set();

function notifyListeners() {
    listeners.forEach((cb) => cb([...errorBuffer]));
}

export function subscribeErrors(cb: (errors: ErrorLog[]) => void): () => void {
    listeners.add(cb);
    cb([...errorBuffer]);
    return () => listeners.delete(cb);
}

export function getErrorBuffer(): ErrorLog[] {
    return [...errorBuffer];
}

// ── Core logging function ─────────────────────────────────────
export async function logError(params: {
    message: string;
    error?: any;
    component?: string;
    action?: string;
    userId?: string;
    userEmail?: string;
    severity?: ErrorSeverity;
    metadata?: Record<string, any>;
}): Promise<void> {
    const entry: ErrorLog = {
        message: params.message,
        stack: params.error?.stack || params.error?.toString() || undefined,
        component: params.component,
        action: params.action,
        userId: params.userId,
        userEmail: params.userEmail,
        severity: params.severity ?? 'error',
        metadata: params.metadata,
        timestamp: new Date(),
    };

    const tag = `[${entry.severity.toUpperCase()}]`;
    const ctx = entry.component ? ` [${entry.component}]` : '';
    if (entry.severity === 'error') {
        console.error(`${tag}${ctx} ${entry.message}`, params.error ?? '');
    } else if (entry.severity === 'warning') {
        console.warn(`${tag}${ctx} ${entry.message}`, params.error ?? '');
    } else {
        console.info(`${tag}${ctx} ${entry.message}`);
    }

    errorBuffer.unshift(entry);
    if (errorBuffer.length > ERROR_BUFFER_MAX) errorBuffer.pop();
    notifyListeners();

    // Persist to Firestore (best-effort — never throws)
    try {
        await addDoc(collection(db, 'error_logs'), {
            ...entry,
            stack: entry.stack ?? null,
            component: entry.component ?? null,
            action: entry.action ?? null,
            userId: entry.userId ?? null,
            userEmail: entry.userEmail ?? null,
            metadata: entry.metadata ?? null,
            timestamp: serverTimestamp(),
        });
    } catch (firestoreErr) {
        console.error('[ErrorLogger] Failed to persist to Firestore:', firestoreErr);
    }
}

// ── Convenience wrappers ──────────────────────────────────────
export const logWarning = (
    message: string,
    opts?: Partial<Omit<Parameters<typeof logError>[0], 'message' | 'severity'>>
) => logError({ ...opts, message, severity: 'warning' });

export const logInfo = (
    message: string,
    opts?: Partial<Omit<Parameters<typeof logError>[0], 'message' | 'severity'>>
) => logError({ ...opts, message, severity: 'info' });

// ── Safe async wrapper ────────────────────────────────────────
export async function withErrorHandling<T>(
    fn: () => Promise<T>,
    context: { component: string; action: string; userId?: string; userEmail?: string }
): Promise<T> {
    try {
        return await fn();
    } catch (err: any) {
        await logError({
            message: err?.message || 'An unexpected error occurred',
            error: err,
            ...context,
        });
        throw err;
    }
}

// ── Global window error handlers ──────────────────────────────
export function initGlobalErrorHandlers(): void {
    window.addEventListener('error', (event) => {
        logError({
            message: event.message || 'Uncaught error',
            error: event.error,
            component: 'Global',
            action: 'uncaught_error',
            metadata: { filename: event.filename, lineno: event.lineno, colno: event.colno },
        });
    });

    window.addEventListener('unhandledrejection', (event) => {
        logError({
            message: event.reason?.message || 'Unhandled promise rejection',
            error: event.reason,
            component: 'Global',
            action: 'unhandled_rejection',
        });
    });

    console.info('[ErrorLogger] Global error handlers initialized.');
}
