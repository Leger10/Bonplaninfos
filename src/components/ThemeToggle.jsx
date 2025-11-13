import React from 'react';
    import { useTheme } from '@/contexts/ThemeContext';
    import { Button } from '@/components/ui/button';
    import { Sun, Moon } from 'lucide-react';

    const ThemeToggle = () => {
      const { theme, setTheme } = useTheme();

      const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
      };

      return (
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          <span className="sr-only">Toggle theme</span>
        </Button>
      );
    };

    export default ThemeToggle;