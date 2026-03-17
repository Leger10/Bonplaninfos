import React from "react";
import { Download } from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { Button } from "@/components/ui/button";

const InstallPWAButton = ({
  className = "",
  size = "sm",
  fullWidth = false
}) => {
  const { isInstallable, isInstalled, promptInstall } = useInstallPrompt();

  if (isInstalled || !isInstallable) return null;

  return (
    <Button
      onClick={promptInstall}
      size={size}
      className={`
        bg-blue-600 hover:bg-blue-700 
        text-white border-none
        shadow-md hover:shadow-xl
        transition-all duration-300
        flex items-center justify-center
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
      title="Installer l'application sur votre appareil"
    >
      <Download className="w-4 h-4 mr-2" />
      <span className="text-sm font-semibold">Installer l'App</span>
    </Button>
  );
};

export default InstallPWAButton;