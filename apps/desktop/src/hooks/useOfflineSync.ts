import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pos } from '../api';
import { useConnectionStatus } from './useConnectionStatus';

export interface OfflineOperation {
  id: string;
  type: 'customer_create' | 'customer_update';
  data: any;
  timestamp: number;
}

export function useOfflineSync() {
  const { isOnline } = useConnectionStatus();
  const queryClient = useQueryClient();
  const [queue, setQueue] = useState<OfflineOperation[]>([]);

  // Load queue from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('pos_offline_queue');
    if (stored) {
      try {
        setQueue(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load offline queue', e);
      }
    }
  }, []);

  // Save queue to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('pos_offline_queue', JSON.stringify(queue));
  }, [queue]);

  useEffect(() => {
    if (!isOnline || queue.length === 0) return;

    let cancelled = false;
    const drainQueue = async () => {
      const completed: string[] = [];
      for (const operation of queue) {
        try {
          await pos.queueOperation({
            type: operation.type,
            data: operation.data,
            localTimestamp: new Date(operation.timestamp).toISOString(),
          });
          completed.push(operation.id);
        } catch {
          break;
        }
      }
      if (!cancelled && completed.length > 0) {
        setQueue((current) => current.filter((operation) => !completed.includes(operation.id)));
      }
    };

    void drainQueue();
    return () => { cancelled = true; };
  }, [isOnline, queue]);

  const queueMutation = useMutation({
    mutationFn: (operation: Omit<OfflineOperation, 'id' | 'timestamp'> & { localTimestamp: string }) =>
      pos.queueOperation(operation),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-sync-status'] });
    },
  });

  const addToQueue = async (
    type: 'customer_create' | 'customer_update',
    data: any
  ) => {
    const operation: OfflineOperation = {
      id: `offline-${Date.now()}-${Math.random()}`,
      type,
      data,
      timestamp: Date.now(),
    };

    if (isOnline) {
      // If online, send immediately
      try {
        await queueMutation.mutateAsync({
          type,
          data,
          localTimestamp: new Date(operation.timestamp).toISOString(),
        });
        return { success: true, error: null };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    } else {
      // If offline, add to local queue
      setQueue((prev) => [...prev, operation]);
      return { success: true, error: null, queued: true };
    }
  };

  const canOperateOffline = (operationType: string): boolean => {
    // Only customer operations are allowed offline
    return (
      operationType === 'customer_create' || operationType === 'customer_update'
    );
  };

  const getOfflineRestrictionMessage = (lang: 'en' | 'ar'): string => {
    return lang === 'ar'
      ? 'لا يمكن إجراء عمليات البيع أو الحجز في وضع غير متصل. يُسمح فقط بإنشاء وتحديث العملاء.'
      : 'Sales and reservations cannot be processed offline. Only customer creation and updates are allowed.';
  };

  return {
    isOnline,
    queue,
    queueCount: queue.length,
    addToQueue,
    canOperateOffline,
    getOfflineRestrictionMessage,
    isQueueing: queueMutation.isPending,
  };
}
