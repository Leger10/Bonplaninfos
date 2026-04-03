import React from 'react';
import { Download } from 'lucide-react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { Button } from '@/components/ui/button';

const InstallPWAButton = ({ className = '', variant = 'outline', size = 'sm', fullWidth = false }) => {
  const { isInstallable, isInstalled, promptInstall } = useInstallPrompt();

  if (!isInstallable || isInstalled) return null;

  return (
    <Button
      onClick={promptInstall}
      variant={variant}
      size={size}
      className={`shadow-md hover:shadow-lg transition-all border-primary text-primary hover:bg-primary/10 ${fullWidth ? 'w-full' : ''} ${className}`}
      title="Installer l'application sur votre appareil"
    >
      <Download className="w-4 h-4 mr-2" />
      <span>Installer l'App</span>
    </Button>
  );
};

export default InstallPWAButton;