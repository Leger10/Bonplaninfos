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
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

const ToastIcon = ({ variant }) => {
  switch (variant) {
    case 'success':
      return <CheckCircle className="text-green-500" />;
    case 'destructive':
      return <AlertCircle className="text-red-500" />;
    case 'info':
      return <Info className="text-blue-500" />;
    default:
      return null;
  }
};

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <Toast key={id} variant={variant} {...props}>
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