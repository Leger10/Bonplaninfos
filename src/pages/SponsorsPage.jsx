import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { Loader2, Building } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Définir les chemins d'images locaux
const sponsorKeys = ['orange', 'mtn', 'moov', 'wave', 'ontbf', 'moneyfusion'];

const SponsorsPage = () => {
    const { t } = useTranslation();
    const [sponsors, setSponsors] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSponsors = () => {
            const loadedSponsors = sponsorKeys.map(key => {
                let imagePath;
                
                // Définir les chemins d'images locaux
                switch(key) {
                    case 'orange':
                        imagePath = '/orangeci.png';
                        break;
                    case 'mtn':
                        imagePath = '/MTN-Group.jpg';
                        break;
                    case 'moov':
                        // Si vous n'avez pas d'image pour Moov, utilisez une par défaut
                        imagePath = '/wave.png'; // Remplacez par l'image Moov si disponible
                        break;
                    case 'wave':
                        imagePath = '/wave.png';
                        break;
                    case 'ontbf':
                        imagePath = '/ONTBF.jpg';
                        break;
                    case 'moneyfusion':
                        imagePath = '/moneyfusion.png';
                        break;
                    default:
                        imagePath = '/wave.png'; // Image par défaut
                }
                
                return {
                    id: key,
                    name: t(`sponsors.list.${key}.name`),
                    logo_url: imagePath,
                    description: t(`sponsors.list.${key}.description`)
                };
            });
            
            setSponsors(loadedSponsors);
            setLoading(false);
        };

        fetchSponsors();
    }, [t]);

    return (
        <>
            <Helmet>
                <title>{t('sponsors.meta_title')} - BonPlanInfos</title>
                <meta name="description" content={t('sponsors.meta_description')} />
            </Helmet>
            <div className="py-16 sm:py-24 bg-background">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <Building className="w-16 h-16 mx-auto text-primary mb-4" />
                        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl font-heading">
                            {t('sponsors.title')}
                        </h1>
                        <p className="mt-4 text-lg leading-8 text-muted-foreground max-w-3xl mx-auto">
                            {t('sponsors.subtitle')}
                        </p>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center">
                            <Loader2 className="w-12 h-12 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {sponsors.map((sponsor) => (
                                <Card key={sponsor.id} className="bg-card overflow-hidden shadow-lg hover:shadow-primary/20 transition-shadow duration-300">
                                    <CardHeader className="p-0">
                                        <div className="h-40 flex items-center justify-center bg-white p-4">
                                            <img 
                                                src={sponsor.logo_url} 
                                                alt={sponsor.name} 
                                                className="max-h-full max-w-full object-contain p-2"
                                                onError={(e) => {
                                                    // En cas d'erreur de chargement de l'image
                                                    e.target.src = '/wave.png';
                                                    e.target.alt = 'Logo non disponible';
                                                }}
                                            />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <CardTitle className="text-xl mb-2">{sponsor.name}</CardTitle>
                                        <p className="text-muted-foreground text-sm">{sponsor.description}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default SponsorsPage;