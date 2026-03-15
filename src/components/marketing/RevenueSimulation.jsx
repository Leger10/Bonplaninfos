// components/marketing/RevenueSimulation.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

const RevenueSimulation = ({ onCtaClick }) => {
  const { t } = useTranslation();
  
  const [eventType, setEventType] = useState('concert');
  const [ticketPrice, setTicketPrice] = useState(5000);
  const [numberOfTickets, setNumberOfTickets] = useState(200);
  const [numberOfInteractions, setNumberOfInteractions] = useState(0);
  const [calculations, setCalculations] = useState({
    potentialRevenue: 0,
    platformFee: 0,
    netEarning: 0
  });

  // Types d'événements avec leurs spécificités
  const eventTypes = {
    concert: {
      name: 'Concert',
      description: '95% pour organisateur et 5% pour la plateforme comme frais sur les participations',
      hasTickets: true,
      hasInteractions: false
    },
    stands: {
      name: 'Vente de stands',
      description: '95% pour organisateur et 5% pour la plateforme comme frais sur les participations',
      hasTickets: true,
      hasInteractions: false
    },
    election: {
      name: 'Élection vote',
      description: '95% pour organisateur et 5% pour la plateforme comme frais sur les participations',
      hasTickets: true,
      hasInteractions: false
    },
    lottery: {
      name: 'Tirage au sort (Lotterie)',
      description: '95% pour organisateur et 5% pour la plateforme comme frais sur les participations',
      hasTickets: true,
      hasInteractions: false
    },
    protected: {
      name: 'Événement Protégé Monétisé',
      description: '1 pièce à chaque interaction soit 10 FCFA pour l\'organisateur. Minimum pour retrait: 50 pièces',
      hasTickets: false,
      hasInteractions: true
    }
  };

  // Calcul des revenus en temps réel
  useEffect(() => {
    let potentialRevenue = 0;
    let platformFee = 0;
    let netEarning = 0;

    const currentEvent = eventTypes[eventType];

    if (currentEvent.hasTickets) {
      potentialRevenue = ticketPrice * numberOfTickets;
      platformFee = potentialRevenue * 0.05;
      netEarning = potentialRevenue - platformFee;
    } else if (currentEvent.hasInteractions) {
      const revenuePerInteraction = 10;
      potentialRevenue = numberOfInteractions * revenuePerInteraction;
      platformFee = 0;
      netEarning = potentialRevenue;
    }

    setCalculations({
      potentialRevenue: Math.round(potentialRevenue),
      platformFee: Math.round(platformFee),
      netEarning: Math.round(netEarning)
    });
  }, [eventType, ticketPrice, numberOfTickets, numberOfInteractions]);

  const formatNumber = (number) => {
    return new Intl.NumberFormat('fr-FR').format(number);
  };

  const currentEvent = eventTypes[eventType];

  return (
    <section className="py-12 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-4xl font-bold">{t('marketing.simulation.title')}</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto text-sm md:text-base">
            {t('marketing.simulation.subtitle')}
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="glass-effect shadow-lg overflow-hidden">
            <CardHeader className="pb-4 md:pb-6">
              <CardTitle className="text-center text-xl md:text-2xl">
                {t('marketing.simulation.title')}
              </CardTitle>
            </CardHeader>

            <CardContent className="p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                {/* Colonne de gauche : Formulaire */}
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      {t('marketing.simulation.event_type')}
                    </label>
                    <select
                      className="w-full p-3 border border-border rounded-lg bg-background text-foreground text-sm md:text-base focus:ring-2 focus:ring-primary/30 transition-all"
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                    >
                      <option value="concert">Concert</option>
                      <option value="stands">Vente de stands</option>
                      <option value="election">Élection vote</option>
                      <option value="lottery">Tirage au sort (Lotterie)</option>
                      <option value="protected">Événement Protégé Monétisé</option>
                    </select>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                      {currentEvent.description}
                    </p>
                  </div>

                  {currentEvent.hasTickets && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          {t('marketing.simulation.ticket_price')}
                        </label>
                        <div className="flex items-center border border-border rounded-lg bg-background px-3 focus-within:ring-2 focus-within:ring-primary/30">
                          <input
                            type="number"
                            className="w-full p-3 bg-transparent text-foreground text-sm md:text-base border-none outline-none"
                            value={ticketPrice}
                            onChange={(e) => setTicketPrice(Number(e.target.value))}
                            min="0"
                            step="100"
                          />
                          <span className="text-muted-foreground whitespace-nowrap text-sm">FCFA</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          {t('marketing.simulation.number_of_tickets')}
                        </label>
                        <input
                          type="number"
                          className="w-full p-3 border border-border rounded-lg bg-background text-foreground text-sm md:text-base focus:ring-2 focus:ring-primary/30"
                          value={numberOfTickets}
                          onChange={(e) => setNumberOfTickets(Number(e.target.value))}
                          min="0"
                        />
                      </div>
                    </>
                  )}

                  {currentEvent.hasInteractions && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Nombre d'interactions estimées
                      </label>
                      <input
                        type="number"
                        className="w-full p-3 border border-border rounded-lg bg-background text-foreground text-sm md:text-base focus:ring-2 focus:ring-primary/30"
                        value={numberOfInteractions}
                        onChange={(e) => setNumberOfInteractions(Number(e.target.value))}
                        min="0"
                        placeholder="Ex: 100"
                      />
                      {numberOfInteractions < 50 && numberOfInteractions > 0 && (
                        <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                          <span>⚠️</span> Minimum 50 interactions requis pour le retrait (500 FCFA)
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Colonne de droite : Résultats */}
                <div className="space-y-4 bg-muted/30 rounded-lg p-4 md:p-6">
                  <div className="flex justify-between items-center border-b border-border pb-3">
                    <span className="text-foreground font-medium text-sm md:text-base">
                      {currentEvent.hasInteractions ? 'Revenu des interactions' : t('marketing.simulation.potential_revenue')}
                    </span>
                    <span className="font-semibold text-green-600 text-sm md:text-base break-words text-right">
                      {formatNumber(calculations.potentialRevenue)} FCFA
                    </span>
                  </div>

                  {currentEvent.hasTickets && (
                    <div className="flex justify-between items-center border-b border-border pb-3">
                      <span className="text-foreground font-medium text-sm md:text-base">
                        {t('marketing.simulation.platform_fee')}
                      </span>
                      <span className="font-semibold text-red-500 text-sm md:text-base break-words text-right">
                        - {formatNumber(calculations.platformFee)} FCFA
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-foreground font-bold text-sm md:text-base">
                      {t('marketing.simulation.your_net_earning')}
                    </span>
                    <span className="font-bold text-green-600 text-lg md:text-xl break-words text-right">
                      {formatNumber(calculations.netEarning)} FCFA
                    </span>
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                      💡 <strong>Simulation en temps réel</strong> — Modifiez les valeurs pour voir l'impact sur vos revenus.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 md:mt-8 text-center">
                <Button
                  size="lg"
                  className="gradient-red text-primary-foreground shadow-lg w-full sm:w-auto px-6 md:px-8 text-sm md:text-base hover:scale-105 transition-transform"
                  onClick={onCtaClick}
                >
                  {t('marketing.simulation.cta')}
                </Button>
                <p className="text-xs md:text-sm text-muted-foreground mt-3 md:mt-4">
                  {t('marketing.simulation.note')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default RevenueSimulation;