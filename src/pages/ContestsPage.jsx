import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Trophy, Clock, Loader2, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';

const ContestCard = ({ contest, onClick }) => {
  const publicUrl = contest.primary_media_url
    ? contest.primary_media_url
    : "https://images.unsplash.com/photo-1583795235849-913535366623?auto=format&fit=crop&w=400&h=200&q=75";

  const getTimeRemaining = () => {
    const endDate = new Date(contest.event_end_at);
    const now = new Date();
    const diff = endDate - now;

    if (diff <= 0) return "Terminé";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);

    return `${days}j ${hours}h restantes`;
  };

  return (
    <motion.div
      onClick={onClick}
      className="cursor-pointer h-full"
      whileHover={{ y: -5 }}
    >
      <Card className="h-full flex flex-col bg-card border-border overflow-hidden hover:border-primary transition-all shadow-lg">
        <div className="relative">
          <img
            class="w-full h-40 object-cover"
            alt={`Aperçu pour ${contest.title}`}
            src="https://images.unsplash.com/photo-1535281047371-e7d8b0e96d7f" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <Badge variant="secondary" className="absolute top-3 right-3 bg-primary text-primary-foreground">
            <Clock className="w-3 h-3 mr-1" /> {getTimeRemaining()}
          </Badge>
        </div>
        <CardContent className="p-4 flex-grow flex flex-col justify-between">
          <h3 className="font-bold text-lg text-foreground line-clamp-2 font-heading">
            {contest.title}
          </h3>
          <div className="flex items-center text-muted-foreground text-sm mt-2">
            <Trophy className="w-4 h-4 mr-2 text-primary" />
            {contest.category || 'Concours'}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const ContestsPage = () => {
  const navigate = useNavigate();
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContests = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .eq('is_active', true)
        .order('event_end_at', { ascending: true });

      if (error) {
        console.error("Error fetching contests:", error);
      } else {
        setContests(data);
      }
      setLoading(false);
    };
    fetchContests();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Concours - BonPlaninfos</title>
        <meta name="description" content="Participez aux concours et votez pour vos favoris." />
      </Helmet>

      <main className="container mx-auto px-4 pt-8 pb-24">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="mr-2" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold text-foreground flex items-center">
              <Trophy className="w-8 h-8 mr-3 text-primary" />
              Concours
            </h1>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
          ) : contests.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {contests.map((contest) => (
                <ContestCard
                  key={contest.id}
                  contest={contest}
                  onClick={() => navigate(`/contest/${contest.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Trophy className="w-24 h-24 text-muted-foreground/20 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-muted-foreground mb-2">
                Aucun concours pour le moment
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Revenez bientôt pour découvrir de nouveaux concours passionnants.
              </p>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default ContestsPage;