import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Bot, Sparkles } from 'lucide-react';
import { MainLayout } from '@/components/shared/MainLayout';
import { PrivateRoute } from '@/features/auth/PrivateRoute';

// ── Lazy loaded pages ─────────────────────────
const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const WorkflowListPage = lazy(() => import('@/features/workflow/WorkflowListPage'));
const WorkflowEditPage = lazy(() => import('@/features/workflow/WorkflowEditPage'));
const PluginsPage = lazy(() => import('@/features/plugin/PluginsPage'));
const ExecutionsPage = lazy(() => import('@/features/execution/ExecutionsPage'));
const AuditLogPage = lazy(() => import('@/features/audit-log/AuditLogPage'));
const TestPage = lazy(() => import('@/features/test/TestPage'));
const NotFoundPage = lazy(() => import('@/features/misc/NotFoundPage'));
const ErrorPage = lazy(() => import('@/features/misc/ErrorPage'));

// ── Loading fallback ──────────────────────────
const PageLoader = () => (
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
    <div className="relative flex flex-col items-center justify-center">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 aspect-square bg-primary/20 rounded-full blur-[50px] animate-pulse" />
      
      {/* Cute Bot Animation */}
      <div className="relative flex items-center justify-center w-32 h-32 mb-2">
        {/* Floating shadow platform */}
        <div className="absolute bottom-2 w-14 h-2 bg-foreground/10 rounded-[50%] blur-[2px] animate-[pulse_1s_ease-in-out_infinite]" />
        
        {/* Bouncing character */}
        <div className="relative animate-[bounce_1s_infinite]">
          <div className="bg-card p-4 rounded-3xl border border-border shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.3)] backdrop-blur-sm relative">
            {/* Sparkles floating around */}
            <Sparkles className="absolute -top-3 -right-2 size-5 text-amber-500 animate-[spin_3s_linear_infinite]" />
            <Sparkles className="absolute -bottom-2 -left-2 size-4 text-emerald-500 animate-[ping_2s_infinite]" />
            <Bot className="size-12 text-primary drop-shadow-md" strokeWidth={1.5} />
            
            {/* Cute blushing cheeks via small rounded divs */}
            <div className="absolute top-[2.4rem] left-5 size-2 bg-rose-400/80 rounded-full blur-[2px]" />
            <div className="absolute top-[2.4rem] right-5 size-2 bg-rose-400/80 rounded-full blur-[2px]" />
          </div>
        </div>
      </div>

      {/* Loading Text */}
      <div className="flex flex-col items-center gap-1.5 z-10">
        <h3 className="text-lg font-extrabold text-foreground tracking-tight flex items-end gap-1.5">
          Waking up the bots
          <span className="flex gap-1 mb-1.5">
            <span className="size-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="size-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="size-1.5 bg-primary rounded-full animate-bounce"></span>
          </span>
        </h3>
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          Just a second...
        </p>
      </div>
    </div>
  </div>
);

const SuspenseWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
);

export const router = createBrowserRouter([
  // ── Public routes ───────────────────────
  {
    path: '/login',
    element: (
      <SuspenseWrapper>
        <LoginPage />
      </SuspenseWrapper>
    ),
  },

  // ── Protected routes with MainLayout (sidebar) ───────────
  {
    element: (
      <PrivateRoute>
        <MainLayout />
      </PrivateRoute>
    ),
    errorElement: (
      <SuspenseWrapper>
        <ErrorPage />
      </SuspenseWrapper>
    ),
    children: [
      {
        path: '/',
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: '/dashboard',
        element: (
          <SuspenseWrapper>
            <DashboardPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: '/workflows',
        element: (
          <SuspenseWrapper>
            <WorkflowListPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: '/plugins',
        element: (
          <SuspenseWrapper>
            <PluginsPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: '/executions',
        element: (
          <SuspenseWrapper>
            <ExecutionsPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: '/audit-logs',
        element: (
          <SuspenseWrapper>
            <AuditLogPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: '/test',
        element: (
          <SuspenseWrapper>
            <TestPage />
          </SuspenseWrapper>
        ),
      },
    ],
  },

  // ── Focus Mode (NO sidebar) ───────────
  {
    path: '/workflows/:id/edit',
    element: (
      <PrivateRoute>
        <SuspenseWrapper>
          <WorkflowEditPage />
        </SuspenseWrapper>
      </PrivateRoute>
    ),
    errorElement: (
      <SuspenseWrapper>
        <ErrorPage />
      </SuspenseWrapper>
    ),
  },

  // ── Fallback 404 Route ───────────
  {
    path: '*',
    element: (
      <SuspenseWrapper>
        <NotFoundPage />
      </SuspenseWrapper>
    ),
  },
]);
