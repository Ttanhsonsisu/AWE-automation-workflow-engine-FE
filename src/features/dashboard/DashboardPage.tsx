import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  LayoutDashboard,
  Activity,
  CheckCircle2,
  Clock,
  Zap,
  AlertTriangle,
  Server,
  Layers,
  Calendar,
  Webhook,
  XCircle,
  Radio,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { format, parseISO } from 'date-fns';

import {
  useDashboardOverview,
  useDashboardTrends,
  useDashboardTopFailures,
  useDashboardLive,
  useDashboardWorkersHealth,
  useDashboardQueuesHealth,
  useDashboardSchedulerHealth,
  useDashboardWebhooksHealth,
} from '@/api/dashboard';
import type { TrendMetric, TrendGranularity } from '@/types/dashboard';

// ─── Helpers ──────────────────────────────────────────────────────

const fmtNum = (n: number | undefined) => (n == null ? '—' : n.toLocaleString());
const fmtPct = (n: number | undefined) => (n == null ? '—' : `${n}%`);
const fmtMin = (n: number | undefined) => (n == null ? '—' : `${n} min`);

// ─── Stat Card ────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  loading?: boolean;
  idx?: number;
}

const StatCard: React.FC<StatCardProps> = ({
  title, value, subtitle, icon: Icon, color, bgColor, loading, idx = 0,
}) => (
  <Card
    className="group bg-card border-border shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300 cursor-default animate-page-enter"
    style={{ animationDelay: `${idx * 60}ms` }}
  >
    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className={cn('size-9 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110', bgColor)}>
        <Icon className={cn('size-[18px]', color)} />
      </div>
    </CardHeader>
    <CardContent>
      {loading ? (
        <>
          <Skeleton className="h-7 w-20 mb-1" />
          <Skeleton className="h-3 w-28" />
        </>
      ) : (
        <>
          <div className="text-2xl font-bold text-foreground">{value}</div>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </>
      )}
    </CardContent>
  </Card>
);

// ─── Live Indicator Bar ───────────────────────────────────────────

const LiveBar: React.FC = () => {
  const { snapshot, connected } = useDashboardLive();

  return (
    <div className="flex items-center gap-5 flex-wrap px-4 py-2.5 rounded-xl bg-card border border-border shadow-sm animate-page-enter">
      {/* Connection dot */}
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <span className="relative flex size-2.5">
          <span className={cn(
            'absolute inline-flex h-full w-full rounded-full opacity-75',
            connected ? 'animate-ping bg-emerald-400' : 'bg-red-400',
          )} />
          <span className={cn(
            'relative inline-flex size-2.5 rounded-full',
            connected ? 'bg-emerald-500' : 'bg-red-500',
          )} />
        </span>
        {connected ? 'Live' : 'Reconnecting…'}
      </div>

      <div className="h-4 w-px bg-border" />

      <div className="flex items-center gap-1.5 text-sm">
        <Zap className="size-3.5 text-amber-500" />
        <span className="font-semibold text-foreground">{snapshot?.runningInstances ?? '—'}</span>
        <span className="text-muted-foreground">running</span>
      </div>

      <div className="flex items-center gap-1.5 text-sm">
        <Layers className="size-3.5 text-blue-500" />
        <span className="font-semibold text-foreground">{snapshot?.pendingPointers ?? '—'}</span>
        <span className="text-muted-foreground">pending steps</span>
      </div>

      <div className="flex items-center gap-1.5 text-sm">
        <AlertTriangle className={cn('size-3.5', (snapshot?.failedLastHour ?? 0) > 0 ? 'text-red-500' : 'text-muted-foreground')} />
        <span className={cn('font-semibold', (snapshot?.failedLastHour ?? 0) > 0 ? 'text-red-500' : 'text-foreground')}>
          {snapshot?.failedLastHour ?? '—'}
        </span>
        <span className="text-muted-foreground">failed (1h)</span>
      </div>
    </div>
  );
};

// ─── Trends Chart ─────────────────────────────────────────────────

const metricLabels: Record<TrendMetric, string> = {
  throughput: 'Throughput',
  successrate: 'Success Rate',
  duration: 'Avg Duration',
};

