/** Execution mode badge configuration */
export const getExecutionModeConfig = (mode: string) => {
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

  return configs[mode] || {
    label: mode,
    className: 'border-border bg-muted text-muted-foreground',
  };
};

/** Default plugin icon fallback based on category */
export const getCategoryIcon = (category: string): string => {
  const icons: Record<string, string> = {
    Database: '🗄️',
    Communication: '📬',
    Storage: '☁️',
    Integration: '🔗',
    Utility: '⚙️',
    Security: '🛡️',
    Analytics: '📊',
    AI: '🤖',
    DevOps: '🚀',
    Notification: '🔔',
  };
  return icons[category] || '🧩';
};
