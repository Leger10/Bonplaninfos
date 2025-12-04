import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Trophy, Clock, Loader2, ArrowLeft, CalendarDays, Hourglass } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';

// Composant CountdownBadge
const CountdownBadge = ({ endDate }) => {
  const [timeRemaining, setTimeRemaining] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isEnded: false
  });

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const end = new Date(endDate);
      const now = new Date();
      const difference = end - now;

      if (difference <= 0) {
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isEnded: true
        };
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      return {
        days,
        hours,
        minutes,
        seconds,
        isEnded: false
      };
    };

    // Calcul initial
    setTimeRemaining(calculateTimeRemaining());

    // Mettre à jour toutes les secondes
    const timer = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate]);

  // Déterminer la couleur en fonction du temps restant
  const getBadgeColor = () => {
    if (timeRemaining.isEnded) return 'destructive'; // rouge
    if (timeRemaining.days < 1) return 'destructive'; // rouge pour moins d'un jour
    if (timeRemaining.days < 3) return 'warning'; // orange pour moins de 3 jours
    return 'success'; // vert pour plus de 3 jours
  };

  // Déterminer le variant du badge
  const getBadgeVariant = () => {
    if (timeRemaining.isEnded) return 'destructive';
    return 'outline';
  };

  // Format d'affichage
  const formatTime = () => {
    if (timeRemaining.isEnded) {
      return (
        <div className="flex items-center font-bold">
          <Clock className="w-3 h-3 mr-1" /> Terminé
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center">
        <div className="flex items-center mb-1">
          <Hourglass className="w-3 h-3 mr-1" />
          <span className="text-xs font-semibold">Temps restant</span>
        </div>
        <div className="grid grid-cols-4 gap-1 w-full">
          <div className="text-center">
            <div className="text-xs font-bold bg-background rounded py-0.5">{timeRemaining.days}</div>
            <div className="text-[10px] text-muted-foreground">J</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold bg-background rounded py-0.5">{timeRemaining.hours}</div>
            <div className="text-[10px] text-muted-foreground">H</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold bg-background rounded py-0.5">{timeRemaining.minutes}</div>
            <div className="text-[10px] text-muted-foreground">M</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-bold bg-background rounded py-0.5">{timeRemaining.seconds}</div>
            <div className="text-[10px] text-muted-foreground">S</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Badge 
      variant={getBadgeVariant()}
      className={`absolute top-3 right-3 px-3 py-2 min-w-[100px] ${
        timeRemaining.isEnded 
          ? 'bg-red-500 text-white border-red-600' 
          : timeRemaining.days < 1 
            ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-300 dark:border-red-700'
            : timeRemaining.days < 3
              ? 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900 dark:text-orange-300 dark:border-orange-700'
              : 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-700'
      }`}
    >
      {formatTime()}
    </Badge>
  );
};

// Composant ContestCard amélioré
const ContestCard = ({ contest, onClick }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [participantsCount, setParticipantsCount] = useState(null);

  useEffect(() => {
    // Récupérer le nombre de participants
    const fetchParticipantsCount = async () => {
      const { count, error } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('concours_id', contest.id);

      if (!error) {
        setParticipantsCount(count);
      }
    };

    fetchParticipantsCount();
  }, [contest.id]);

  const formatNumber = (num) => {
    if (!num && num !== 0) return '...';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const publicUrl = contest.primary_media_url
    ? contest.primary_media_url
    : "https://images.unsplash.com/photo-1583795235849-913535366623?auto=format&fit=crop&w=400&h=200&q=75";

  return (
    <motion.div
      onClick={onClick}
      className="cursor-pointer h-full"
      whileHover={{ y: -5 }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="h-full flex flex-col bg-card border-border overflow-hidden hover:border-primary transition-all shadow-lg hover:shadow-xl group">
        <div className="relative h-40 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent z-10" />
          {!imageLoaded && (
            <div className="absolute inset-0 bg-muted animate-pulse" />
          )}
          <img
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            alt={`Aperçu pour ${contest.title}`}
            src={publicUrl}
            onLoad={() => setImageLoaded(true)}
            loading="lazy"
          />
          
          {/* Compte à rebours */}
          <CountdownBadge endDate={contest.end_date} />
          
          {/* Badge catégorie */}
          {contest.category && (
            <Badge 
              variant="secondary" 
              className="absolute top-3 left-3 bg-black/60 text-white border-none backdrop-blur-sm"
            >
              {contest.category}
            </Badge>
          )}
        </div>
        
        <CardContent className="p-4 flex-grow flex flex-col">
          <h3 className="font-bold text-lg text-foreground line-clamp-2 font-heading mb-2 group-hover:text-primary transition-colors">
            {contest.title}
          </h3>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-grow">
            {contest.description || 'Participez à ce concours passionnant !'}
          </p>
          
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center text-muted-foreground">
              <CalendarDays className="w-4 h-4 mr-2 text-primary" />
              <span className="text-sm">
                Jusqu'au {new Date(contest.end_date).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center bg-muted px-2 py-1 rounded-full">
                <Trophy className="w-3 h-3 mr-1 text-yellow-500" />
                <span className="text-xs font-medium">
                  {formatNumber(participantsCount)} participants
                </span>
              </div>
            </div>
          </div>
          
          {/* Barre de progression du temps */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Début: {new Date(contest.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
              <span>Fin: {new Date(contest.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div 
                className="bg-primary rounded-full h-1.5 transition-all duration-300"
                style={{
                  width: `${Math.min(
                    ((new Date() - new Date(contest.start_date)) / 
                    (new Date(contest.end_date) - new Date(contest.start_date))) * 100, 100
                  )}%`
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Composant principal
const ContestsPage = () => {
  const navigate = useNavigate();
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'upcoming', 'ended'

  useEffect(() => {
    const fetchContests = async () => {
      setLoading(true);
      
      let query = supabase
        .from('concours') // Changé de 'contests' à 'concours' pour correspondre à votre schéma SQL
        .select('*')
        .order('end_date', { ascending: true });

      // Appliquer le filtre
      if (filter === 'active') {
        query = query.eq('statut', 'actif');
      } else if (filter === 'upcoming') {
        query = query.eq('statut', 'a_venir');
      } else if (filter === 'ended') {
        query = query.eq('statut', 'termine');
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching contests:", error);
      } else {
        setContests(data);
      }
      setLoading(false);
    };
    
    fetchContests();
    
    // Rafraîchir toutes les minutes pour mettre à jour les compteurs
    const refreshInterval = setInterval(fetchContests, 60000);
    
    return () => clearInterval(refreshInterval);
  }, [filter]);

  const getActiveContests = () => {
    return contests.filter(contest => 
      contest.statut === 'actif' && new Date(contest.end_date) > new Date()
    );
  };

  const getEndedContests = () => {
    return contests.filter(contest => 
      contest.statut === 'termine' || new Date(contest.end_date) <= new Date()
    );
  };

  const getUpcomingContests = () => {
    return contests.filter(contest => 
      contest.statut === 'a_venir' && new Date(contest.start_date) > new Date()
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <Helmet>
        <title>Concours - BonPlaninfos</title>
        <meta name="description" content="Participez aux concours et votez pour vos favoris." />
      </Helmet>

      <main className="container mx-auto px-4 pt-8 pb-24">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div className="flex items-center">
              <Button variant="ghost" size="icon" className="mr-2" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground flex items-center">
                  <Trophy className="w-8 h-8 mr-3 text-primary" />
                  Concours & Votes
                </h1>
                <p className="text-muted-foreground mt-1">
                  Participez aux concours en cours et votez pour vos favoris
                </p>
              </div>
            </div>
          </div>

          {/* Filtres */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              Tous les concours ({contests.length})
            </Button>
            <Button
              variant={filter === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('active')}
              className="border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800"
            >
              Actifs ({getActiveContests().length})
            </Button>
            <Button
              variant={filter === 'upcoming' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('upcoming')}
              className="border-blue-300 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
            >
              À venir ({getUpcomingContests().length})
            </Button>
            <Button
              variant={filter === 'ended' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('ended')}
              className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
            >
              Terminés ({getEndedContests().length})
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {loading ? (
            <div className="flex flex-col justify-center items-center h-64">
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Chargement des concours...</p>
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
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16 bg-gradient-to-br from-card to-secondary/50 rounded-2xl border shadow-lg"
            >
              <Trophy className="w-24 h-24 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold text-foreground mb-3">
                Aucun concours disponible
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                {filter === 'active' 
                  ? "Il n'y a actuellement aucun concours actif. Revenez bientôt !"
                  : filter === 'ended'
                  ? "Aucun concours n'est terminé pour le moment."
                  : filter === 'upcoming'
                  ? "Aucun concours à venir pour le moment."
                  : "Aucun concours n'a été créé pour le moment."}
              </p>
              {filter !== 'all' && (
                <Button onClick={() => setFilter('all')}>
                  Voir tous les concours
                </Button>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* Statistiques globales */}
        {contests.length > 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-12 p-6 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-2xl border"
          >
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Trophy className="w-6 h-6 mr-2" />
              Statistiques des concours
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-background p-4 rounded-xl border text-center">
                <div className="text-2xl font-bold text-primary">{contests.length}</div>
                <div className="text-sm text-muted-foreground">Concours créés</div>
              </div>
              <div className="bg-background p-4 rounded-xl border text-center">
                <div className="text-2xl font-bold text-green-600">{getActiveContests().length}</div>
                <div className="text-sm text-muted-foreground">Concours actifs</div>
              </div>
              <div className="bg-background p-4 rounded-xl border text-center">
                <div className="text-2xl font-bold text-blue-600">{getUpcomingContests().length}</div>
                <div className="text-sm text-muted-foreground">À venir</div>
              </div>
              <div className="bg-background p-4 rounded-xl border text-center">
                <div className="text-2xl font-bold text-red-600">{getEndedContests().length}</div>
                <div className="text-sm text-muted-foreground">Terminés</div>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default ContestsPage;