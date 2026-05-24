import { useState, useEffect, useRef, useCallback } from "react";
import type { MaterialItem, MaterialSort, MaterialsResponse, SourceFilter } from "@/types";

const DEBOUNCE_MS = 300;

export function useMaterials(query: string, sort: MaterialSort, favoritedOnly = false, source: SourceFilter = "all") {
  const [items, setItems] = useState<MaterialItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchMaterials = useCallback(async (q: string, s: MaterialSort, fav: boolean, src: SourceFilter) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ sort: s });
      if (q.trim()) params.set("q", q.trim());
      if (fav) params.set("favorited", "1");
      if (src !== "all") {
        params.set("source", src);
        if (src === "system") params.set("includeHidden", "1");
      }
      const res = await fetch(`/api/materials?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: MaterialsResponse = await res.json();
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchMaterials(query, sort, favoritedOnly, source);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, sort, favoritedOnly, source, fetchMaterials]);

  const refetch = useCallback(() => {
    fetchMaterials(query, sort, favoritedOnly, source);
  }, [query, sort, favoritedOnly, source, fetchMaterials]);

  return { items, total, loading, error, refetch };
}
