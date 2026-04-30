import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { CheckCircle, XCircle, Info, AlertTriangle } from "lucide-react";

function ToastIcon({ variant }: { variant?: string }) {
  if (variant === "destructive") {
    return (
      <div className="shrink-0 w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
        <XCircle className="w-4 h-4 text-red-500" />
      </div>
    );
  }
  return (
    <div className="shrink-0 w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
      <CheckCircle className="w-4 h-4 text-rose-500" />
    </div>
  );
}

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <Toast key={id} variant={variant} {...props}>
            <ToastIcon variant={variant} />
            <div className="flex-1 min-w-0">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
