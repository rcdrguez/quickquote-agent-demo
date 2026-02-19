export interface ServerLogEntry {
  timestamp: string;
  level: 'info' | 'error';
  event: string;
  details?: Record<string, unknown>;
}

const MAX_LOGS = 200;
const logs: ServerLogEntry[] = [];

export function addServerLog(entry: Omit<ServerLogEntry, 'timestamp'>) {
  logs.unshift({
    ...entry,
    timestamp: new Date().toISOString()
  });

  if (logs.length > MAX_LOGS) {
    logs.length = MAX_LOGS;
  }
}

export function listServerLogs() {
  return logs;
}
