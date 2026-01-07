import { History, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Tables } from '@/integrations/supabase/types';

type OperationHistory = Tables<'operation_history'>;

interface OperationHistoryProps {
  operations: OperationHistory[];
  loading: boolean;
}

export const OperationHistory = ({ operations, loading }: OperationHistoryProps) => {
  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      default:
        return <div className="w-4 h-4 rounded-full bg-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="card-industrial p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Operation History</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="card-industrial p-6">
      <div className="flex items-center gap-2 mb-4">
        <History className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Operation History</h3>
      </div>

      <ScrollArea className="h-[200px]">
        {operations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No operations recorded yet
          </p>
        ) : (
          <div className="space-y-2">
            {operations.map((op) => (
              <div
                key={op.id}
                className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(op.status)}
                  <div>
                    <p className="text-sm font-medium">{op.operation_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Angle: {op.servo_angle}° • {formatTime(op.started_at)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono text-primary">
                    {formatDuration(op.duration_ms)}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {op.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
