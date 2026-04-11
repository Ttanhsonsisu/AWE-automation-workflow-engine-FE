import * as LucideIcons from 'lucide-react';
import { ExecutionModeMap } from '@/types/plugin';
import type { PluginExecutionMode } from '@/types/plugin';

/**
 * Resolve executionMode from number or string to the PluginExecutionMode string.
 * Backend returns 0/1/2 (number).
 */
export const resolveExecutionMode = (mode: number | string): PluginExecutionMode => {
  if (typeof mode === 'number') {
    return ExecutionModeMap[mode] || 'BuiltIn';
  }
  return (mode as PluginExecutionMode) || 'BuiltIn';
};

/** Execution mode badge configuration */
export const getExecutionModeConfig = (mode: number | string) => {
  const resolved = resolveExecutionMode(mode);

  const configs: Record<string, { label: string; className: string }> = {
    BuiltIn: {
      label: 'Built-in',
      className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600',
    },
    DynamicDll: {
      label: 'DLL',
      className: 'border-blue-500/20 bg-blue-500/10 text-blue-600',
    },
    RemoteGrpc: {
      label: 'gRPC',
      className: 'border-purple-500/20 bg-purple-500/10 text-purple-600',
    },
  };

  return (
    configs[resolved] || {
      label: String(mode),
      className: 'border-border bg-muted text-muted-foreground',
    }
  );
};

/**
 * Maps icon strings (e.g. "lucide-box" or "UserCheck") to Lucide component names.
 * This should match the backend's naming convention.
 */
const iconNamesMap: Record<string, string> = {
  'lucide-timer': 'Timer',
  'lucide-terminal': 'Terminal',
  'lucide-type': 'Type',
  'lucide-git-merge': 'GitMerge',
  'lucide-webhook': 'Webhook',
  'lucide-mail': 'Mail',
  'lucide-globe': 'Globe',
  'lucide-database': 'Database',
  'lucide-send': 'Send',
  'lucide-file-text': 'FileText',
  'lucide-git-branch': 'GitBranch',
  'lucide-repeat': 'Repeat',
  'lucide-filter': 'Filter',
  'lucide-zap': 'Zap',
  'lucide-clock': 'Clock',
  'lucide-square-function': 'SquareFunction',
  'lucide-message-square': 'MessageSquare',
  'lucide-bell-ring': 'BellRing',
  'lucide-code': 'Code',
  'lucide-cog': 'Cog',
  'lucide-cpu': 'Cpu',
  'lucide-layers': 'Layers',
  'lucide-settings': 'Settings',
  'lucide-workflow': 'Workflow',
  'lucide-refresh-cw': 'RefreshCw',
  'lucide-puzzle': 'Puzzle',
  'lucide-box': 'Box',
  'lucide-terminal-square': 'TerminalSquare',
  'lucide-rotate-cw': 'RotateCw',
  'lucide-mouse-pointer-click': 'MousePointerClick',
};

/**
 * Resolves a Lucide icon component from a string.
 */
export const getPluginIconComponent = (iconName: string): LucideIcons.LucideIcon => {
  // 1. Try direct lookup in the map
  const mappedName = iconNamesMap[iconName] || iconNamesMap[`lucide-${iconName.toLowerCase()}`];
  if (mappedName && (LucideIcons as any)[mappedName]) {
    return (LucideIcons as any)[mappedName];
  }

  // 2. Try direct lookup in LucideIcons (PascalCase)
  if ((LucideIcons as any)[iconName]) {
    return (LucideIcons as any)[iconName];
  }

  // 3. Fallback to Puzzle
  return LucideIcons.Puzzle;
};

/** Category color mapping for badges/backgrounds */
export const getCategoryConfig = (category: string) => {
  const configs: Record<string, { className: string; icon: string }> = {
    Core: { className: 'bg-emerald-500/10 text-emerald-600', icon: '⚙️' },
    Custom: { className: 'bg-blue-500/10 text-blue-600', icon: '🧩' },
    'Data Manipulation': { className: 'bg-violet-500/10 text-violet-600', icon: '🔄' },
    'Human Interaction': { className: 'bg-amber-500/10 text-amber-600', icon: '👤' },
    Logic: { className: 'bg-indigo-500/10 text-indigo-600', icon: '🔀' },
    Testing: { className: 'bg-rose-500/10 text-rose-600', icon: '🧪' },
    Trigger: { className: 'bg-orange-500/10 text-orange-600', icon: '🚀' },
  };

  return configs[category] || { className: 'bg-muted text-muted-foreground', icon: '📦' };
};
