import React, { useState, useRef } from 'react';
import { Loader2, Upload, FileUp, X, FileArchive } from 'lucide-react';
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
import { cn } from '@/lib/utils';

interface UploadVersionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packageId: string;
  packageName: string;
  onSubmit: (data: {
    packageId: string;
    version: string;
    bucket: string;
    releaseNotes: string;
    file: File;
  }) => void;
  isPending: boolean;
}

const UploadVersionModal: React.FC<UploadVersionModalProps> = ({
  open,
  onOpenChange,
  packageId,
  packageName,
  onSubmit,
  isPending,
}) => {
  const [version, setVersion] = useState('');
  const [bucket, setBucket] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (!version.trim() || !bucket.trim() || !file) return;
    onSubmit({
      packageId,
      version: version.trim(),
      bucket: bucket.trim(),
      releaseNotes: releaseNotes.trim(),
      file,
    });
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setVersion('');
      setBucket('');
      setReleaseNotes('');
      setFile(null);
    }
    onOpenChange(val);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isValid = version.trim().length > 0 && bucket.trim().length > 0 && file !== null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center border border-emerald-500/20">
              <Upload className="size-5 text-emerald-500" />
            </div>
            <div>
              <DialogTitle className="text-lg">Upload Version</DialogTitle>
              <DialogDescription>
                Upload a new version for <span className="font-semibold text-foreground">{packageName}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider ml-1">
                Version <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. 1.0.0"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="h-10 bg-background/60 border-border/50"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider ml-1">
                Bucket <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. production"
                value={bucket}
                onChange={(e) => setBucket(e.target.value)}
                className="h-10 bg-background/60 border-border/50"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider ml-1">
              Release Notes
            </label>
            <Textarea
              placeholder="What's new in this version..."
              value={releaseNotes}
              onChange={(e) => setReleaseNotes(e.target.value)}
              className="min-h-[70px] bg-background/60 border-border/50 resize-none"
            />
          </div>

          {/* File Upload Area */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider ml-1">
              Plugin File <span className="text-destructive">*</span>
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200',
                isDragging
                  ? 'border-primary bg-primary/5 scale-[1.02]'
                  : file
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-border/50 hover:border-primary/40 hover:bg-muted/30'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                accept=".dll,.zip,.nupkg,.tar.gz"
              />

              {file ? (
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <FileArchive className="size-5 text-emerald-500" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{file.name}</p>
                    <p className="text-[11px] text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="size-12 rounded-full bg-muted/50 flex items-center justify-center">
                    <FileUp className="size-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Drop your plugin file here
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      or click to browse • .dll, .zip, .nupkg supported
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isPending}
            className="gap-2 min-w-[140px]"
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="size-4" />
                Upload Version
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UploadVersionModal;
