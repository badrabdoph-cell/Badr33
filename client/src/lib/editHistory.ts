import { useEffect, useState } from "react";

export type EditAction =
  | {
      kind: "siteContent";
      key: string;
      prev: string;
      next: string;
      category: string;
      label: string;
    }
  | {
      kind: "contactInfo";
      key: string;
      prev: string;
      next: string;
      label: string;
    }
  | {
      kind: "siteImage";
      key: string;
      prevUrl: string;
      nextUrl: string;
      alt?: string;
      category: string;
      label: string;
    };

const listeners = new Set<() => void>();
const MAX_HISTORY = 50;

let undoStack: EditAction[] = [];
let redoStack: EditAction[] = [];

const isBrowser = typeof window !== "undefined";
const isChildFrame = isBrowser && window.top !== window;
const HISTORY_MESSAGE = "editHistory:push";

const notify = () => {
  listeners.forEach((listener) => listener());
};

const snapshot = () => ({
  canUndo: undoStack.length > 0,
  canRedo: redoStack.length > 0,
  undoCount: undoStack.length,
  redoCount: redoStack.length,
});

function internalPush(action: EditAction, broadcast: boolean) {
  undoStack = [action, ...undoStack].slice(0, MAX_HISTORY);
  redoStack = [];
  notify();

  if (broadcast && isChildFrame) {
    window.parent?.postMessage(
      { type: HISTORY_MESSAGE, action },
      window.location.origin
    );
  }
}

export function pushEdit(action: EditAction) {
  internalPush(action, true);
}

export function takeUndo() {
  const action = undoStack[0];
  if (!action) return null;
  undoStack = undoStack.slice(1);
  redoStack = [action, ...redoStack];
  notify();
  return action;
}

export function takeRedo() {
  const action = redoStack[0];
  if (!action) return null;
  redoStack = redoStack.slice(1);
  undoStack = [action, ...undoStack];
  notify();
  return action;
}

export function restoreUndo(action: EditAction) {
  redoStack = redoStack.filter((a) => a !== action);
  undoStack = [action, ...undoStack].slice(0, MAX_HISTORY);
  notify();
}

export function restoreRedo(action: EditAction) {
  undoStack = undoStack.filter((a) => a !== action);
  redoStack = [action, ...redoStack].slice(0, MAX_HISTORY);
  notify();
}

export function useEditHistory() {
  const [state, setState] = useState(snapshot());

  useEffect(() => {
    const handler = () => setState(snapshot());
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return {
    ...state,
    takeUndo,
    takeRedo,
    restoreUndo,
    restoreRedo,
  };
}

if (isBrowser) {
  const win = window as typeof window & { __editHistoryListener?: boolean };
  if (!win.__editHistoryListener) {
    win.__editHistoryListener = true;
    window.addEventListener("message", (event) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.type !== HISTORY_MESSAGE) return;
      internalPush(data.action as EditAction, false);
    });
  }
}
