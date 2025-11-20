import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Ticket, Gift, Vote, Store } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const eventTypes = [
  { id: 'ticketing', name: 'Billetterie', icon: Ticket, defaultPrice: 5000, defaultCount: 200 },
  { id: 'raffle', name: 'Tombola', icon: Gift, defaultPrice: 1000, defaultCount: 500 },
  { id: 'voting', name: 'Vote', icon: Vote, defaultPrice: 500, defaultCount: 1000 },
  { id: 'stand_rental', name: 'Stands', icon: Store, defaultPrice: 50000, defaultCount: 20 },
];

const RevenueSimulation = ({ onCtaClick }) => {
  const { t } = useTranslation();
  const [eventType, setEventType] = useState(eventTypes[0].id);
  const [price, setPrice] = useState(eventTypes[0].defaultPrice);
  const [count, setCount] = useState(eventTypes[0].defaultCount);

  const selectedEvent = useMemo(() => eventTypes.find(e => e.id === eventType), [eventType]);

  const handleEventTypeChange = (newEventTypeId) => {
    const newEvent = eventTypes.find(e => e.id === newEventTypeId);
    if (newEvent) {
      setEventType(newEventTypeId);
      setPrice(newEvent.defaultPrice);
      setCount(newEvent.defaultCount);
    }
  };

  const grossRevenue = price * count;
  const platformFee = grossRevenue * 0.05;
  const netEarning = grossRevenue - platformFee;

  const maxPrice = selectedEvent.id === 'stand_rental' ? 200000 : 50000;
  const maxCount = {
    ticketing: 5000,
    raffle: 10000,
    voting: 20000,
    stand_rental: 100
  }[selectedEvent.id];
  
  const priceStep = selectedEvent.id === 'stand_rental' ? 10000 : 500;
  const countStep = {
    ticketing: 50,
    raffle: 100,
    voting: 200,
    stand_rental: 1
  }[selectedEvent.id];

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
            {t('marketing.simulation.title')}
          </h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            {t('marketing.simulation.subtitle')}
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Controls */}
          <motion.div 
            className="lg:col-span-1 space-y-8"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Card className="glass-effect">
              <CardHeader>
                <CardTitle>{t('marketing.simulation.event_type')}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                {eventTypes.map(et => (
                  <Button 
                    key={et.id} 
                    variant={eventType === et.id ? 'default' : 'outline'}
                    onClick={() => handleEventTypeChange(et.id)}
                    className="flex flex-col h-20"
                  >
                    <et.icon className="w-6 h-6 mb-1" />
                    <span>{et.name}</span>
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card className="glass-effect">
              <CardHeader>
                <CardTitle>{t('marketing.simulation.ticket_price')}</CardTitle>
                <div className="text-2xl font-bold text-primary">{price.toLocaleString('fr-FR')} FCFA</div>
              </CardHeader>
              <CardContent>
                <Slider
                  value={[price]}
                  onValueChange={(value) => setPrice(value[0])}
                  max={maxPrice}
                  step={priceStep}
                />
              </CardContent>
            </Card>

            <Card className="glass-effect">
              <CardHeader>
                <CardTitle>{t('marketing.simulation.number_of_tickets')}</CardTitle>
                <div className="text-2xl font-bold text-primary">{count.toLocaleString('fr-FR')}</div>
              </CardHeader>
              <CardContent>
                <Slider
                  value={[count]}
                  onValueChange={(value) => setCount(value[0])}
                  max={maxCount}
                  step={countStep}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Results */}
          <motion.div 
            className="lg:col-span-2 lg:sticky lg:top-24"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-primary/80 to-secondary/80 text-primary-foreground shadow-2xl">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl md:text-3xl">{t('marketing.simulation.potential_revenue')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 text-center">
                <motion.div
                  key={grossRevenue}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-5xl md:text-7xl font-extrabold tracking-tighter"
                >
                  {grossRevenue.toLocaleString('fr-FR')} <span className="text-4xl font-medium">FCFA</span>
                </motion.div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left p-6 bg-black/20 rounded-lg">
                  <div>
                    <p className="text-sm opacity-80">{t('marketing.simulation.platform_fee')}</p>
                    <p className="text-2xl font-bold">- {platformFee.toLocaleString('fr-FR')} FCFA</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-sm opacity-80">{t('marketing.simulation.your_net_earning')}</p>
                    <p className="text-3xl font-bold text-green-300">{netEarning.toLocaleString('fr-FR')} FCFA</p>
                  </div>
                </div>

                <div className="pt-6">
                  <Button size="lg" variant="secondary" className="w-full max-w-xs mx-auto text-lg bg-white text-primary hover:bg-gray-100" onClick={onCtaClick}>
                    <TrendingUp className="mr-2 h-5 w-5"/>
                    {t('marketing.simulation.cta')}
                  </Button>
                  <p className="text-xs opacity-70 mt-4">{t('marketing.simulation.note')}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default RevenueSimulation;