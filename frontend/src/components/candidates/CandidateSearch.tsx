import React from 'react';
import { Search, X } from 'lucide-react';

interface CandidateSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const CandidateSearch: React.FC<CandidateSearchProps> = ({
  value,
  onChange,
  placeholder = 'Search candidate or role...'
}) => {
  return (
    <div className="header-search" style={{ width: 240, position: 'relative' }}>
      <Search size={14} color="#9ca3af" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ paddingRight: value ? '1.8rem' : '0.5rem' }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#9ca3af',
            display: 'flex',
            alignItems: 'center',
            padding: 2
          }}
          title="Clear search"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
};
