/**
 * Console logging verbosity, ordered as a threshold: `debug` is the most
 * verbose and `none` silences everything. Selecting a level emits that level
 * and every more-severe level (e.g. `warn` also emits `error`).
 */
export type LogLevel = "debug" | "warn" | "error" | "none";

const LOG_LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  warn: 1,
  error: 2,
  none: 3,
};

export const DEFAULT_LOG_LEVEL: LogLevel = "warn";

export function coerceLogLevel(value: string | null): LogLevel {
  if (value !== null && LOG_LEVEL_RANK[value as LogLevel] !== undefined) {
    return value as LogLevel;
  }
  return DEFAULT_LOG_LEVEL;
}

type ConsoleLevel = "debug" | "warn" | "error";

/**
 * Console logger gated by an ordered {@link LogLevel} threshold: `debug` is the
 * most verbose and `none` silences everything. Each call emits only when the
 * current level (read lazily via `getLevel`) is verbose enough to include it,
 * so the threshold can change at runtime.
 */
export class Logger {
  #prefix: string;
  #getLevel: () => LogLevel;

  constructor(prefix: string, getLevel: () => LogLevel) {
    this.#prefix = prefix;
    this.#getLevel = getLevel;
  }

  debug(message: string, ...args: unknown[]): void {
    this.#emit("debug", message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.#emit("warn", message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.#emit("error", message, ...args);
  }

  #emit(level: ConsoleLevel, message: string, ...args: unknown[]) {
    if (LOG_LEVEL_RANK[level] < LOG_LEVEL_RANK[this.#getLevel()]) return;
    console[level](`${this.#prefix}: ${message}`, ...args);
  }
}
