import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';

export function useSchedules() {
  return useQuery({
    queryKey: ['schedules'],
    queryFn: () => api.getSchedules()
  });
}

export function useTriggerBackup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (scheduleName: string) => api.triggerBackup(scheduleName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    }
  });
}

export function useToggleSchedule(scheduleName: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (enabled: boolean) => api.updateSchedule(scheduleName, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    }
  });
}
