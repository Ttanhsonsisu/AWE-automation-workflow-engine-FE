import React, { useState } from 'react';
import { Loader2, Package, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface CreatePackageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { uniqueName: string; displayName: string; description: string }) => void;
  isPending: boolean;
}

const CreatePackageModal: React.FC<CreatePackageModalProps> = ({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}) => {
  const [uniqueName, setUniqueName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (!uniqueName.trim() || !displayName.trim()) return;
    onSubmit({ uniqueName: uniqueName.trim(), displayName: displayName.trim(), description: description.trim() });
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setUniqueName('');
      setDisplayName('');
      setDescription('');
    }
    onOpenChange(val);
  };

  const isValid = uniqueName.trim().length > 0 && displayName.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 flex items-center justify-center border border-violet-500/20">
              <Package className="size-5 text-violet-500" />
            </div>
            <div>
              <DialogTitle className="text-lg">Create Plugin Package</DialogTitle>
              <DialogDescription>
                Register a new plugin package in the system.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider ml-1">
              Unique Name <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="e.g. my-custom-plugin"
              value={uniqueName}
              onChange={(e) => setUniqueName(e.target.value)}
              className="h-10 bg-background/60 border-border/50"
              autoFocus
            />
            <p className="text-[10px] text-muted-foreground/60 ml-1">
              System identifier. Must be unique across all packages.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider ml-1">
              Display Name <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="e.g. My Custom Plugin"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="h-10 bg-background/60 border-border/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider ml-1">
              Description
            </label>
            <Textarea
              placeholder="Brief description of what this plugin does..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px] bg-background/60 border-border/50 resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isPending}
            className="gap-2 min-w-[120px]"
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Create Package
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePackageModal;
