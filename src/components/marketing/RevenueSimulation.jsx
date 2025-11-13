import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Rocket } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const RevenueSimulation = ({ onCtaClick }) => {
  const { t } = useTranslation();

  const events = useMemo(() => [
    { id: 1, name: t('marketing.revenue_simulation.miss_ci'), interactions: { shares: 200, downloads: 100, views: 1500, comments: 80, reactions: 300 }},
    { id: 2, name: t('marketing.revenue_simulation.music_festival'), interactions: { shares: 150, downloads: 75, views: 1200, comments: 60, reactions: 250 }},
    { id: 3, name: t('marketing.revenue_simulation.football_tournament'), interactions: { shares: 100, downloads: 50, views: 800, comments: 40, reactions: 180 }},
    { id: 4, name: t('marketing.revenue_simulation.entrepreneur_conf'), interactions: { shares: 80, downloads: 40, views: 600, comments: 30, reactions: 120 }}
  ], [t]);

  const calculateEventRevenue = (interactions) => {
    const totalInteractions = Object.values(interactions).reduce((sum, count) => sum + count, 0);
    // Each interaction costs 2 coins for the user, and the organizer earns 1 coin.
    const revenuePi = totalInteractions * 1; 
    const revenueFcfa = revenuePi * 10;
    
    return {
      totalInteractions,
      revenuePi,
      revenueFcfa,
      details: Object.entries(interactions).map(([type, count]) => ({ type, count, revenuePi: count * 1, revenueFcfa: count * 1 * 10 }))
    };
  };

  const monthlyTotals = useMemo(() => {
    return events.reduce((totals, event) => {
      const revenue = calculateEventRevenue(event.interactions);
      return {
        totalInteractions: totals.totalInteractions + revenue.totalInteractions,
        totalRevenuePi: totals.totalRevenuePi + revenue.revenuePi,
        totalRevenueFcfa: totals.totalRevenueFcfa + revenue.revenueFcfa
      };
    }, { totalInteractions: 0, totalRevenuePi: 0, totalRevenueFcfa: 0 });
  }, [events]);

  const getInteractionLabel = (type) => {
    const labels = { 
        shares: t('marketing.revenue_simulation.shares'), 
        downloads: t('marketing.revenue_simulation.downloads'), 
        views: t('marketing.revenue_simulation.views'), 
        comments: t('marketing.revenue_simulation.comments'), 
        reactions: t('marketing.revenue_simulation.reactions')
    };
    return labels[type] || type;
  };
  
  const interactionIcons = { shares: '📤', downloads: '📥', views: '👁️', comments: '💬', reactions: '❤️' };

  return (
    <motion.section 
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6 }}
        className="py-16 sm:py-20 bg-background"
    >
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold" dangerouslySetInnerHTML={{ __html: t('marketing.revenue_simulation.title') }}></h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">{t('marketing.revenue_simulation.subtitle')}</p>
        </div>

        <Card className="mb-12 border-primary glass-effect shadow-lg">
            <CardHeader>
                <CardTitle className="text-center text-2xl font-semibold text-foreground">{t('marketing.revenue_simulation.summary_title')}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-y-6 md:gap-x-6 text-center">
                <div className="p-4">
                    <p className="text-4xl font-bold text-blue-400">{monthlyTotals.totalInteractions.toLocaleString()}</p>
                    <p className="text-muted-foreground font-medium">{t('marketing.revenue_simulation.total_interactions')}</p>
                </div>
                 <div className="p-4">
                    <p className="text-4xl font-bold text-green-400">{monthlyTotals.totalRevenuePi.toLocaleString()}π</p>
                    <p className="text-muted-foreground font-medium">{t('marketing.revenue_simulation.revenue_coins')}</p>
                </div>
                 <div className="p-4">
                    <p className="text-4xl font-bold text-amber-400">{monthlyTotals.totalRevenueFcfa.toLocaleString()} FCFA</p>
                    <p className="text-muted-foreground font-medium">{t('marketing.revenue_simulation.revenue_fcfa')}</p>
                </div>
            </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {events.map((event, index) => {
            const revenue = calculateEventRevenue(event.interactions);
            return (
              <Card key={event.id} className={`overflow-hidden glass-effect border-l-4 shadow-md ${index % 2 === 0 ? 'border-primary' : 'border-amber-500'}`}>
                <CardHeader>
                    <CardTitle className="text-xl text-foreground">🎪 {event.name}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                        {revenue.details.map((detail) => (
                            <Card key={detail.type} className="p-3 text-center bg-muted/50 border border-border/50">
                                <p className="text-2xl font-bold text-primary">{detail.count}</p>
                                <p className="text-sm font-medium text-muted-foreground">{getInteractionLabel(detail.type)}</p>
                                <p className="text-xs font-semibold text-green-500 mt-1">+{detail.revenuePi}π</p>
                            </Card>
                        ))}
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gradient-to-r from-primary to-blue-600 text-primary-foreground rounded-lg">
                        <div>
                            <p className="text-sm opacity-80">{t('marketing.revenue_simulation.total_revenue')}</p>
                            <p className="text-lg font-bold">{revenue.revenuePi}π • {revenue.revenueFcfa.toLocaleString()} FCFA</p>
                        </div>
                        <div className="bg-primary-foreground/20 text-xs font-semibold px-3 py-1 rounded-full">{revenue.totalInteractions} {t('marketing.revenue_simulation.interactions')}</div>
                    </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
        
        <Card className="mb-12 glass-effect border border-border/50">
            <CardHeader>
                <CardTitle className="text-center font-semibold text-foreground">{t('marketing.revenue_simulation.how_it_works_title')}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 text-center">
                    {Object.entries(interactionIcons).map(([type, icon]) => (
                        <div key={type} className="flex flex-col items-center">
                            <p className="text-4xl mb-2">{icon}</p>
                            <p className="font-semibold text-foreground text-sm">{getInteractionLabel(type)}</p>
                            <p className="text-xs text-muted-foreground">+1π ({t('organizer')})</p>
                            <p className="text-xs text-muted-foreground">-2π ({t('user')})</p>
                        </div>
                    ))}
                    <div className="flex flex-col items-center">
                        <p className="text-4xl mb-2">💸</p>
                        <p className="font-semibold text-foreground text-sm">{t('marketing.revenue_simulation.easy_withdrawal')}</p>
                        <p className="text-xs text-muted-foreground">{t('marketing.revenue_simulation.from_50_pi')}</p>
                    </div>
                </div>
            </CardContent>
        </Card>


        <div className="text-center">
             <Card className="p-8 gradient-gold text-background shadow-2xl">
                <h3 className="text-2xl font-bold mb-2">{t('marketing.revenue_simulation.ready_cta_title')}</h3>
                <p className="mb-6 opacity-90">{t('marketing.revenue_simulation.ready_cta_subtitle')}</p>
                <Button size="lg" variant="secondary" onClick={onCtaClick} className="bg-white text-primary hover:bg-gray-100 shadow-lg transform hover:scale-105 transition-transform">
                    <Rocket className="mr-2 h-5 w-5" /> {t('marketing.revenue_simulation.cta_button')}
                </Button>
            </Card>
        </div>
      </div>
    </motion.section>
  );
};

export default RevenueSimulation;