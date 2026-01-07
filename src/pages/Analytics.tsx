import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { BarChart3, Clock, TrendingUp, Activity, ArrowLeft, Loader2, CheckCircle2, XCircle, Timer } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOperationHistory } from "@/hooks/useOperationHistory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer, AreaChart, Area } from "recharts";

const DEVICE_ID = "esp32-drill-001";

const Analytics = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { operations, loading: historyLoading } = useOperationHistory(DEVICE_ID);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || historyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  // Calculate stats - 3 operations = 1 part
  const completedOps = operations.filter(op => op.status === 'completed');
  const partsCompleted = Math.floor(completedOps.length / 3);
  const operationsInProgress = completedOps.length % 3;
  
  const totalMachineTime = completedOps.reduce((acc, op) => acc + (op.duration_ms || 0), 0);
  const avgPartTime = partsCompleted > 0 ? totalMachineTime / partsCompleted : 0;
  const successRate = operations.length > 0 ? (completedOps.length / operations.length) * 100 : 0;

  // Parts per operation type
  const operationBreakdown = operations.reduce((acc, op) => {
    const name = op.operation_name || 'Unknown';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(operationBreakdown).map(([name, count]) => ({
    name: name.replace(/Operation \d+ - /, ''),
    value: count,
  }));

  const COLORS = ['hsl(185, 80%, 50%)', 'hsl(145, 70%, 45%)', 'hsl(40, 90%, 55%)', 'hsl(270, 70%, 60%)'];

  // Daily operations chart
  const dailyOps = operations.reduce((acc, op) => {
    const date = new Date(op.created_at).toLocaleDateString('en-US', { weekday: 'short' });
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const barData = Object.entries(dailyOps).slice(-7).map(([day, count]) => ({
    day,
    operations: count,
  }));

  // Machine uptime calculation (last 24h)
  const last24h = operations.filter(op => {
    const opTime = new Date(op.created_at).getTime();
    return Date.now() - opTime < 24 * 60 * 60 * 1000;
  });
  const uptimeMinutes = last24h.reduce((acc, op) => acc + (op.duration_ms || 0) / 60000, 0);

  // Timeline data for area chart
  const timelineData = completedOps.slice(0, 20).reverse().map((op, idx) => ({
    index: idx + 1,
    duration: Math.round((op.duration_ms || 0) / 1000),
    angle: op.servo_angle,
  }));

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const chartConfig = {
    operations: { label: "Operations", color: "hsl(185, 80%, 50%)" },
    duration: { label: "Duration (s)", color: "hsl(145, 70%, 45%)" },
    angle: { label: "Servo Angle", color: "hsl(40, 90%, 55%)" },
  };

  return (
    <div className="min-h-screen p-6 md:p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BarChart3 className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Operation <span className="text-primary glow-text">Analytics</span>
              </h1>
              <p className="text-muted-foreground text-sm">Machine Performance & History</p>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="card-industrial">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/20">
                <CheckCircle2 className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success">{partsCompleted}</p>
                <p className="text-xs text-muted-foreground">Parts Completed</p>
                {operationsInProgress > 0 && (
                  <p className="text-xs text-warning">+{operationsInProgress}/3 in progress</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-industrial">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary font-mono">{formatDuration(totalMachineTime)}</p>
                <p className="text-xs text-muted-foreground">Total Machine Time</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-industrial">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/20">
                <TrendingUp className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-accent">{successRate.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-industrial">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/20">
                <Activity className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-warning font-mono">{uptimeMinutes.toFixed(1)}m</p>
                <p className="text-xs text-muted-foreground">Uptime (24h)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Operations by Day */}
        <Card className="card-industrial">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Operations by Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            {barData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[200px] w-full">
                <BarChart data={barData}>
                  <XAxis dataKey="day" tick={{ fill: 'hsl(220, 10%, 55%)', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'hsl(220, 10%, 55%)', fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="operations" fill="hsl(185, 80%, 50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No operation data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Parts Breakdown */}
        <Card className="card-industrial">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Parts Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="flex items-center justify-center">
                <ChartContainer config={chartConfig} className="h-[200px] w-full max-w-[300px]">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No parts data yet
              </div>
            )}
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {pieData.map((entry, idx) => (
                <Badge key={entry.name} variant="outline" className="gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  {entry.name}: {entry.value}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Duration Timeline */}
        <Card className="card-industrial lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Timer className="w-5 h-5 text-primary" />
              Operation Duration Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timelineData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[200px] w-full">
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="durationGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(145, 70%, 45%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(145, 70%, 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="index" tick={{ fill: 'hsl(220, 10%, 55%)', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'hsl(220, 10%, 55%)', fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="duration" stroke="hsl(145, 70%, 45%)" fill="url(#durationGradient)" strokeWidth={2} />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No timeline data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Operation History Table */}
      <Card className="card-industrial">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Recent Operations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {operations.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No operations recorded yet</p>
            ) : (
              <div className="space-y-2">
                {operations.map((op) => (
                  <div
                    key={op.id}
                    className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-border/50"
                  >
                    <div className="flex items-center gap-4">
                      {op.status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      ) : op.status === 'failed' ? (
                        <XCircle className="w-5 h-5 text-destructive" />
                      ) : (
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      )}
                      <div>
                        <p className="font-medium">{op.operation_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Servo: {op.servo_angle}° • {new Date(op.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-primary">{op.duration_ms ? formatDuration(op.duration_ms) : '-'}</p>
                      <Badge variant={op.status === 'completed' ? 'default' : op.status === 'failed' ? 'destructive' : 'secondary'} className="text-xs">
                        {op.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Footer */}
      <footer className="mt-12 text-center text-xs text-muted-foreground">
        <p>ESP32 Drilling Analytics • Real-time Machine Performance Monitoring</p>
      </footer>
    </div>
  );
};

export default Analytics;
