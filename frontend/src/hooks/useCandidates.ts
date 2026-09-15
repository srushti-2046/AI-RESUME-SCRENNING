import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CandidateService } from '../services/candidate.service';
import type {
  CandidateFilterTab,
  CandidateListItem,
  GetCandidatesResponse
} from '../types/candidate.types';

export function useCandidates() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse initial tab from URL query param (?status=shortlisted, ?status=pending_review or ?status=rejected)
  const initialStatusParam = (searchParams.get('status')?.toLowerCase() || 'all') as CandidateFilterTab;
  const validInitialTab: CandidateFilterTab =
    initialStatusParam === 'shortlisted' || initialStatusParam === 'pending_review' || initialStatusParam === 'rejected'
      ? initialStatusParam
      : 'all';

  const initialSearchParam = searchParams.get('search') || searchParams.get('q') || '';
  const [filter, setFilter] = useState<CandidateFilterTab>(validInitialTab);
  const [search, setSearch] = useState(initialSearchParam);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearchParam);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(9); // 3x3 grid default
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [loading, setLoading] = useState(true);

  // Sync search state when URL ?search= parameter changes (e.g. from Navbar Search)
  useEffect(() => {
    const urlSearch = searchParams.get('search') || searchParams.get('q') || '';
    if (urlSearch !== search) {
      setSearch(urlSearch);
      setDebouncedSearch(urlSearch);
      setPage(1);
    }
  }, [searchParams]);

  const [data, setData] = useState<GetCandidatesResponse>({
    candidates: [],
    totalCount: 0,
    page: 1,
    pageSize: 9,
    totalPages: 1,
    counts: { all: 0, shortlisted: 0, pending_review: 0, rejected: 0 }
  });

  const [selectedCandidate, setSelectedCandidate] = useState<CandidateListItem | null>(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  // Debounce search typing by 300ms
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

  // Sync tab state with URL parameter
  const handleTabChange = useCallback((newTab: CandidateFilterTab) => {
    setFilter(newTab);
    setPage(1);
    if (newTab === 'all') {
      searchParams.delete('status');
      setSearchParams(searchParams);
    } else {
      searchParams.set('status', newTab);
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  // Main data fetch function
  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await CandidateService.getCandidates({
        status: filter,
        search: debouncedSearch,
        page,
        pageSize,
        sortBy: 'created_at',
        sortDirection: 'desc'
      });
      setData(response);
    } catch (err) {
      console.error('useCandidates fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filter, debouncedSearch, page, pageSize]);

  // Trigger fetch when parameters change
  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  // Summary modal handlers
  const openSummary = (candidate: CandidateListItem) => {
    setSelectedCandidate(candidate);
    setIsSummaryModalOpen(true);
  };

  const closeSummary = () => {
    setSelectedCandidate(null);
    setIsSummaryModalOpen(false);
  };

  return {
    filter,
    setFilter: handleTabChange,
    search,
    setSearch,
    page,
    setPage,
    pageSize,
    setPageSize,
    viewMode,
    setViewMode,
    loading,
    data,
    refresh: fetchCandidates,
    selectedCandidate,
    isSummaryModalOpen,
    openSummary,
    closeSummary
  };
}
