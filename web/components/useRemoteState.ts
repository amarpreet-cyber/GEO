"use client";
import { useEffect, useRef, useState } from "react";

// Server-persisted state via /api/state — a near drop-in for the old
// useState+localStorage pattern. Loads the slice on mount, debounce-PUTs on change.
export function useRemoteState<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>, boolean] {
  const [state, setState] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/state?key=${key}`)
      .then((r) => r.json())
      .then((d) => { if (alive && d?.ok && d.value != null) setState(d.value as T); })
      .catch(() => { /* keep initial */ })
      .finally(() => alive && setReady(true));
    return () => { alive = false; };
  }, [key]);

  useEffect(() => {
    if (!ready) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      fetch("/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: state }),
      }).catch(() => { /* best effort */ });
    }, 350);
  }, [state, ready, key]);

  return [state, setState, ready];
}
