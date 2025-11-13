import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Building, User2 as UserTie, Server, Database, Cookie, Copyright, AlertTriangle, Link2, Gavel } from 'lucide-react';
import '@/styles/LegalMentions.css';

const LegalMentionsPage = () => {
  const { t } = useTranslation();

  const sectionsData = t('legal_mentions.sections', { returnObjects: true });

  const sectionDetails = [
    { key: 'editor', icon: <Building /> },
    { key: 'director', icon: <UserTie /> },
    { key: 'hosting', icon: <Server /> },
    { key: 'data', icon: <Database /> },
    { key: 'cookies', icon: <Cookie /> },
    { key: 'ip', icon: <Copyright /> },
    { key: 'liability', icon: <AlertTriangle /> },
    { key: 'links', icon: <Link2 /> },
    { key: 'applicableLaw', icon: <Gavel /> },
  ];

  const renderSectionContent = (sectionKey, section) => {
    if (!section) return null;

    switch (sectionKey) {
      case 'editor':
        return (
          <>
            <p>{section.content}</p>
            <div className="legal-details">
              <p><strong>{section.company}</strong></p>
              <p>{section.capital}</p>
              <p>{section.address}</p>
              <p>{section.phone}</p>
              <p>Email: <a href={`mailto:${section.email}`}>{section.email}</a></p>
            </div>
          </>
        );
      case 'hosting':
        return (
          <>
            <p>{section.content}</p>
            <div className="legal-details">
              <p><strong>{section.company}</strong></p>
              <p>{section.address}</p>
              <p><a href={section.website} target="_blank" rel="noopener noreferrer">{section.website}</a></p>
            </div>
          </>
        );
      case 'cookies':
        return (
          <>
            <p>{section.content1}</p>
            <ul>
              <li>{section.item1}</li>
              <li>{section.item2}</li>
              <li>{section.item3}</li>
            </ul>
            <p>{section.content2}</p>
          </>
        );
       case 'data':
         return (
            <>
                <p>
                    {section.content1} 
                    <a href="mailto:privacy@bonplaninfos.net" className="text-primary hover:underline">privacy@bonplaninfos.net</a>.
                </p>
                <p>
                    <Trans i18nKey="legal_mentions.sections.data.content2">
                        Pour plus d'informations, veuillez consulter notre <Link to="/privacy-policy" className="text-primary hover:underline">Politique de Confidentialité</Link>.
                    </Trans>
                </p>
            </>
         )
      default:
        return <p dangerouslySetInnerHTML={{ __html: section.content || section.content1 }}></p>;
    }
  };

  return (
    <div className="legal-mentions-page">
      <Helmet>
        <title>{t('legal_mentions.meta_title')} - BonPlanInfos</title>
        <meta name="description" content={t('legal_mentions.meta_description')} />
      </Helmet>

      <main>
        <section className="legal-hero">
          <div className="container">
            <h1><Gavel className="inline-block w-12 h-12 mb-4" /> {t('legal_mentions.title')}</h1>
            <p>{t('legal_mentions.subtitle')}</p>
            <div className="last-update">{t('legal_mentions.lastUpdate')}</div>
          </div>
        </section>

        <section className="legal-content">
          <div className="container">
            {sectionDetails.map(({ key, icon }) => {
              const section = sectionsData[key];
              if (!section) return null;
              return (
                <div className="legal-section" key={key}>
                  <h2>{icon} {section.title}</h2>
                  {renderSectionContent(key, section)}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};

export default LegalMentionsPage;