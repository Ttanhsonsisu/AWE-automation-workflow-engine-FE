import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background/80 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-foreground group-[.toaster]:border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-xl border p-4 gap-3",
          description: "group-[.toast]:text-muted-foreground text-[13px] leading-relaxed",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground font-medium rounded-lg px-3 py-2 text-xs transition-colors",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground font-medium rounded-lg px-3 py-2 text-xs transition-colors hover:bg-muted/80",
          title: "font-semibold text-[14px]",
          success: "group-[.toaster]:border-emerald-500/30 group-[.toaster]:bg-emerald-500/5",
          error: "group-[.toaster]:border-destructive/30 group-[.toaster]:bg-destructive/5",
          warning: "group-[.toaster]:border-amber-500/30 group-[.toaster]:bg-amber-500/5",
          info: "group-[.toaster]:border-blue-500/30 group-[.toaster]:bg-blue-500/5",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
