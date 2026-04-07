import React from 'react';
import type {
  WidgetProps,
  RegistryWidgetsType,
} from '@rjsf/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Hash,
  Type as TypeIcon,
  ToggleLeft,
  List,
  Braces,
  Mail,
  SquareFunction,
  Plus,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Icon resolver for schema property types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function getTypeIcon(schema: Record<string, unknown>): LucideIcon {
  if (schema.enum) return List;
  if (schema.format === 'email') return Mail;
  if (schema.type === 'integer' || schema.type === 'number') return Hash;
  if (schema.type === 'boolean') return ToggleLeft;
  if (schema.type === 'array') return List;
  if (schema.type === 'object') return Braces;
  return TypeIcon;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Text Widget — shadcn Input with [Fx] placeholder
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const TextWidget: React.FC<WidgetProps> = ({
  id,
  value,
  required,
  disabled,
  readonly,
  onChange,
  onBlur,
  onFocus,
  schema,
  placeholder,
}) => {
  const [isExpressionMode, setIsExpressionMode] = React.useState(() => {
    return typeof value === 'string' && value.includes('{{');
  });

  const title = (schema.title as string) || '';
  const isLong =
    title.toLowerCase().includes('message') ||
    title.toLowerCase().includes('body') ||
    title.toLowerCase().includes('content');

  if (isLong) {
    return (
      <div className="relative group/input">
        <Textarea
          id={id}
          value={value ?? ''}
          required={required}
          disabled={disabled || readonly}
          placeholder={placeholder || `Nhập ${title}...`}
          onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value)}
          onBlur={(e) => onBlur(id, e.target.value)}
          onFocus={(e) => onFocus(id, e.target.value)}
          className="bg-card/80 border-border/60 hover:border-border transition-colors min-h-[80px] resize-none text-sm pr-10"
        />
        <button
          type="button"
          title="Chế độ biểu thức (Expression)"
          onClick={() => setIsExpressionMode(!isExpressionMode)}
          className={cn(
            "absolute top-2 right-2 p-1 rounded-md transition-all",
            isExpressionMode 
              ? "opacity-100 bg-blue-500/10 text-blue-500" 
              : "opacity-0 group-hover/input:opacity-60 hover:!opacity-100 hover:bg-accent"
          )}
        >
          <SquareFunction className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative group/input">
      <Input
        id={id}
        type={isExpressionMode ? "text" : ((schema.format as string) === 'email' ? 'email' : 'text')}
        value={value ?? ''}
        required={required}
        disabled={disabled || readonly}
        placeholder={placeholder || `Nhập ${title}...`}
        onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value)}
        onBlur={(e) => onBlur(id, e.target.value)}
        onFocus={(e) => onFocus(id, e.target.value)}
        className={cn(
          "bg-card/80 border-border/60 hover:border-border transition-colors h-10 pr-10",
          isExpressionMode && "font-mono text-blue-500"
        )}
      />
      <button
        type="button"
        title="Chế độ biểu thức (Expression)"
        onClick={() => setIsExpressionMode(!isExpressionMode)}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 right-2 p-1 rounded-md transition-all",
          isExpressionMode 
            ? "opacity-100 bg-blue-500/10 text-blue-500" 
            : "opacity-0 group-hover/input:opacity-60 hover:!opacity-100 hover:bg-accent text-muted-foreground"
        )}
      >
        <SquareFunction className="size-3.5" />
      </button>
    </div>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Number Widget — shadcn Input type=number
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const NumberWidget: React.FC<WidgetProps> = ({
  id,
  value,
  required,
  disabled,
  readonly,
  onChange,
  onBlur,
  onFocus,
  schema,
  placeholder,
}) => {
  const [isExpressionMode, setIsExpressionMode] = React.useState(() => {
    return typeof value === 'string' && value.includes('{{');
  });

  const title = (schema.title as string) || '';
  return (
    <div className="relative group/input">
      <Input
        id={id}
        type={isExpressionMode ? "text" : "number"}
        value={value ?? ''}
        required={required}
        disabled={disabled || readonly}
        placeholder={placeholder || `Nhập ${title}...`}
        min={isExpressionMode ? undefined : (schema.minimum as number | undefined)}
        max={isExpressionMode ? undefined : (schema.maximum as number | undefined)}
        onChange={(e) => {
          const v = e.target.value;
          if (v === '') {
            onChange(undefined);
          } else if (isExpressionMode) {
            onChange(v); // string pass-through for expression
          } else {
            const parsed = schema.type === 'integer' ? parseInt(v, 10) : parseFloat(v);
            onChange(Number.isNaN(parsed) ? undefined : parsed);
          }
        }}
        onBlur={(e) => onBlur(id, e.target.value)}
        onFocus={(e) => onFocus(id, e.target.value)}
        className={cn(
          "bg-card/80 border-border/60 hover:border-border transition-colors h-10 font-mono pr-10",
          isExpressionMode && "text-blue-500"
        )}
      />
      <button
        type="button"
        title="Chế độ biểu thức (Expression)"
        onClick={() => setIsExpressionMode(!isExpressionMode)}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 right-2 p-1 rounded-md transition-all",
          isExpressionMode 
            ? "opacity-100 bg-blue-500/10 text-blue-500" 
            : "opacity-0 group-hover/input:opacity-60 hover:!opacity-100 hover:bg-accent text-muted-foreground"
        )}
      >
        <SquareFunction className="size-3.5" />
      </button>
      {(schema.minimum !== undefined || schema.maximum !== undefined) && (
        <p className="text-[10px] text-muted-foreground/50 font-mono mt-1">
          {schema.minimum !== undefined && `Min: ${schema.minimum}`}
          {schema.minimum !== undefined && schema.maximum !== undefined && ' · '}
          {schema.maximum !== undefined && `Max: ${schema.maximum}`}
        </p>
      )}
    </div>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Select Widget — shadcn Select
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const SelectWidget: React.FC<WidgetProps> = ({
  id,
  value,
  required,
  disabled,
  readonly,
  onChange,
  options,
  schema,
  placeholder,
}) => {
  const enumOptions = (options.enumOptions || []) as { label: string; value: string }[];
  const title = (schema.title as string) || '';

  return (
    <Select
      value={value ?? ''}
      onValueChange={(v) => onChange(v)}
      disabled={disabled || readonly}
      required={required}
    >
      <SelectTrigger id={id} className="bg-card/80 border-border/60 hover:border-border transition-colors h-10">
        <SelectValue placeholder={placeholder || `Chọn ${title}...`} />
      </SelectTrigger>
      <SelectContent>
        {enumOptions.map((opt) => (
          <SelectItem key={String(opt.value)} value={String(opt.value)}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Checkbox Widget → shadcn Switch
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const CheckboxWidget: React.FC<WidgetProps> = ({
  id,
  value,
  disabled,
  readonly,
  onChange,
  label,
  schema,
}) => {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/50 bg-card/50 p-4">
      <div className="flex items-center gap-3">
        <ToggleLeft className="size-4 text-muted-foreground" />
        <div>
          <Label htmlFor={id} className="text-sm font-medium">
            {label || (schema.title as string)}
          </Label>
          {schema.description && (
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">{schema.description as string}</p>
          )}
        </div>
      </div>
      <Switch
        id={id}
        checked={value ?? false}
        onCheckedChange={(checked) => onChange(checked)}
        disabled={disabled || readonly}
      />
    </div>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Field Template — wrapper with label, icon, description
// Uses `any` for RJSF template props to avoid React 19 type conflicts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomFieldTemplate: React.FC<any> = ({
  id,
  children,
  displayLabel,
  label,
  required,
  schema,
  errors,
  rawDescription,
}) => {
  // Skip wrapper for root object or boolean (handled by CheckboxWidget)
  if (id === 'root' || schema.type === 'boolean') {
    return <>{children}</>;
  }

  const PropIcon = getTypeIcon(schema);
  const hasErrors = !!errors;

  return (
    <div className={cn('space-y-2', hasErrors && 'space-y-1.5')}>
      {displayLabel && label && (
        <div className="flex items-center gap-2">
          <PropIcon className="size-3.5 text-muted-foreground" />
          <Label htmlFor={id} className="text-sm font-medium">
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
          {schema.type && typeof schema.type === 'string' && (
            <Badge
              variant="outline"
              className="text-[9px] px-1.5 py-0 h-4 font-mono border-muted-foreground/20 text-muted-foreground"
            >
              {schema.type}
              {schema.format ? `:${schema.format}` : ''}
            </Badge>
          )}
        </div>
      )}
      {children}
      {rawDescription && !hasErrors && (
        <p className="text-[11px] text-muted-foreground/70 leading-relaxed">{rawDescription}</p>
      )}
      {hasErrors && (
        <div className="text-[11px] text-destructive font-medium">{errors}</div>
      )}
    </div>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Object Field Template — clean vertical layout
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomObjectFieldTemplate: React.FC<any> = ({
  properties,
  title,
  description,
  idSchema,
}) => {
  const isRoot = idSchema?.$id === 'root';
  return (
    <div className={cn('space-y-4', !isRoot && 'border-l-2 border-border/40 pl-4')}>
      {!isRoot && title && (
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <Braces className="size-3.5" />
          {title}
        </div>
      )}
      {!isRoot && description && (
        <p className="text-[11px] text-muted-foreground/70">{description}</p>
      )}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {properties.map((prop: any) => (
        <div key={prop.name}>{prop.content}</div>
      ))}
    </div>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Array Field Template — list with add/remove buttons
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomArrayFieldTemplate: React.FC<any> = ({
  items,
  canAdd,
  onAddClick,
  title,
  schema,
}) => {
  // Special case: array of enums → render as tag-like checkboxes
  if (schema.items && (schema.items as { enum?: string[] }).enum) {
    return (
      <div className="space-y-2">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {items.map((item: any) => (
          <div key={item.key} className="flex items-center gap-2">
            {item.children}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              onClick={item.onDropIndexClick(item.index)}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ))}
        {canAdd && (
          <Button type="button" variant="outline" size="sm" onClick={onAddClick} className="gap-1.5 text-xs h-8">
            <Plus className="size-3.5" />
            Thêm {title || 'mục'}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {items.map((item: any) => (
        <div key={item.key} className="flex items-start gap-2 p-3 rounded-lg border border-border/40 bg-card/30">
          <div className="flex-1">{item.children}</div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 mt-1"
            onClick={item.onDropIndexClick(item.index)}
          >
            <X className="size-3.5 text-muted-foreground" />
          </Button>
        </div>
      ))}
      {canAdd && (
        <Button type="button" variant="outline" size="sm" onClick={onAddClick} className="gap-1.5 text-xs h-8">
          <Plus className="size-3.5" />
          Thêm {title || 'mục'}
        </Button>
      )}
    </div>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Exports
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const customWidgets: RegistryWidgetsType = {
  TextWidget,
  text: TextWidget,
  EmailWidget: TextWidget,
  URLWidget: TextWidget,
  UpDownWidget: NumberWidget,
  RangeWidget: NumberWidget,
  SelectWidget,
  CheckboxWidget,
};

export const customTemplates = {
  FieldTemplate: CustomFieldTemplate,
  ObjectFieldTemplate: CustomObjectFieldTemplate,
  ArrayFieldTemplate: CustomArrayFieldTemplate,
};
