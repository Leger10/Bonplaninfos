import React from 'react';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { Shield, Mail, Clock, Trash2, UserCheck, Database, Server, Lock, Eye, Users } from 'lucide-react';

const DataProtectionPage = () => {
    const { t } = useTranslation();

    const sections = [
        {
            icon: <Shield className="w-8 h-8 text-primary" />,
            title: t('data_protection.commitment.title'),
            content: t('data_protection.commitment.content'),
        },
        {
            icon: <UserCheck className="w-8 h-8 text-primary" />,
            title: t('data_protection.dpo.title'),
            content: t('data_protection.dpo.content'),
            contact: "support@bonplaninfos.net",
        },
        {
            icon: <Database className="w-8 h-8 text-primary" />,
            title: t('data_protection.data_collected.title'),
            content: t('data_protection.data_collected.content'),
            list: t('data_protection.data_collected.list', { returnObjects: true }),
        },
        {
            icon: <Eye className="w-8 h-8 text-primary" />,
            title: t('data_protection.usage.title'),
            content: t('data_protection.usage.content'),
            list: t('data_protection.usage.list', { returnObjects: true }),
        },
        {
            icon: <Users className="w-8 h-8 text-primary" />,
            title: t('data_protection.sharing.title'),
            content: t('data_protection.sharing.content'),
            list: t('data_protection.sharing.list', { returnObjects: true }),
        },
        {
            icon: <Lock className="w-8 h-8 text-primary" />,
            title: t('data_protection.security.title'),
            content: t('data_protection.security.content'),
            list: t('data_protection.security.list', { returnObjects: true }),
        },
        {
            icon: <Clock className="w-8 h-8 text-primary" />,
            title: t('data_protection.retention.title'),
            content: t('data_protection.retention.content'),
            list: t('data_protection.retention.list', { returnObjects: true }),
        },
        {
            icon: <Server className="w-8 h-8 text-primary" />,
            title: t('data_protection.hosting.title'),
            content: t('data_protection.hosting.content'),
        },
        {
            icon: <Trash2 className="w-8 h-8 text-primary" />,
            title: t('data_protection.deletion.title'),
            content: t('data_protection.deletion.content'),
        },
    ];

    return (
        <>
            <Helmet>
                <title>{t('data_protection.meta_title')} - BonPlanInfos</title>
                <meta name="description" content={t('data_protection.meta_description')} />
            </Helmet>
            <div className="py-16 sm:py-24">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl font-heading">
                            {t('data_protection.title')}
                        </h1>
                        <p className="mt-4 text-lg leading-8 text-muted-foreground">
                            {t('data_protection.subtitle')}
                        </p>
                        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg max-w-2xl mx-auto">
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                {t('data_protection.africa_compliance')}
                            </p>
                        </div>
                    </div>

                    <div className="max-w-4xl mx-auto space-y-8">
                        {sections.map((section, index) => (
                            <div key={index} className="p-8 bg-card rounded-2xl shadow-lg border border-border">
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0">{section.icon}</div>
                                    <div className="flex-1">
                                        <h2 className="text-2xl font-bold text-foreground mb-3">{section.title}</h2>
                                        <div className="prose prose-invert max-w-none text-muted-foreground">
                                            <p className="mb-4">{section.content}</p>
                                            {section.list && Array.isArray(section.list) && (
                                                <ul className="space-y-2">
                                                    {section.list.map((item, i) => (
                                                        <li key={i} className="flex items-start">
                                                            <span className="text-primary mr-2">•</span>
                                                            <span dangerouslySetInnerHTML={{ __html: item }} />
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                            {section.contact && (
                                                <div className="mt-6 p-4 bg-muted rounded-lg">
                                                    <p className="font-semibold mb-2">{t('data_protection.contact_title')}</p>
                                                    <p className="flex items-center gap-2">
                                                        <Mail className="w-5 h-5" />
                                                        <a 
                                                            href={`mailto:${section.contact}`} 
                                                            className="text-primary hover:underline"
                                                        >
                                                            {section.contact}
                                                        </a>
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer note */}
                    <div className="max-w-4xl mx-auto mt-12 p-6 bg-muted rounded-2xl text-center">
                        <p className="text-sm text-muted-foreground">
                            {t('data_protection.last_updated')}
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default DataProtectionPage;