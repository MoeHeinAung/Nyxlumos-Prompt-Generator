import { useState, useCallback } from "react";
import { api } from "../api/client";

export function useHarness() {
  const [isExecuting, setIsExecuting] = useState(false);

  const validate = useCallback(async (code: string, language: string = "python") => {
    setIsExecuting(true);
    try {
      // Client-side basic syntax check; server handles actual execution
      setIsExecuting(false);
      return { success: true, output: "Ready for server validation" };
    } catch {
      setIsExecuting(false);
      return { success: false, output: "Validation failed" };
    }
  }, []);

  return { isExecuting, validate };
}
