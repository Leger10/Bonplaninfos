import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { Loader2, Building } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/customSupabaseClient';

const SponsorsPage = () => {
    const { t } = useTranslation();
    const [sponsors, setSponsors] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSponsors = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('sponsors')
                    .select('*')
                    .eq('is_active', true) // seulement les sponsors actifs
                    .order('display_order', { ascending: true })
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setSponsors(data || []);
            } catch (error) {
                console.error("Erreur lors du chargement des sponsors:", error);
                // Optionnel : afficher un toast d'erreur
            } finally {
                setLoading(false);
            }
        };

        fetchSponsors();
    }, []);

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
                        <div className="flex justify-center items-center py-20">
                            <Loader2 className="w-12 h-12 animate-spin text-primary" />
                        </div>
                    ) : sponsors.length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground">
                            <Building className="w-20 h-20 mx-auto mb-4 opacity-50" />
                            <p className="text-xl">Aucun sponsor pour le moment</p>
                            <p className="text-sm">Revenez plus tard pour découvrir nos partenaires.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {sponsors.map((sponsor) => (
                                <Card key={sponsor.id} className="bg-card overflow-hidden shadow-lg hover:shadow-primary/20 transition-shadow duration-300">
                                    <CardHeader className="p-0">
                                        <div className="h-40 flex items-center justify-center bg-white p-4">
                                            <img 
                                                src={sponsor.logo_url || '/placeholder-logo.png'} 
                                                alt={sponsor.name} 
                                                className="max-h-full max-w-full object-contain p-2"
                                                onError={(e) => {
                                                    e.target.src = '/placeholder-logo.png';
                                                    e.target.alt = 'Logo non disponible';
                                                }}
                                            />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <CardTitle className="text-xl mb-2">{sponsor.name}</CardTitle>
                                        <p className="text-muted-foreground text-sm">{sponsor.description}</p>
                                        {sponsor.website_url && (
                                            <a 
                                                href={sponsor.website_url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="mt-3 inline-block text-primary hover:underline text-sm"
                                            >
                                                Visiter le site →
                                            </a>
                                        )}
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