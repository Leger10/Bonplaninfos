import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Moon, Palette } from 'lucide-react';

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark-elegant' ? 'deep-night' : 'dark-elegant');
  };
  
  const icon = theme === 'dark-elegant' 
    ? <Moon className="h-5 w-5" /> 
    : <Palette className="h-5 w-5" />;

  const label = theme === 'dark-elegant'
    ? 'Passer au thème Deep Night'
    : 'Passer au thème Dark Elegant';

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={label}>
      {icon}
      <span className="sr-only">{label}</span>
    </Button>
  );
};

export default ThemeToggle;