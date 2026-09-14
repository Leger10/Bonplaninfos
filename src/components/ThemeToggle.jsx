import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  const isDeepNight = theme === 'deep-night';

  const toggleTheme = () => {
    setTheme(isDeepNight ? 'dark-elegant' : 'deep-night');
  };

  const label = isDeepNight
    ? 'Passer au thème Dark Elegant'
    : 'Passer au thème Deep Night';

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={label} title={label}>
      <span className="flex items-center gap-1.5">
        <span
          className="w-3 h-3 rounded-full border border-border"
          style={{ background: isDeepNight ? 'hsl(262 90% 66%)' : 'hsl(217.2 91.2% 59.8%)' }}
        />
        <span className="h-2.5 w-2.5 -ml-2 rounded-full" style={{ background: isDeepNight ? 'hsl(210 40% 98%)' : 'hsl(222.2 84% 4.9%)' }} />
      </span>
    </Button>
  );
};

export default ThemeToggle;