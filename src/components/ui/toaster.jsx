import React from 'react';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";
import { CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const ToastIcon = ({ variant }) => {
  switch (variant) {
    case 'success':
      return <CheckCircle className="text-green-500" />;
    case 'destructive':
      return <AlertTriangle className="text-white" />;
    case 'info':
      return <Info className="text-blue-500" />;
    default:
      return <AlertCircle className="text-foreground" />;
  }
};

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider swipeDirection="right">
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <Toast key={id} variant={variant} duration={5000} {...props}>
            <div className="flex items-start gap-3">
              <div className="pt-0.5">
                <ToastIcon variant={variant} />
              </div>
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
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