import { useEffect, useRef, useCallback } from "react";

export function useSSE(url: string | null, onMessage: (data: any) => void) {
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!url) return;
    const es = new EventSource(url);
    eventSourceRef.current = es;
    es.onmessage = (event) => {
      try {
        onMessage(JSON.parse(event.data));
      } catch {
        onMessage(event.data);
      }
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [url, onMessage]);
}

export function useAutoAdvance(
  currentState: string,
  onAdvance: () => void,
  delay: number = 500
) {
  useEffect(() => {
    const autoStates = ["S2_TRANSLATE", "S3_EXTRACT", "S4_GAP_ANALYSIS", "S9_OPTIMIZE", "S11_VALIDATE"];
    if (autoStates.includes(currentState)) {
      const timer = setTimeout(onAdvance, delay);
      return () => clearTimeout(timer);
    }
  }, [currentState, onAdvance, delay]);
}
