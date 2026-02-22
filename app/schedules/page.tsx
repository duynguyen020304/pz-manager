'use client';

import { useTranslations } from 'next-intl';
import { useConfig, useSaveConfig } from '@/hooks/use-api';
import { useState } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  X,
  Calendar,
  AlertCircle,
  RotateCcw,
  Save,
  Play,
  Pause
} from 'lucide-react';
import { Schedule } from '@/types';

const intervalOptions = [
  { value: '*/5 * * * *', short: '5min' },
  { value: '*/10 * * * *', short: '10min' },
  { value: '*/30 * * * *', short: '30min' },
  { value: '0 * * * *', short: 'hourly' },
  { value: '0 0 * * *', short: 'daily' },
  { value: '0 1 * * *', short: 'daily' },
  { value: '0 2 * * *', short: 'daily' },
  { value: '0 3 * * *', short: 'daily' },
  { value: '0 0 * * 0', short: 'weekly' },
  { value: '0 1 * * 0', short: 'weekly' },
  { value: '0 2 * * 0', short: 'weekly' },
  { value: '0 3 * * 0', short: 'weekly' },
  { value: '0 4 * * 0', short: 'weekly' },
];

export default function SchedulesPage() {
  const t = useTranslations('pages.schedules');
  const { data: config, isLoading } = useConfig();
  const saveConfig = useSaveConfig();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newSchedule, setNewSchedule] = useState<Partial<Schedule>>({
    name: '',
    interval: '0 * * * *',
    enabled: true,
    retention: 10,
  });
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleAddSchedule = async () => {
    if (!newSchedule.name || !config) return;
    
    try {
      const updatedSchedules = [...config.schedules, newSchedule as Schedule];
      await saveConfig.mutateAsync({
        ...config,
        schedules: updatedSchedules,
      });
      setIsAddingNew(false);
      setNewSchedule({
        name: '',
        interval: '0 * * * *',
        enabled: true,
        retention: 10,
      });
      setSaveError(null);
    } catch (error) {
      setSaveError(t('errors.addFailed'));
      console.error('Failed to add schedule:', error);
    }
  };

  const handleDeleteSchedule = async (scheduleName: string) => {
    if (!config) return;
    
    try {
      const updatedSchedules = config.schedules.filter(s => s.name !== scheduleName);
      await saveConfig.mutateAsync({
        ...config,
        schedules: updatedSchedules,
      });
      setSaveError(null);
    } catch (error) {
      setSaveError(t('errors.deleteFailed'));
      console.error('Failed to delete schedule:', error);
    }
  };

  const handleToggleSchedule = async (schedule: Schedule) => {
    if (!config) return;
    
    try {
      const updatedSchedules = config.schedules.map(s =>
        s.name === schedule.name ? { ...s, enabled: !s.enabled } : s
      );
      await saveConfig.mutateAsync({
        ...config,
        schedules: updatedSchedules,
      });
      setSaveError(null);
    } catch (error) {
      setSaveError(t('errors.updateFailed'));
      console.error('Failed to update schedule:', error);
    }
  };

  const getIntervalLabel = (interval: string) => {
    const option = intervalOptions.find(opt => opt.value === interval);
    return option ? t(`intervals.${option.short}`) : interval;
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-muted-foreground mt-2">{t('description')}</p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-card border border-border rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-muted-foreground mt-2">{t('description')}</p>
        </div>
        <button
          onClick={() => setIsAddingNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('addSchedule')}
        </button>
      </div>

      {saveError && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3 text-destructive">
          <AlertCircle className="w-5 h-5" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Schedules List */}
      <div className="space-y-4">
        {config?.schedules.map((schedule) => (
          <div
            key={schedule.name}
            className="bg-card border border-border rounded-lg p-6 hover:border-primary/20 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  schedule.enabled ? 'bg-primary/10' : 'bg-muted'
                }`}>
                  <Clock className={`w-6 h-6 ${schedule.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-foreground">{schedule.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      schedule.enabled 
                        ? 'bg-primary/10 text-primary' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {schedule.enabled ? t('status.active') : t('status.paused')}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {getIntervalLabel(schedule.interval)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <RotateCcw className="w-4 h-4" />
                      {t('retention', { count: schedule.retention })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleSchedule(schedule)}
                  className={`p-2 rounded-lg transition-colors ${
                    schedule.enabled
                      ? 'text-primary hover:bg-primary/10'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                  title={schedule.enabled ? t('tooltips.pause') : t('tooltips.resume')}
                >
                  {schedule.enabled ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => handleDeleteSchedule(schedule.name)}
                  className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  title={t('tooltips.delete')}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {(!config?.schedules || config.schedules.length === 0) && !isAddingNew && (
          <div className="text-center py-16 bg-card border border-border border-dashed rounded-lg">
            <Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium text-foreground mb-2">{t('empty.title')}</h3>
            <p className="text-muted-foreground mb-6">{t('empty.description')}</p>
            <button
              onClick={() => setIsAddingNew(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('addSchedule')}
            </button>
          </div>
        )}
      </div>

      {/* Add Schedule Modal */}
      {isAddingNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground">{t('modal.title')}</h2>
              <button
                onClick={() => setIsAddingNew(false)}
                className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t('modal.nameLabel')}
                </label>
                <input
                  type="text"
                  value={newSchedule.name}
                  onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
                  placeholder={t('modal.namePlaceholder')}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t('modal.intervalLabel')}
                </label>
                <select
                  value={newSchedule.interval}
                  onChange={(e) => setNewSchedule({ ...newSchedule, interval: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                >
                  {intervalOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(`intervals.${option.short}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t('modal.retentionLabel')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newSchedule.retention}
                  onChange={(e) => setNewSchedule({ ...newSchedule, retention: parseInt(e.target.value) || 10 })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('modal.retentionHint')}
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={newSchedule.enabled}
                  onChange={(e) => setNewSchedule({ ...newSchedule, enabled: e.target.checked })}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="enabled" className="text-sm text-foreground">
                  {t('modal.enabledLabel')}
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsAddingNew(false)}
                className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
              >
                {t('modal.cancel')}
              </button>
              <button
                onClick={handleAddSchedule}
                disabled={!newSchedule.name || saveConfig.isPending}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saveConfig.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    {t('modal.saving')}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {t('modal.save')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
