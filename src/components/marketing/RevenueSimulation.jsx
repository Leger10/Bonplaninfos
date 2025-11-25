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
      // Calcul pour les événements avec billets
      potentialRevenue = ticketPrice * numberOfTickets;
      platformFee = potentialRevenue * 0.05; // 5% de frais
      netEarning = potentialRevenue - platformFee;
    } else if (currentEvent.hasInteractions) {
      // Calcul pour les événements avec interactions
      const revenuePerInteraction = 10; // 10 FCFA par interaction
      potentialRevenue = numberOfInteractions * revenuePerInteraction;
      // Pas de frais de plateforme pour les interactions
      platformFee = 0;
      netEarning = potentialRevenue;
      
      // Afficher un message si le minimum de retrait n'est pas atteint
      if (numberOfInteractions < 50) {
        // Vous pouvez ajouter un état pour afficher un warning si nécessaire
      }
    }

    setCalculations({
      potentialRevenue: Math.round(potentialRevenue),
      platformFee: Math.round(platformFee),
      netEarning: Math.round(netEarning)
    });
  }, [eventType, ticketPrice, numberOfTickets, numberOfInteractions]);

  // Formatage des nombres avec espace pour les milliers
  const formatNumber = (number) => {
    return new Intl.NumberFormat('fr-FR').format(number);
  };

  const currentEvent = eventTypes[eventType];

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">{t('marketing.simulation.title')}</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            {t('marketing.simulation.subtitle')}
          </p>
        </div>
        <div className="max-w-4xl mx-auto">
          <Card className="glass-effect shadow-lg">
            <CardHeader>
              <CardTitle className="text-center text-2xl">{t('marketing.simulation.title')}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {/* Colonne de gauche : Formulaire de simulation */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      {t('marketing.simulation.event_type')}
                    </label>
                    <select 
                      className="w-full p-3 border border-border rounded-lg bg-background text-foreground text-sm md:text-base"
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                    >
                      <option value="concert">Concert</option>
                      <option value="stands">Vente de stands</option>
                      <option value="election">Élection vote</option>
                      <option value="lottery">Tirage au sort (Lotterie)</option>
                      <option value="protected">Événement Protégé Monétisé</option>
                    </select>
                    <p className="text-xs text-muted-foreground mt-2">
                      {currentEvent.description}
                    </p>
                  </div>

                  {currentEvent.hasTickets && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          {t('marketing.simulation.ticket_price')}
                        </label>
                        <div className="flex items-center border border-border rounded-lg bg-background px-3">
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
                          className="w-full p-3 border border-border rounded-lg bg-background text-foreground text-sm md:text-base" 
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
                        className="w-full p-3 border border-border rounded-lg bg-background text-foreground text-sm md:text-base" 
                        value={numberOfInteractions}
                        onChange={(e) => setNumberOfInteractions(Number(e.target.value))}
                        min="0"
                        placeholder="50 interactions minimum pour retrait"
                      />
                      {numberOfInteractions < 50 && (
                        <p className="text-xs text-amber-600 mt-2">
                          ⚠️ Minimum 50 interactions requis pour le retrait (500 FCFA)
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Colonne de droite : Résultats de la simulation */}
                <div className="space-y-4 bg-muted/30 rounded-lg p-4 md:p-6">
                  <div className="flex justify-between items-center border-b border-border pb-3">
                    <span className="text-foreground font-medium text-sm md:text-base">
                      {currentEvent.hasInteractions ? 'Revenu des interactions' : t('marketing.simulation.potential_revenue')}
                    </span>
                    <span className="font-semibold text-green-600 text-sm md:text-base">
                      {formatNumber(calculations.potentialRevenue)} FCFA
                    </span>
                  </div>
                  
                  {currentEvent.hasTickets && (
                    <div className="flex justify-between items-center border-b border-border pb-3">
                      <span className="text-foreground font-medium text-sm md:text-base">
                        {t('marketing.simulation.platform_fee')}
                      </span>
                      <span className="font-semibold text-red-500 text-sm md:text-base">
                        - {formatNumber(calculations.platformFee)} FCFA
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-foreground font-bold text-sm md:text-base">
                      {t('marketing.simulation.your_net_earning')}
                    </span>
                    <span className="font-bold text-green-600 text-lg md:text-xl">
                      {formatNumber(calculations.netEarning)} FCFA
                    </span>
                  </div>

                  {/* Informations supplémentaires */}
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      💡 <strong>Simulation en temps réel</strong> - Modifiez les valeurs pour voir l'impact sur vos revenus
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 md:mt-8 text-center">
                <Button 
                  size="lg" 
                  className="gradient-red text-primary-foreground shadow-lg w-full md:w-auto text-sm md:text-base hover:scale-105 transition-transform"
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