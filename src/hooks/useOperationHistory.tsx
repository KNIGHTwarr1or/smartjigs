import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

type OperationHistory = Tables<'operation_history'>;
type OperationHistoryInsert = TablesInsert<'operation_history'>;

export const useOperationHistory = (deviceId: string) => {
  const [operations, setOperations] = useState<OperationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !deviceId) {
      setLoading(false);
      return;
    }

    // Fetch initial operations
    const fetchOperations = async () => {
      const { data, error } = await supabase
        .from('operation_history')
        .select('*')
        .eq('device_id', deviceId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setOperations(data);
      }
      setLoading(false);
    };

    fetchOperations();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('operation-history-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'operation_history',
          filter: `device_id=eq.${deviceId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setOperations((prev) => [payload.new as OperationHistory, ...prev].slice(0, 50));
          } else if (payload.eventType === 'UPDATE') {
            setOperations((prev) =>
              prev.map((op) =>
                op.id === (payload.new as OperationHistory).id
                  ? (payload.new as OperationHistory)
                  : op
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, deviceId]);

  const startOperation = async (operationName: string, servoAngle: number) => {
    if (!user || !deviceId) return null;

    const newOperation: OperationHistoryInsert = {
      user_id: user.id,
      device_id: deviceId,
      operation_name: operationName,
      servo_angle: servoAngle,
      status: 'running',
      started_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('operation_history')
      .insert(newOperation)
      .select()
      .single();

    if (error) {
      console.error('Error starting operation:', error);
      return null;
    }

    return data;
  };

  const completeOperation = async (operationId: string, durationMs: number) => {
    const { error } = await supabase
      .from('operation_history')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        duration_ms: durationMs,
      })
      .eq('id', operationId);

    if (error) {
      console.error('Error completing operation:', error);
    }
  };

  const failOperation = async (operationId: string) => {
    const { error } = await supabase
      .from('operation_history')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', operationId);

    if (error) {
      console.error('Error failing operation:', error);
    }
  };

  return {
    operations,
    loading,
    startOperation,
    completeOperation,
    failOperation,
  };
};