const TrendsChart: React.FC = () => {
  const [metric, setMetric] = useState<TrendMetric>('throughput');
  const [granularity, setGranularity] = useState<TrendGranularity>('day');
  const { data, isLoading } = useDashboardTrends(metric, granularity);

  const chartData = data?.points.map((p) => ({
    bucket: format(parseISO(p.bucket), granularity === 'hour' ? 'HH:mm' : 'dd/MM'),
    value: p.value,
  })) ?? [];

  const yLabel = metric === 'successrate' ? '%' : metric === 'duration' ? 'min' : '';

  return (
    <Card className="bg-card border-border shadow-sm col-span-1 lg:col-span-2">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <CardTitle className="text-base font-semibold">Execution Trends</CardTitle>
          <CardDescription>
            {metricLabels[metric]} over the last 30 days
          </CardDescription>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Tabs value={metric} onValueChange={(v) => setMetric(v as TrendMetric)}>
            <TabsList className="h-8">
              <TabsTrigger value="throughput" className="text-xs px-2.5">Throughput</TabsTrigger>
              <TabsTrigger value="successrate" className="text-xs px-2.5">Success %</TabsTrigger>
              <TabsTrigger value="duration" className="text-xs px-2.5">Duration</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs value={granularity} onValueChange={(v) => setGranularity(v as TrendGranularity)}>
            <TabsList className="h-8">
              <TabsTrigger value="day" className="text-xs px-2.5">Day</TabsTrigger>
              <TabsTrigger value="hour" className="text-xs px-2.5">Hour</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-end gap-1 h-56">
            {Array.from({ length: 20 }).map((_, i) => (
              <Skeleton key={i} className="flex-1 rounded-sm" style={{ height: `${Math.random() * 80 + 20}%` }} />
            ))}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(26, 80%, 52%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(26, 80%, 52%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="bucket"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                unit={yLabel}
                width={50}
              />
              <RTooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(26, 80%, 52%)"
                strokeWidth={2}
                fill="url(#trendFill)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: 'hsl(26, 80%, 52%)' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Top Failures ─────────────────────────────────────────────────

const TopFailures: React.FC = () => {
  const { data, isLoading } = useDashboardTopFailures(8);

  const barData = data?.map((f) => ({
    name: f.definitionName.length > 22 ? f.definitionName.slice(0, 22) + '…' : f.definitionName,
    failures: f.failureCount,
    lastFailed: f.lastFailureAt,
  })) ?? [];

  return (
    <Card className="bg-card border-border shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <XCircle className="size-4 text-red-500" />
          Top Failures (30d)
        </CardTitle>
        <CardDescription>Most-failing workflow definitions</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-12 ml-auto" />
              </div>
            ))}
          </div>
        ) : barData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <CheckCircle2 className="size-10 mb-2 text-emerald-500/60" />
            <p className="text-sm">No failures in the last 30 days 🎉</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                width={130}
                axisLine={false}
                tickLine={false}
              />
              <RTooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: 12,
                }}
              />
              <Bar dataKey="failures" radius={[0, 4, 4, 0]} barSize={18}>
                {barData.map((_, index) => (
                  <Cell key={index} fill={`hsl(0, ${60 + index * 3}%, ${55 - index * 3}%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Health Mini-Card ─────────────────────────────────────────────

interface HealthItemProps {
  label: string;
  value: number | undefined;
  warn?: boolean;
}

const HealthItem: React.FC<HealthItemProps> = ({ label, value, warn }) => (
  <div className="flex items-center justify-between py-1.5">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className={cn('text-sm font-semibold tabular-nums', warn ? 'text-red-500' : 'text-foreground')}>
      {value ?? '—'}
    </span>
  </div>
);

const HealthSection: React.FC = () => {
  const workers = useDashboardWorkersHealth();
  const queues = useDashboardQueuesHealth();
  const scheduler = useDashboardSchedulerHealth();
  const webhooks = useDashboardWebhooksHealth();

  const anyLoading = workers.isLoading || queues.isLoading || scheduler.isLoading || webhooks.isLoading;

  if (anyLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="bg-card border-border shadow-sm">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* Workers */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Server className="size-4 text-blue-500" /> Workers
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {(workers.data ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No workers reporting</p>
          ) : (
            workers.data!.map((w) => (
              <div key={w.workerId} className="flex items-center justify-between py-1.5">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-xs text-muted-foreground truncate max-w-[110px]">
                        {w.workerId}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{w.workerId}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Badge variant={w.status === 'Healthy' ? 'default' : 'destructive'} className="text-[10px] h-4">
                  {w.status}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Queues */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Layers className="size-4 text-violet-500" /> Queues
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <HealthItem label="Pending" value={queues.data?.pendingPointers} warn={(queues.data?.pendingPointers ?? 0) > 100} />
          <HealthItem label="Running" value={queues.data?.runningPointers} />
          <HealthItem label="Suspended" value={queues.data?.suspendedPointers} warn={(queues.data?.suspendedPointers ?? 0) > 0} />
          <HealthItem label="Outbox Backlog" value={queues.data?.outboxBacklog} warn={(queues.data?.outboxBacklog ?? 0) > 50} />
        </CardContent>
      </Card>

      {/* Scheduler */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="size-4 text-emerald-500" /> Scheduler
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <HealthItem label="Active Schedules" value={scheduler.data?.activeSchedules} />
          <HealthItem label="Pending Sync" value={scheduler.data?.pendingSyncTasks} />
          <HealthItem label="Failed Sync" value={scheduler.data?.failedSyncTasks} warn={(scheduler.data?.failedSyncTasks ?? 0) > 0} />
          <HealthItem label="Overdue" value={scheduler.data?.overdueSyncTasks} warn={(scheduler.data?.overdueSyncTasks ?? 0) > 0} />
        </CardContent>
      </Card>

      {/* Webhooks */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Webhook className="size-4 text-amber-500" /> Webhooks
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <HealthItem label="Active Routes" value={webhooks.data?.activeRoutes} />
          <HealthItem label="Idempotency" value={webhooks.data?.idempotencyEnabledRoutes} />
          <HealthItem label="Triggered (24h)" value={webhooks.data?.triggeredExecutionsLast24h} />
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Main Dashboard Page ──────────────────────────────────────────

const DashboardPage: React.FC = () => {
  const { data: overview, isLoading: overviewLoading } = useDashboardOverview();

  const statCards: StatCardProps[] = [
    {
      title: 'Total Workflows',
      value: overview ? `${fmtNum(overview.activeWorkflows)} / ${fmtNum(overview.totalWorkflows)}` : '—',
      subtitle: `${overview?.activeWorkflows ?? 0} published`,
      icon: LayoutDashboard,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-500/10',
      loading: overviewLoading,
    },
    {
      title: 'Executions (30d)',
      value: fmtNum(overview?.totalExecutions),
      subtitle: `${fmtNum(overview?.completedExecutions)} completed · ${fmtNum(overview?.failedExecutions)} failed`,
      icon: Activity,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      loading: overviewLoading,
    },
    {
      title: 'Success Rate',
      value: fmtPct(overview?.successRate),
      subtitle: overview ? `Failure rate: ${fmtPct(overview.failureRate)}` : undefined,
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      loading: overviewLoading,
    },
    {
      title: 'Running Now',
      value: fmtNum(overview?.runningNow),
      subtitle: 'Active workflow instances',
      icon: Zap,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      loading: overviewLoading,
    },
    {
      title: 'Avg Duration',
      value: fmtMin(overview?.averageDurationMinutes),
      subtitle: overview ? `P95: ${fmtMin(overview.p95DurationMinutes)}` : undefined,
      icon: Clock,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      loading: overviewLoading,
    },
    {
      title: 'Failure Rate',
      value: fmtPct(overview?.failureRate),
      subtitle: `${fmtNum(overview?.failedExecutions)} failed in 30 days`,
      icon: AlertTriangle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      loading: overviewLoading,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time overview of your automation platform.
          </p>
        </div>
        <LiveBar />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
        {statCards.map((card, idx) => (
          <StatCard key={card.title} {...card} idx={idx} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TrendsChart />
        <TopFailures />
      </div>

      {/* System Health */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <Radio className="size-4 text-primary" />
          System Health
        </h2>
        <HealthSection />
      </div>
    </div>
  );
};

export default DashboardPage;
