import React from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet';
import { ShieldCheck, User, Database, Settings, Cookie, Share2, Lock, FileText, Mail } from 'lucide-react';
import '@/styles/LegalMentions.css'; 

const PrivacyPolicyPage = () => {
  const { t } = useTranslation();

  const sections = [
    { key: 'introduction', icon: <ShieldCheck /> },
    { key: 'data_collected', icon: <User /> },
    { key: 'data_usage', icon: <Settings /> },
    { key: 'cookies', icon: <Cookie /> },
    { key: 'data_sharing', icon: <Share2 /> },
    { key: 'security', icon: <Lock /> },
    { key: 'your_rights', icon: <FileText /> },
    { key: 'contact', icon: <Mail /> }
  ];

  return (
    <div className="legal-mentions-page">
      <Helmet>
        <title>{t('privacy.meta_title')} - BonPlanInfos</title>
        <meta name="description" content={t('privacy.meta_description')} />
      </Helmet>
      <main>
        <section className="legal-hero">
            <div className="container">
                <h1><ShieldCheck className="inline-block w-12 h-12 mb-4" /> {t('privacy.title')}</h1>
                <p>{t('privacy.meta_description')}</p>
                <div className="last-update">{t('privacy.last_updated')}</div>
            </div>
        </section>

        <section className="legal-content">
          <div className="container">
            {sections.map(({ key, icon }) => {
              const sectionData = t(`privacy.${key}`, { returnObjects: true });
              return (
                <div className="legal-section" key={key}>
                  <h2>{icon} {sectionData.title}</h2>
                  <p>{sectionData.p1}</p>
                  {key === 'data_collected' || key === 'data_usage' || key === 'your_rights' ? (
                    <ul>
                      {Object.keys(sectionData)
                        .filter(itemKey => itemKey.startsWith('item'))
                        .map(itemKey => (
                          <li key={itemKey} dangerouslySetInnerHTML={{ __html: sectionData[itemKey] }}></li>
                        ))}
                    </ul>
                  ) : null}
                  {key === 'your_rights' && sectionData.p2 && <p>{sectionData.p2}</p>}
                  {key === 'contact' && (
                    <p>
                      <a href={`mailto:${sectionData.email}`} className="text-primary hover:underline">{sectionData.email}</a>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};

export default PrivacyPolicyPage;