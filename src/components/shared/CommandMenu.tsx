import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  Workflow,
  Puzzle,
  Play,
  ScrollText,
  Plus,
  Settings,
  Search,
} from 'lucide-react';

const navigationItems = [
  { label: 'Go to Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Go to Workflows', icon: Workflow, path: '/workflows' },
  { label: 'Go to Plugins', icon: Puzzle, path: '/plugins' },
  { label: 'Go to Executions', icon: Play, path: '/executions' },
  { label: 'Go to Audit Logs', icon: ScrollText, path: '/audit-logs' },
];

const actionItems = [
  { label: 'Create New Workflow', icon: Plus, path: '/workflows', action: 'create' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.path}
                value={item.label}
                onSelect={() => handleSelect(item.path)}
              >
                <Icon className="mr-2 size-4 text-muted-foreground" />
                <span>{item.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          {actionItems.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.label}
                value={item.label}
                onSelect={() => handleSelect(item.path)}
              >
                <Icon className="mr-2 size-4 text-muted-foreground" />
                <span>{item.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
