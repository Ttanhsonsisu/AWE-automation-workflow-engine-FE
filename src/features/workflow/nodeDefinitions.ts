import {
  Zap,
  Clock,
  Webhook,
  Mail,
  Send,
  FileText,
  GitBranch,
  Repeat,
  Filter,
  Timer,
  Globe,
  Database,
  type LucideIcon,
  SquareFunction,
  MessageSquare,
  BellRing,
  Terminal,
  Type,
  GitMerge,
  UserCheck,
  Settings,
  Puzzle,
  Box,
  Cpu,
  Workflow,
  Code,
  Cog,
  Layers,
  RefreshCw,
} from 'lucide-react';
import type { PluginDefinition, PluginCategory } from '@/types/plugin';

// ── Icon mapping: backend icon string → Lucide component ──
const iconMap: Record<string, LucideIcon> = {
  // lucide- prefixed icons from the API
  'lucide-timer': Timer,
  'lucide-terminal': Terminal,
  'lucide-type': Type,
  'lucide-git-merge': GitMerge,
  'lucide-webhook': Webhook,
  'lucide-mail': Mail,
  'lucide-globe': Globe,
  'lucide-database': Database,
  'lucide-send': Send,
  'lucide-file-text': FileText,
  'lucide-git-branch': GitBranch,
  'lucide-repeat': Repeat,
  'lucide-filter': Filter,
  'lucide-zap': Zap,
  'lucide-clock': Clock,
  'lucide-square-function': SquareFunction,
  'lucide-message-square': MessageSquare,
  'lucide-bell-ring': BellRing,
  'lucide-code': Code,
  'lucide-cog': Cog,
  'lucide-cpu': Cpu,
  'lucide-layers': Layers,
  'lucide-settings': Settings,
  'lucide-workflow': Workflow,
  'lucide-refresh-cw': RefreshCw,
  'lucide-puzzle': Puzzle,
  'lucide-box': Box,
  // PascalCase icon names (direct component references)
  UserCheck: UserCheck,
  Timer: Timer,
  Terminal: Terminal,
  Type: Type,
  GitMerge: GitMerge,
  Webhook: Webhook,
  Globe: Globe,
  Mail: Mail,
  Send: Send,
  Zap: Zap,
  Clock: Clock,
  BellRing: BellRing,
};

// ── Color mapping per API category ──
export const categoryColorMap: Record<string, { color: string; bgColor: string }> = {
  Core: { color: 'bg-emerald-500', bgColor: 'bg-emerald-500/10' },
  'Data Manipulation': { color: 'bg-violet-500', bgColor: 'bg-violet-500/10' },
  'Human Interaction': { color: 'bg-amber-500', bgColor: 'bg-amber-500/10' },
  Logic: { color: 'bg-blue-500', bgColor: 'bg-blue-500/10' },
  Trigger: { color: 'bg-orange-500', bgColor: 'bg-orange-500/10' },
  Action: { color: 'bg-cyan-500', bgColor: 'bg-cyan-500/10' },
  API: { color: 'bg-indigo-500', bgColor: 'bg-indigo-500/10' },
  Database: { color: 'bg-pink-500', bgColor: 'bg-pink-500/10' },
  Output: { color: 'bg-teal-500', bgColor: 'bg-teal-500/10' },
  Integration: { color: 'bg-rose-500', bgColor: 'bg-rose-500/10' },
};

const defaultColors = { color: 'bg-slate-500', bgColor: 'bg-slate-500/10' };

// ── Resolve icon from string ──
export function resolveIcon(iconName: string): LucideIcon {
  return iconMap[iconName] || iconMap[`lucide-${iconName.toLowerCase()}`] || Puzzle;
}

// ── Node Definition interface (extended for API plugins) ──
export interface NodeDefinition {
  /** Plugin name (used as node type) */
  type: string;
  /** Display name shown in the UI */
  label: string;
  /** Description text */
  description: string;
  /** API category string */
  category: string;
  /** Resolved Lucide icon component */
  icon: LucideIcon;
  /** Tailwind color class for category header */
  color: string;
  /** Light background */
  bgColor: string;
  /** Execution mode from the API */
  executionMode?: string;
  /** JSON Schema for plugin inputs */
  inputSchema?: Record<string, unknown>;
  /** JSON Schema for plugin outputs */
  outputSchema?: Record<string, unknown>;
  /** Package ID (null for built-in) */
  packageId?: string | null;
  /** Plugin version */
  activeVersion?: string;
  triggerSource?: string;
  isSingleton?: boolean;
}

/**
 * Convert a PluginDefinition from the API into a NodeDefinition
 * that the UI can render in the Node Library.
 */
export function pluginToNodeDefinition(plugin: PluginDefinition): NodeDefinition {
  const colors = categoryColorMap[plugin.category] || defaultColors;

  return {
    type: plugin.name,
    label: plugin.displayName,
    description: plugin.description,
    category: plugin.category,
    icon: resolveIcon(plugin.icon),
    color: colors.color,
    bgColor: colors.bgColor,
    executionMode: plugin.executionMode,
    inputSchema: plugin.inputSchema as unknown as Record<string, unknown>,
    outputSchema: plugin.outputSchema as unknown as Record<string, unknown>,
    packageId: plugin.packageId,
    activeVersion: plugin.activeVersion,
    triggerSource: plugin.triggerSource ?? (plugin as any).TriggerSource,
    isSingleton: plugin.isSingleton ?? (plugin as any).IsSingleton,
  };
}

/**
 * Convert the full catalog response into grouped categories
 * with NodeDefinition arrays.
 */
export function catalogToNodeCategories(
  categories: PluginCategory[]
): { category: string; label: string; nodes: NodeDefinition[] }[] {
  return categories.map((cat) => ({
    category: cat.category,
    label: cat.category,
    nodes: cat.plugins.map(pluginToNodeDefinition),
  }));
}

/**
 * Search across all categories.
 */
export function searchNodeDefinitions(
  allNodes: NodeDefinition[],
  query: string
): NodeDefinition[] {
  const q = query.toLowerCase().trim();
  if (!q) return allNodes;

  return allNodes.filter(
    (n) =>
      n.label.toLowerCase().includes(q) ||
      n.description.toLowerCase().includes(q) ||
      n.type.toLowerCase().includes(q)
  );
}

/**
 * Get a flat list of all node definitions from categories.
 */
export function flattenNodeDefinitions(
  categories: { nodes: NodeDefinition[] }[]
): NodeDefinition[] {
  return categories.flatMap((cat) => cat.nodes);
}

/**
 * Find a node definition by its type (plugin name).
 */
export function getNodeDefinition(
  type: string,
  categories: { nodes: NodeDefinition[] }[]
): NodeDefinition | undefined {
  for (const cat of categories) {
    const node = cat.nodes.find((n) => n.type === type);
    if (node) return node;
  }
  return undefined;
}
