import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/stores/sidebarStore';
import { useAuthStore } from '@/stores/authStore';
import { useKeycloakLogout } from '@/hooks/useKeycloakLogout';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  Workflow,
  Puzzle,
  Play,
  ScrollText,
  ChevronsLeft,
  Settings,
  User,
  LogOut,
  Hexagon,
  ChevronsUpDown,
  FlaskConical,
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/workflows', label: 'Workflows', icon: Workflow },
  { path: '/plugins', label: 'Plugins', icon: Puzzle },
  { path: '/executions', label: 'Executions', icon: Play },
  { path: '/audit-logs', label: 'Audit Logs', icon: ScrollText },
  { path: '/test', label: 'Test Playground', icon: FlaskConical },
];

export const AppSidebar: React.FC = () => {
  const { isCollapsed, toggle } = useSidebarStore();
  const { user } = useAuthStore();
  const logout = useKeycloakLogout();
  const location = useLocation();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'hidden md:flex flex-col h-full shrink-0 relative',
          'bg-sidebar border-r border-sidebar-border',
          'transition-[width] duration-300 ease-in-out',
          isCollapsed ? 'w-[68px]' : 'w-[248px]'
        )}
      >
        {/* Subtle inner shadow for depth */}
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />

        {/* ── TOP: Logo + Collapse Toggle ── */}
        <div className="flex items-center justify-between h-14 shrink-0 px-3">
          <div className={cn(
            'flex items-center gap-3 overflow-hidden transition-all duration-300',
            isCollapsed && 'justify-center w-full'
          )}>
            {/* Logo */}
            <div className="relative size-7 rounded-lg bg-primary/20 shadow-inner flex items-center justify-center shrink-0 border border-primary/30 group-hover:scale-105 transition-transform">
              <div className="absolute inset-0 rounded-lg bg-primary/10 blur-[2px] opacity-70" />
              <Hexagon className="size-4 text-primary fill-primary/20 relative z-10" />
            </div>

            {/* Title (hidden when collapsed) */}
            {!isCollapsed && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <span className="font-bold text-[14px] leading-none tracking-tight text-sidebar-foreground">
                  AutoFlow
                </span>
                <span className="text-[10px] text-muted-foreground font-medium tracking-widest uppercase leading-none mt-1">
                  Workflow Engine
                </span>
              </div>
            )}
          </div>

          {/* Collapse toggle (only visible when expanded) */}
          {!isCollapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggle}
                  className="size-7 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all duration-200"
                >
                  <ChevronsLeft className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Collapse sidebar
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Subtle divider with gradient */}
        <div className="mx-3 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* ── MIDDLE: Navigation ── */}
        <nav className="flex-1 flex flex-col gap-0.5 px-3 py-3 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;

            const linkContent = (
              <NavLink
                to={item.path}
                className={cn(
                  'flex items-center rounded-lg text-[13px] font-medium border border-transparent',
                  'transition-all duration-300 group relative',
                  isCollapsed ? 'justify-center size-10 mx-auto' : 'gap-3 px-3 py-2.5',
                  isActive
                    ? 'bg-primary/10 border-primary/20 text-primary shadow-sm'
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                )}
              >
                {/* Active indicator bar with glow */}
                {isActive && !isCollapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full shadow-[0_0_8px_rgba(217,119,6,0.6)]" />
                )}
                <Icon
                  className={cn(
                    'shrink-0 transition-transform duration-300',
                    isCollapsed ? 'size-[20px]' : 'size-4',
                    isActive
                      ? 'text-primary drop-shadow-[0_0_4px_rgba(217,119,6,0.5)]'
                      : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground/90 group-hover:scale-105'
                  )}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent
                    side="right"
                    sideOffset={14}
                    className="font-medium text-xs"
                  >
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <React.Fragment key={item.path}>{linkContent}</React.Fragment>;
          })}
        </nav>

        {/* ── BOTTOM: User Profile ── */}
        <div className="mt-auto px-3 pb-3 pt-2">
          {/* Gradient divider */}
          <div className="mb-3 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  'w-full h-auto rounded-lg transition-all duration-200',
                  'hover:bg-sidebar-accent',
                  isCollapsed ? 'justify-center p-1.5' : 'justify-start gap-3 px-2.5 py-2'
                )}
              >
                <Avatar className="size-8 shrink-0 ring-2 ring-primary/20 transition-all duration-200 group-hover:ring-primary/40">
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xs font-bold">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <div className="flex items-center flex-1 min-w-0 animate-label-in">
                    <div className="flex flex-col items-start flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground truncate w-full text-left">
                        {user?.name || 'User'}
                      </span>
                      <span className="text-[11px] text-muted-foreground truncate w-full text-left">
                        {user?.email || 'user@example.com'}
                      </span>
                    </div>
                    <ChevronsUpDown className="size-4 text-muted-foreground shrink-0 ml-1" />
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side={isCollapsed ? 'right' : 'top'}
              align={isCollapsed ? 'end' : 'start'}
              className="w-56"
              sideOffset={8}
            >
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">{user?.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{user?.email || 'user@example.com'}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 size-4" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="mr-2 size-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                <LogOut className="mr-2 size-4" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </TooltipProvider>
  );
};
