import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Footer = () => {
    const { t } = useTranslation();
    const year = new Date().getFullYear();

    const footerLinks = {
        platform: [
            { to: '/', text: t('footer.home') },
            { to: '/how-it-works', text: t('footer.how_it_works') },
            { to: '/aide', text: t('footer.help') },
            { to: '/faq', text: t('footer.faq') },
        ],
        company: [
            { to: '/about', text: t('footer.about') },
            { to: '/partner-signup', text: t('footer.partnership') },
            { to: '/sponsors', text: t('footer.sponsors') },
            { href: 'mailto:support@bonplaninfos.net', text: 'support@bonplaninfos.net' },
            { href: 'https://chat.whatsapp.com/IcR0TttLYpU1lJXr3ifyvH', text: 'Communauté WhatsApp' },
            { href: 'tel:+2250712275374', text: 'Tel: 002250712275374' },
        ],
        legal: [
            { to: '/politique-confidentialite', text: t('footer.privacy') },
            { to: '/conditions-utilisation', text: t('footer.terms') },
            { to: '/protection-donnees', text: t('footer.data_protection') },
            { to: '/legal-mentions', text: t('footer.legal_mentions') },
        ]
    };

    return (
        <footer className="bg-card border-t border-border/50">
            <div className="container py-12">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div className="col-span-2 md:col-span-1">
                        <h3 className="font-bold font-heading text-lg mb-2 text-foreground">BonPlanInfos</h3>
                        <p className="text-sm text-muted-foreground">{t('footer.tagline')}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold font-heading mb-3 text-foreground">{t('footer.platform')}</h4>
                        <ul className="space-y-2 text-sm">
                            {footerLinks.platform.map(link => (
                                <li key={link.to}><Link to={link.to} className="text-muted-foreground hover:text-primary">{link.text}</Link></li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold font-heading mb-3 text-foreground">Entreprise</h4>
                        <ul className="space-y-2 text-sm">
                            {footerLinks.company.map(link => (
                                <li key={link.to || link.href}>
                                    {link.to ? (
                                        <Link to={link.to} className="text-muted-foreground hover:text-primary">{link.text}</Link>
                                    ) : (
                                        <a href={link.href} className="text-muted-foreground hover:text-primary" target="_blank" rel="noopener noreferrer">{link.text}</a>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold font-heading mb-3 text-foreground">Légal</h4>
                        <ul className="space-y-2 text-sm">
                            {footerLinks.legal.map(link => (
                                <li key={link.to}><Link to={link.to} className="text-muted-foreground hover:text-primary">{link.text}</Link></li>
                            ))}
                        </ul>
                    </div>
                </div>
                <div className="mt-12 border-t border-border/50 pt-8 text-center text-xs text-muted-foreground">
                    <p>© {year} BonPlanInfos — Tous droits réservés | <Link to="/politique-confidentialite" className="hover:text-primary">Politique de Confidentialité</Link> | <Link to="/conditions-utilisation" className="hover:text-primary">Conditions d’Utilisation</Link></p>
                    <p className="mt-2">support@bonplaninfos.net | WhatsApp: <a href="https://chat.whatsapp.com/IcR0TttLYpU1lJXr3ifyvH" className="hover:text-primary" target="_blank" rel="noopener noreferrer">Rejoignez notre communauté</a> | Tel: 002250712275374</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;