import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Coins, BarChart, Heart, Vote, Ticket, Building, Percent } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useData } from '@/contexts/DataContext';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';

const StatCard = ({ title, value, icon: Icon, details, color = 'text-primary' }) => (
  <Card className="glass-effect">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className={`h-5 w-5 ${color}`} />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{details}</p>
    </CardContent>
  </Card>
);

const EarningsBreakdownCard = ({ title, earnings, participants, icon: Icon, color }) => {
  const organizerShare = earnings ? (earnings * 0.95).toFixed(0) : 0;
  const platformShare = earnings ? (earnings * 0.05).toFixed(0) : 0;

  return (
    <Card className="glass-effect flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color.replace('text-', 'bg-')}/10`}>
                <Icon className={`h-6 w-6 ${color}`} />
            </div>
            <CardTitle className="text-lg">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Participants / Ventes</p>
          <p className="text-2xl font-bold">{participants.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Gains Totaux (pièces)</p>
          <p className="text-2xl font-bold text-primary">{earnings.toLocaleString()} π</p>
        </div>
        <div className="text-xs text-muted-foreground pt-2 border-t border-border/20">
          <p>Votre part (95%): <strong className="text-green-400">{organizerShare} π</strong></p>
          <p>Commission (5%): <strong className="text-red-400">{platformShare} π</strong></p>
        </div>
      </CardContent>
    </Card>
  );
};

const OrganizerDashboardTab = ({ stats, loading }) => {
  const { adminConfig } = useData();
  const navigate = useNavigate();

  if (loading) {
    return <div className="flex justify-center items-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  
  if (!stats) {
    return (
        <Card className="glass-effect text-center p-8">
            <BarChart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-bold mb-2">Aucune donnée à afficher</h3>
            <p className="text-muted-foreground mb-6">Créez votre premier événement payant pour voir vos statistiques ici.</p>
            <Button onClick={() => navigate('/create-event')} className="gradient-gold text-background">Créer un événement</Button>
        </Card>
    );
  }

  const {
    total_earnings,
    total_interaction_earnings,
    total_interactions,
    total_vote_earnings,
    total_votes,
    total_raffle_earnings,
    total_raffle_participants,
    total_stand_earnings,
    total_stand_rentals,
    total_ticket_earnings,
    total_tickets_sold
  } = stats;

  const coinToFcfaRate = adminConfig?.coin_to_fcfa_rate || 10;
  const totalEarningsFcfa = (total_earnings || 0) * coinToFcfaRate;
  
  // Note: For interactions, the split is 1 coin for organizer, 1 for platform (50/50).
  // The view should ideally provide this breakdown. For now, we'll calculate it on the front-end for display.
  const interactionOrganizerShare = total_interaction_earnings || 0;
  const interactionPlatformShare = total_interaction_earnings || 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      
      <Card className="bg-gradient-to-br from-primary/80 to-primary/60 text-primary-foreground">
        <CardHeader>
          <CardTitle>Gains Totaux Disponibles</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold flex items-center">
            <Coins className="w-8 h-8 mr-3" /> {(total_earnings || 0).toLocaleString()} π
          </p>
          <p className="text-muted-foreground text-primary-foreground/80">≈ {totalEarningsFcfa.toLocaleString()} FCFA</p>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="glass-effect flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-pink-500/10">
                        <Heart className="h-6 w-6 text-pink-500" />
                    </div>
                    <CardTitle className="text-lg">Interactions (Événements Protégés)</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-grow space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total des interactions</p>
                  <p className="text-2xl font-bold">{(total_interactions || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gains Totaux (pièces)</p>
                  <p className="text-2xl font-bold text-primary">{interactionOrganizerShare.toLocaleString()} π</p>
                </div>
                <div className="text-xs text-muted-foreground pt-2 border-t border-border/20">
                  <p>Votre part (50%): <strong className="text-green-400">{interactionOrganizerShare} π</strong></p>
                  <p>Commission (50%): <strong className="text-red-400">{interactionPlatformShare} π</strong></p>
                </div>
              </CardContent>
          </Card>

          <EarningsBreakdownCard
              title="Votes"
              earnings={total_vote_earnings || 0}
              participants={total_votes || 0}
              icon={Vote}
              color="text-blue-500"
          />

          <EarningsBreakdownCard
              title="Billetterie"
              earnings={total_ticket_earnings || 0}
              participants={total_tickets_sold || 0}
              icon={Ticket}
              color="text-green-500"
          />

          <EarningsBreakdownCard
              title="Tombolas"
              earnings={total_raffle_earnings || 0}
              participants={total_raffle_participants || 0}
              icon={Percent}
              color="text-purple-500"
          />

          <EarningsBreakdownCard
              title="Locations de Stands"
              earnings={total_stand_earnings || 0}
              participants={total_stand_rentals || 0}
              icon={Building}
              color="text-orange-500"
          />
      </div>

    </motion.div>
  );
};

export default OrganizerDashboardTab;