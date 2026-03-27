import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LayoutDashboard, TrendingUp, Activity, CheckCircle2 } from 'lucide-react';

const statCards = [
  { title: 'Total Workflows', value: '24', change: '+3 this week', icon: LayoutDashboard, color: 'text-indigo-500', bgColor: 'bg-indigo-500/10' },
  { title: 'Executions Today', value: '156', change: '+12% vs yesterday', icon: Activity, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  { title: 'Success Rate', value: '98.2%', change: '+0.5% improvement', icon: CheckCircle2, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  { title: 'Active Plugins', value: '8', change: '2 pending updates', icon: TrendingUp, color: 'text-violet-500', bgColor: 'bg-violet-500/10' },
];

const DashboardPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your automation platform.
        </p>
      </div>

      {/* Stat cards — responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.title}
              className="group bg-card border-border shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300 cursor-default"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={cn('size-9 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110', card.bgColor)}>
                  <Icon className={cn('size-[18px]', card.color)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{card.change}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Chart placeholders with Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Execution Trends</CardTitle>
            <CardDescription>Daily workflow executions over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end gap-1 h-32">
              {Array.from({ length: 20 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="flex-1 rounded-sm"
                  style={{ height: `${Math.random() * 80 + 20}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Success / Failed Ratio</CardTitle>
            <CardDescription>Distribution of execution outcomes</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 py-6">
            <Skeleton className="size-36 rounded-full" />
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full bg-emerald-500" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full bg-red-500" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
