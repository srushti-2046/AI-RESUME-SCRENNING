// useSettings.ts — State management hook for the Settings page
import { useState, useCallback } from 'react';
import type { SettingsSection } from '../types/settings.types';

export function useSettings() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const withSave = useCallback(async (fn: () => Promise<void>, onSuccess?: () => void) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await fn();
      onSuccess?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save settings';
      setSaveError(msg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return {
    activeSection,
    setActiveSection,
    isSaving,
    saveError,
    withSave,
  };
}
