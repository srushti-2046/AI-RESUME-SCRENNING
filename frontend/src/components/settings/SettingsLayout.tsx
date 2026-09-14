// SettingsLayout.tsx — Horizontal top navigation (Account & Support) + Full-width modular sub-screens
import React, { useState } from 'react';
import {
  User, Bell, Shield, Settings2,
  HelpCircle, MessageCircle, BookOpen, Info, LifeBuoy
} from 'lucide-react';
import type { SettingsSection } from '../../types/settings.types';
import { ProfileSettings } from './ProfileSettings';
import { NotificationSettings } from './NotificationSettings';
import { PrivacySettings } from './PrivacySettings';
import { AccountSettings } from './AccountSettings';
import { HelpCenter } from './HelpCenter';
import { FAQ } from './FAQ';
import { SupportForm } from './SupportForm';
import { Guides } from './Guides';
import { AboutSettings } from './AboutSettings';
import { useDashboard } from '../../hooks/useDashboard';

interface Props {
  addToast?: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

type MainCategory = 'account' | 'support';

interface SubOptionItem {
  id: SettingsSection;
  label: string;
  icon: React.ReactNode;
  category: MainCategory;
  description: string;
}

const SUB_OPTIONS: Record<MainCategory, SubOptionItem[]> = {
  account: [
    { id: 'profile', label: 'Profile', icon: <User size={16} />, category: 'account', description: 'Personal details & public profile' },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={16} />, category: 'account', description: 'Email alerts & system digests' },
    { id: 'privacy', label: 'Privacy & Security', icon: <Shield size={16} />, category: 'account', description: 'Password, sessions & data privacy' },
    { id: 'account', label: 'Account', icon: <Settings2 size={16} />, category: 'account', description: 'Identifier, export & danger zone' },
  ],
  support: [
    { id: 'help', label: 'Help Center', icon: <HelpCircle size={16} />, category: 'support', description: 'Browse platform feature cards' },
    { id: 'faq', label: 'FAQ', icon: <MessageCircle size={16} />, category: 'support', description: 'Frequently asked questions' },
    { id: 'support', label: 'Support', icon: <LifeBuoy size={16} />, category: 'support', description: 'Submit & track customer tickets' },
    { id: 'guides', label: 'Guides', icon: <BookOpen size={16} />, category: 'support', description: 'Step-by-step feature walkthroughs' },
    { id: 'about', label: 'About', icon: <Info size={16} />, category: 'support', description: 'App version, Terms & Privacy Policy' },
  ],
};

export const SettingsLayout: React.FC<Props> = ({ addToast }) => {
  const [activeCategory, setActiveCategory] = useState<MainCategory>('account');
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const { user } = useDashboard();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Helper to switch main category and update sub-option appropriately
  const handleCategoryChange = (category: MainCategory) => {
    setActiveCategory(category);
    const subList = SUB_OPTIONS[category];
    // Default to the first sub-option of the chosen category
    if (subList.length > 0) {
      setActiveSection(subList[0].id);
    }
    scrollToTop();
  };

  const handleSubOptionClick = (subId: SettingsSection) => {
    if (SUB_OPTIONS.account.some(o => o.id === subId)) {
      setActiveCategory('account');
    } else if (SUB_OPTIONS.support.some(o => o.id === subId)) {
      setActiveCategory('support');
    }
    setActiveSection(subId);
    scrollToTop();
  };

  const currentSubOptions = SUB_OPTIONS[activeCategory];
  const activeSubMeta = currentSubOptions.find(o => o.id === activeSection)
    || SUB_OPTIONS.account.find(o => o.id === activeSection)
    || SUB_OPTIONS.support.find(o => o.id === activeSection);

  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return <ProfileSettings addToast={addToast} />;
      case 'notifications':
        return <NotificationSettings addToast={addToast} />;
      case 'privacy':
        return <PrivacySettings addToast={addToast} />;
      case 'account':
        return <AccountSettings addToast={addToast} />;
      case 'help':
        return <HelpCenter onSelectSection={handleSubOptionClick} addToast={addToast} />;
      case 'faq':
        return <FAQ />;
      case 'support':
        return <SupportForm addToast={addToast} />;
      case 'guides':
        return <Guides />;
      case 'about':
        return <AboutSettings />;
      default:
        return <ProfileSettings addToast={addToast} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', minHeight: '80vh' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title">{activeSubMeta?.label || 'Settings'}</h1>
          <p className="page-subtitle">{activeSubMeta?.description || 'Manage system settings and preferences.'}</p>
        </div>
        {user?.role && (
          <span style={{
            fontSize: '0.74rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '4px 10px',
            borderRadius: 6,
            background: 'var(--purple-bg, rgba(108,99,255,0.12))',
            color: 'var(--accent)',
            border: '1px solid rgba(108,99,255,0.2)'
          }}>
            {user.role} View
          </span>
        )}
      </div>

      {/* Horizontal Navigation Container */}
      <div className="card" style={{
        padding: '1.15rem 1.35rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {/* Tier 1: Main Category Tabs (Account vs Support) arranged horizontally */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '0.85rem'
        }}>
          <button
            type="button"
            onClick={() => handleCategoryChange('account')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.25rem',
              borderRadius: 8,
              border: activeCategory === 'account' ? '1.5px solid var(--accent)' : '1px solid var(--border)',
              background: activeCategory === 'account' ? 'var(--purple-bg, rgba(108,99,255,0.12))' : 'var(--card-hover-bg)',
              color: activeCategory === 'account' ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.9rem',
              transition: 'all 0.18s ease',
              boxShadow: activeCategory === 'account' ? '0 2px 8px rgba(108,99,255,0.2)' : 'none'
            }}
          >
            <Settings2 size={17} />
            <span>Account Settings</span>
          </button>

          <button
            type="button"
            onClick={() => handleCategoryChange('support')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.25rem',
              borderRadius: 8,
              border: activeCategory === 'support' ? '1.5px solid var(--accent)' : '1px solid var(--border)',
              background: activeCategory === 'support' ? 'var(--purple-bg, rgba(108,99,255,0.12))' : 'var(--card-hover-bg)',
              color: activeCategory === 'support' ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.9rem',
              transition: 'all 0.18s ease',
              boxShadow: activeCategory === 'support' ? '0 2px 8px rgba(108,99,255,0.2)' : 'none'
            }}
          >
            <LifeBuoy size={17} />
            <span>Support & Resources</span>
          </button>
        </div>

        {/* Tier 2: Sub-options of the active category arranged horizontally */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          alignItems: 'center'
        }}>
          {currentSubOptions.map(option => {
            const isSelected = activeSection === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSubOptionClick(option.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.55rem 1rem',
                  borderRadius: 7,
                  border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                  background: isSelected ? 'var(--accent)' : 'transparent',
                  color: isSelected ? '#ffffff' : 'var(--text-primary)',
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 2px 6px rgba(108,99,255,0.25)' : 'none'
                }}
                onMouseEnter={e => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLElement).style.background = 'var(--card-hover-bg)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                  }
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center' }}>{option.icon}</span>
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Full-width Sub-option Screen Content */}
      <div className="card" style={{
        padding: '1.75rem 2rem',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        background: 'var(--card-bg)'
      }}>
        {renderContent()}
      </div>
    </div>
  );
};
