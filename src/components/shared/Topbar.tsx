import React from 'react';
import { useLocation } from 'react-router-dom';
import { useSidebarStore } from '@/stores/sidebarStore';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { ThemeToggle } from './ThemeToggle';
import { PanelLeftOpen, PanelLeftClose, Search } from 'lucide-react';

// Map route paths to readable labels
const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  workflows: 'Workflows',
  plugins: 'Plugins',
  executions: 'Executions',
  'audit-logs': 'Audit Logs',
};

interface TopbarProps {
  actions?: React.ReactNode;
  onMobileMenuToggle?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ actions, onMobileMenuToggle }) => {
  const location = useLocation();
  const { isCollapsed, toggle } = useSidebarStore();

  const segments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = segments.map((seg, index) => ({
    label: routeLabels[seg] || seg.charAt(0).toUpperCase() + seg.slice(1),
    path: '/' + segments.slice(0, index + 1).join('/'),
    isLast: index === segments.length - 1,
  }));

  return (
    <TooltipProvider delayDuration={0}>
      <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 border-b border-border bg-background/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2">
          {/* Desktop collapse toggle (visible when sidebar is collapsed) */}
          {isCollapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggle}
                  className="hidden md:flex size-8 text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200"
                >
                  <PanelLeftOpen className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={4}>
                Expand sidebar
              </TooltipContent>
            </Tooltip>
          )}

          {/* Mobile hamburger */}
          {onMobileMenuToggle && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden size-8 text-muted-foreground hover:text-foreground"
              onClick={onMobileMenuToggle}
            >
              <PanelLeftOpen className="size-5" />
            </Button>
          )}

          {/* Separator when toggle is shown */}
          {isCollapsed && (
            <div className="hidden md:block h-5 w-px bg-border" />
          )}

          {/* Breadcrumb */}
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.path}>
                  {idx > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    {crumb.isLast ? (
                      <BreadcrumbPage className="font-medium text-foreground">{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={crumb.path}>{crumb.label}</BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="hidden md:flex items-center gap-2 text-muted-foreground hover:text-foreground h-8 px-3 text-xs border-border/60 hover:border-border transition-all duration-200"
            onClick={() => {
              document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
            }}
          >
            <Search className="size-3.5" />
            <span>Search...</span>
            <kbd className="pointer-events-none ml-1 inline-flex h-5 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </Button>

          <ThemeToggle />

          {actions}
        </div>
      </header>
    </TooltipProvider>
  );
};
