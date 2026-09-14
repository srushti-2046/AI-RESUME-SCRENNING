// SettingsSidebar.tsx — Left navigation panel
import React from 'react';
import {
  User, Bell, Shield, Settings2,
  HelpCircle, MessageCircle,
  BookOpen, Info, ChevronRight
} from 'lucide-react';
import type { SettingsSection } from '../../types/settings.types';

interface SidebarItem {
  id: SettingsSection;
  label: string;
  icon: React.ReactNode;
  group?: string;
}

const ITEMS: SidebarItem[] = [
  { id: 'profile', label: 'Profile', icon: <User size={16} />, group: 'Account' },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={16} />, group: 'Account' },
  { id: 'privacy', label: 'Privacy & Security', icon: <Shield size={16} />, group: 'Account' },
  { id: 'account', label: 'Account', icon: <Settings2 size={16} />, group: 'Account' },
  { id: 'help', label: 'Help Center', icon: <HelpCircle size={16} />, group: 'Support' },
  { id: 'faq', label: 'FAQ', icon: <HelpCircle size={16} />, group: 'Support' },
  { id: 'support', label: 'Support', icon: <MessageCircle size={16} />, group: 'Support' },
  { id: 'guides', label: 'Guides', icon: <BookOpen size={16} />, group: 'Support' },
  { id: 'about', label: 'About', icon: <Info size={16} />, group: 'Support' },
];

interface Props {
  active: SettingsSection;
  onChange: (s: SettingsSection) => void;
}

export const SettingsSidebar: React.FC<Props> = ({ active, onChange }) => {
  const groups = ['Account', 'Support'];

  return (
    <nav style={{
      width: '240px', flexShrink: 0, background: 'var(--sidebar-bg, var(--card-bg))',
      borderRight: '1px solid var(--border)', padding: '1.25rem 0',
      display: 'flex', flexDirection: 'column', gap: '0.25rem', minHeight: '100%',
    }}>
      {groups.map(group => (
        <div key={group}>
          <div style={{
            padding: '0.35rem 1.25rem 0.2rem',
            fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.07em',
            color: 'var(--text-muted)', textTransform: 'uppercase',
            marginTop: group !== 'Account' ? '0.75rem' : '0',
          }}>
            {group}
          </div>
          {ITEMS.filter(i => i.group === group).map(item => {
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChange(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.65rem',
                  width: '100%', padding: '0.6rem 1.25rem',
                  background: isActive ? 'var(--purple-bg, rgba(108,99,255,0.12))' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  fontSize: '0.85rem', fontWeight: isActive ? 700 : 500,
                  borderRadius: '0',
                  borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--card-hover-bg)'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <span style={{ opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {isActive && <ChevronRight size={13} style={{ opacity: 0.5 }} />}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
};
