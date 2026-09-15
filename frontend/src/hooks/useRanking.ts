import { useState, useEffect, useCallback, useRef } from 'react';
import { RankingService } from '../services/ranking.service';
import type { RankingResponse } from '../types/ranking.types';

export function useRanking() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<RankingResponse>({
    candidates: [],
    totalCount: 0,
    page: 1,
    pageSize: 25,
    totalPages: 1,
    jobs: []
  });

  // Debounce search input by 300ms
  const searchTimeoutRef = useRef<any>(null);
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // reset to page 1 on new search
    }, 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [search]);

  // Reset page to 1 when changing job filter
  const handleJobChange = useCallback((newJobId: string) => {
    setSelectedJobId(newJobId);
    setPage(1);
  }, []);

  const fetchRanking = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await RankingService.getCandidateRanking({
        page,
        pageSize,
        jobId: selectedJobId,
        search: debouncedSearch
      });
      setData(response);
    } catch (err: any) {
      console.error('Error fetching candidate ranking:', err);
      setError(err?.message || 'Failed to load ranking data');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, selectedJobId, debouncedSearch]);

  useEffect(() => {
    fetchRanking();
  }, [fetchRanking]);

  return {
    loading,
    error,
    data,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    selectedJobId,
    setSelectedJobId: handleJobChange,
    refresh: fetchRanking
  };
}
