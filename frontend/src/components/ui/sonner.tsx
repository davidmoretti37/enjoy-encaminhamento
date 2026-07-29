import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      // Toasts used to render bottom-right, directly on top of the sticky
      // "N candidatos selecionados" action bars. Sonner pauses a toast's timer
      // while the pointer is over it, so moving the mouse toward the action
      // button froze the toast on top of that button and swallowed the click.
      // Top-right keeps confirmations visible without covering the controls.
      position="top-right"
      duration={4000}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
