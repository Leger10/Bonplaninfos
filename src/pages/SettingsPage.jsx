import React from 'react';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import ProfileSettings from '@/components/settings/ProfileSettings';
import SecuritySettings from '@/components/settings/SecuritySettings';
import NotificationSettings from '@/components/settings/NotificationSettings';
import PreferencesSettings from '@/components/settings/PreferencesSettings';

const SettingsPage = () => {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>{t('settings.title')} - BonPlanInfos</title>
        <meta name="description" content={t('settings.description')} />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
          <p className="text-muted-foreground">{t('settings.subtitle')}</p>
        </header>

        <div className="grid grid-cols-1 gap-8">
          <ProfileSettings />
          <PreferencesSettings />
          <NotificationSettings />
          <SecuritySettings />
        </div>
      </div>
    </>
  );
};

export default SettingsPage;