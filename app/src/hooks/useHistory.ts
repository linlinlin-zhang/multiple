import { useState, useEffect, useCallback } from "react";
import type { HistorySession, SessionDetail } from "@/types";

export function useHistory(limit = 20, offset = 0, includeDemo = false) {
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/history?limit=${limit}&offset=${offset}&includeDemo=${includeDemo}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.error || "Failed to fetch history");
      }
      setSessions(data.sessions || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [limit, offset, includeDemo]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { sessions, total, loading, error, refetch: fetchHistory };
}

export function useSession(sessionId: string | null) {
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    if (!sessionId) {
      setSession(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setSession(data as SessionDetail);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  return { session, loading, error, refetch: fetchSession };
}

export function buildAssetUrl(hash: string, kind: "upload" | "generated"): string {
  return `/api/assets/${hash}?kind=${kind}`;
}
