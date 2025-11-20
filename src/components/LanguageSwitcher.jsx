import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const languages = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
];

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    if (i18n && i18n.changeLanguage) {
      i18n.changeLanguage(lng);
    }
  };

  const currentLangCode = i18n && i18n.language ? i18n.language.split('-')[0] : 'fr';
  const currentLanguage = languages.find(lang => lang.code === currentLangCode) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          <span className="hidden sm:inline">{currentLanguage.name}</span>
          <span className="sm:hidden">{currentLanguage.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem 
            key={lang.code} 
            onClick={() => changeLanguage(lang.code)} 
            disabled={currentLanguage.code === lang.code}
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;