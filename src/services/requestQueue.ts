import type { Request } from "../types/request";

const QUEUE_KEY = "nexo-request-queue";

export type QueuedRequestInput = Omit<
  Request,
  "id" | "status" | "partialSupport" | "createdAt" | "createdBy" | "comments" | "supportReports"
>;

export type QueuedRequest = {
  id: string;
  input: QueuedRequestInput;
  createdAt: string;
  attempts: number;
};

function readQueue(): QueuedRequest[] {
  const raw = localStorage.getItem(QUEUE_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as QueuedRequest[];
  } catch {
    localStorage.removeItem(QUEUE_KEY);
    return [];
  }
}

function writeQueue(queue: QueuedRequest[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export const requestQueue = {
  list() {
    return readQueue();
  },

  count() {
    return readQueue().length;
  },

  enqueue(input: QueuedRequestInput) {
    const queue = readQueue();
    const queued: QueuedRequest = {
      id: crypto.randomUUID(),
      input,
      createdAt: new Date().toISOString(),
      attempts: 0,
    };
    writeQueue([...queue, queued]);
    return queued;
  },

  remove(id: string) {
    writeQueue(readQueue().filter((item) => item.id !== id));
  },

  markAttempt(id: string) {
    writeQueue(
      readQueue().map((item) =>
        item.id === id ? { ...item, attempts: item.attempts + 1 } : item,
      ),
    );
  },
};
