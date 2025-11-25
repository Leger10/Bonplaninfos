// config/promotionalMessages.js
import { 
  Rocket, 
  Star, 
  TrendingUp, 
  Gift, 
  Zap, 
  Users, 
  Calendar, 
  MapPin, 
  Coins, 
  Heart, 
  Trophy, 
  Crown, 
  Megaphone, 
  BookOpen, 
  ShoppingCart, 
  Ticket, 
  Vote, 
  Store, 
  CreditCard, 
  Sparkles,
  Globe,
  Flag,
  Building,
  Award,
  Shield,
  BadgeCheck,
  Map,
  Target,
  Banknote,
  Calculator,
  BarChart3
} from 'lucide-react';

export const promotionalMessages = {
  // Page d'accueil - Messages généraux
  '/': [
    {
      icon: <Rocket className="w-6 h-6" />,
      title: "🚀 Créez & Gagnez !",
      description: "5 000 vues = 50 000 F CFA. Vos événements vous rapportent de l'argent !",
      button: "Commencer",
      color: "from-purple-500 to-pink-500",
      action: () => window.location.href = '/create-event',
      targetUserTypes: ['organizer', 'user', 'admin', 'super_admin']
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "📈 Viralisez = Argent !",
      description: "1 partage = 10 F CFA. Multipliez vos revenus automatiquement !",
      button: "Booster",
      color: "from-green-500 to-blue-500",
      action: () => window.location.href = '/boost',
      targetUserTypes: ['organizer', 'admin', 'super_admin']
    },
    {
      icon: <Coins className="w-6 h-6" />,
      title: "💰 Tout est monétisé !",
      description: "Vues, likes, partages = Argent. 10K interactions = 100K FCFA !",
      button: "Gagner",
      color: "from-yellow-500 to-orange-500",
      action: () => window.location.href = '/create-event',
      targetUserTypes: ['organizer', 'user', 'admin', 'super_admin']
    },
    {
      icon: <Calculator className="w-6 h-6" />,
      title: "🧮 Gains garantis !",
      description: "500 vues + 200 likes = 7 500 F CFA. Plus c'est populaire, plus vous gagnez !",
      button: "Calculer",
      color: "from-blue-500 to-cyan-500",
      action: () => window.location.href = '/create-event',
      targetUserTypes: ['organizer', 'admin', 'super_admin']
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "📊 Audience = Revenus",
      description: "1 000 followers = 10K-50K F CFA/événement. Développez votre communauté !",
      button: "Développer",
      color: "from-teal-500 to-green-500",
      action: () => window.location.href = '/boost',
      targetUserTypes: ['organizer', 'admin', 'super_admin']
    },
    {
      icon: <Star className="w-6 h-6" />,
      title: "⭐ Devenez une star !",
      description: "Vos événements vus par toute la ville. Montrez votre talent !",
      button: "Briller",
      color: "from-yellow-500 to-orange-500",
      action: () => window.location.href = '/create-event',
      targetUserTypes: ['organizer', 'user', 'admin', 'super_admin']
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "👥 Communauté = Pouvoir",
      description: "Rassemblez vos fans et créez des événements inoubliables !",
      button: "Rassembler",
      color: "from-blue-500 to-cyan-500",
      action: () => window.location.href = '/create-event',
      targetUserTypes: ['organizer', 'user', 'admin', 'super_admin']
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "🌍 Partenaire officiel",
      description: "Représentez BonPlanInfos. Revenus mensuels garantis !",
      button: "Devenir partenaire",
      color: "from-indigo-500 to-purple-500",
      action: () => window.location.href = '/partner-signup',
      targetUserTypes: ['organizer', 'admin', 'super_admin', 'user']
    }
  ],

  // Page de découverte
  '/discover': [
    {
      icon: <MapPin className="w-6 h-6" />,
      title: "🗺️ Découvrez l'inattendu",
      description: "Événements uniques près de chez vous. Soyez surpris !",
      button: "Explorer",
      color: "from-indigo-500 to-purple-500",
      action: () => window.location.href = '/events',
      targetUserTypes: ['user', 'organizer', 'admin', 'super_admin']
    },
    {
      icon: <Heart className="w-6 h-6" />,
      title: "❤️ Votre passion vous attend",
      description: "Des événements qui correspondent à vos passions. Trouvez-les !",
      button: "Découvrir",
      color: "from-pink-500 to-rose-500",
      action: () => window.location.href = '/events',
      targetUserTypes: ['user', 'organizer', 'admin', 'super_admin']
    }
  ],

  // Page des événements
  '/events': [
    {
      icon: <Calendar className="w-6 h-6" />,
      title: "📅 Ne manquez rien !",
      description: "Des centaines d'événements vous attendent. Inscrivez-vous !",
      button: "Voir tout",
      color: "from-teal-500 to-green-500",
      action: () => window.location.href = '/events',
      targetUserTypes: ['user', 'organizer', 'admin', 'super_admin']
    },
    {
      icon: <Trophy className="w-6 h-6" />,
      title: "🏆 Les plus populaires",
      description: "Découvrez les événements les plus appréciés. Inspirez-vous !",
      button: "Voir les tops",
      color: "from-amber-500 to-orange-500",
      action: () => window.location.href = '/events?filter=popular',
      targetUserTypes: ['user', 'organizer', 'admin', 'super_admin']
    }
  ],

  // Page de création d'événement
  '/create-event': [
    {
      icon: <Zap className="w-6 h-6" />,
      title: "⚡ Boostez votre événement !",
      description: "Donnez un coup de projecteur dès le départ. 10x plus de visibilité !",
      button: "Booster",
      color: "from-yellow-500 to-red-500",
      action: () => window.location.href = '/boost',
      targetUserTypes: ['organizer', 'admin', 'super_admin']
    },
    {
      icon: <Crown className="w-6 h-6" />,
      title: "👑 Devenez un pro",
      description: "Nos outils vous aident à créer des événements mémorables !",
      button: "Apprendre",
      color: "from-purple-500 to-indigo-500",
      action: () => window.location.href = '/how-it-works',
      targetUserTypes: ['organizer', 'admin', 'super_admin']
    }
  ],

  // Page de boosting
  '/boost': [
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "📈 5x plus de participants !",
      description: "Les événements boostés attirent 5x plus de monde. Statistiques réelles !",
      button: "Voir stats",
      color: "from-green-500 to-emerald-500",
      action: () => window.location.href = '/boost',
      targetUserTypes: ['organizer', 'admin', 'super_admin']
    },
    {
      icon: <Coins className="w-6 h-6" />,
      title: "💰 3x retour sur investissement",
      description: "Chaque pièce investie rapporte 3x en visibilité. Calculer votre ROI !",
      button: "Calculer ROI",
      color: "from-yellow-500 to-amber-500",
      action: () => window.location.href = '/boost',
      targetUserTypes: ['organizer', 'admin', 'super_admin']
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "🌍 Boostez votre carrière !",
      description: "Devenez partenaire. Revenus illimités avec notre licence !",
      button: "Devenir partenaire",
      color: "from-blue-500 to-cyan-500",
      action: () => window.location.href = '/partner-signup',
      targetUserTypes: ['organizer', 'admin', 'super_admin', 'user']
    }
  ],

  // Page du portefeuille
  '/wallet': [
    {
      icon: <Gift className="w-6 h-6" />,
      title: "🎁 Pièces gratuites !",
      description: "Gagnez des pièces en regardant des vidéos. Actions simples !",
      button: "Gagner",
      color: "from-red-500 to-pink-500",
      action: () => window.location.href = '/wallet',
      targetUserTypes: ['user', 'organizer', 'admin', 'super_admin']
    },
    {
      icon: <Star className="w-6 h-6" />,
      title: "⭐ Devenez premium",
      description: "Avantages exclusifs. Boostez gratuitement vos événements !",
      button: "Découvrir",
      color: "from-blue-500 to-cyan-500",
      action: () => window.location.href = '/pricing',
      targetUserTypes: ['user', 'organizer', 'admin', 'super_admin']
    },
    {
      icon: <Banknote className="w-6 h-6" />,
      title: "💵 200K FCFA/mois moyen",
      description: "Nos partenaires gagnent bien. Rejoignez le programme licence !",
      button: "Devenir partenaire",
      color: "from-green-500 to-teal-500",
      action: () => window.location.href = '/partner-signup',
      targetUserTypes: ['organizer', 'admin', 'super_admin', 'user']
    }
  ],

  // Page de profil
  '/profile': [
    {
      icon: <Rocket className="w-6 h-6" />,
      title: "🚀 Optimisez votre profil",
      description: "Profil complet = Plus de participants. Attirez votre audience !",
      button: "Optimiser",
      color: "from-purple-500 to-pink-500",
      action: () => window.location.href = '/profile',
      targetUserTypes: ['organizer', 'user', 'admin', 'super_admin']
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "👥 Développez votre réseau",
      description: "Connectez-vous avec d'autres passionnés. Créez ensemble !",
      button: "Réseauter",
      color: "from-green-500 to-teal-500",
      action: () => window.location.href = '/discover',
      targetUserTypes: ['organizer', 'user', 'admin', 'super_admin']
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "🌍 Partenaire certifié",
      description: "Votre profil a du potentiel ! Représentez BonPlanInfos.",
      button: "Postuler",
      color: "from-indigo-500 to-purple-500",
      action: () => window.location.href = '/partner-signup',
      targetUserTypes: ['organizer', 'admin', 'super_admin', 'user']
    }
  ],

  // Page Marketing
  '/marketing': [
    {
      icon: <Globe className="w-6 h-6" />,
      title: "🌍 Partenaire officiel",
      description: "Licence exclusive. Représentez-nous dans votre région !",
      button: "Postuler",
      color: "from-blue-500 to-indigo-500",
      action: () => window.location.href = '/partner-signup',
      targetUserTypes: ['organizer', 'admin', 'super_admin', 'user']
    },
    {
      icon: <Flag className="w-6 h-6" />,
      title: "🚩 Monopole territorial",
      description: "Soyez le seul représentant officiel. Zone exclusive !",
      button: "Voir zones",
      color: "from-red-500 to-orange-500",
      action: () => window.location.href = '/partner-signup',
      targetUserTypes: ['organizer', 'admin', 'super_admin', 'user']
    },
    {
      icon: <Banknote className="w-6 h-6" />,
      title: "💵 Revenus passifs",
      description: "Commissions sur événements + packs + boosting. Multiple revenus !",
      button: "Voir gains",
      color: "from-green-500 to-emerald-500",
      action: () => window.location.href = '/partner-signup',
      targetUserTypes: ['organizer', 'admin', 'super_admin', 'user']
    },
    {
      icon: <Building className="w-6 h-6" />,
      title: "🏢 Votre entreprise",
      description: "Construisez votre business sous marque reconnue. Formation incluse !",
      button: "Démarrer",
      color: "from-purple-500 to-pink-500",
      action: () => window.location.href = '/partner-signup',
      targetUserTypes: ['organizer', 'admin', 'super_admin', 'user']
    },
    {
      icon: <Award className="w-6 h-6" />,
      title: "🏆 30% commissions",
      description: "Niveau Diamond = 30% de commissions. Plus vous développez, plus vous gagnez !",
      button: "Voir niveaux",
      color: "from-yellow-500 to-amber-500",
      action: () => window.location.href = '/partner-signup',
      targetUserTypes: ['organizer', 'admin', 'super_admin', 'user']
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: "🎯 Marché africain",
      description: "1,3 milliard de personnes. Événementiel digital en explosion !",
      button: "Cibler",
      color: "from-orange-500 to-red-500",
      action: () => window.location.href = '/partner-signup',
      targetUserTypes: ['organizer', 'admin', 'super_admin', 'user']
    },
    {
      icon: <BadgeCheck className="w-6 h-6" />,
      title: "✅ Certifié officiel",
      description: "Statut partenaire certifié. Crédibilité et notoriété !",
      button: "Certifier",
      color: "from-green-500 to-teal-500",
      action: () => window.location.href = '/partner-signup',
      targetUserTypes: ['organizer', 'admin', 'super_admin', 'user']
    }
  ],

  // Page d'inscription partenaire
  '/partner-signup': [
    {
      icon: <Globe className="w-6 h-6" />,
      title: "🌍 Licence internationale",
      description: "Ambassadeur officiel. Droits territoriaux protégés !",
      button: "Demander licence",
      color: "from-blue-500 to-indigo-500",
      action: () => window.location.href = '/partner-signup',
      targetUserTypes: ['organizer', 'admin', 'super_admin', 'user']
    },
    {
      icon: <Banknote className="w-6 h-6" />,
      title: "💰 1M FCFA/mois possible",
      description: "Preuves de revenus disponibles. Modèle économique éprouvé !",
      button: "Voir preuves",
      color: "from-green-500 to-emerald-500",
      action: () => window.location.href = '/partner-signup',
      targetUserTypes: ['organizer', 'admin', 'super_admin', 'user']
    },
    {
      icon: <Award className="w-6 h-6" />,
      title: "🏆 Top partenaires >500K/mois",
      description: "Rejoignez le classement. Devenez la prochaine success story !",
      button: "Voir classement",
      color: "from-yellow-500 to-orange-500",
      action: () => window.location.href = '/partner-signup',
      targetUserTypes: ['organizer', 'admin', 'super_admin', 'user']
    },
    {
      icon: <Building className="w-6 h-6" />,
      title: "🏢 Franchise accessible",
      description: "Agence événementielle sous licence. Investissement raisonnable !",
      button: "Découvrir",
      color: "from-purple-500 to-indigo-500",
      action: () => window.location.href = '/partner-signup',
      targetUserTypes: ['organizer', 'admin', 'super_admin', 'user']
    }
  ],

  // Guide d'utilisation
  '/guide-utilisation': [
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: "📚 Devenez expert",
      description: "Maîtrisez toutes les fonctionnalités. Optimisez vos résultats !",
      button: "Apprendre",
      color: "from-green-500 to-emerald-500",
      action: () => window.location.href = '/guide-utilisation',
      targetUserTypes: ['user', 'organizer', 'admin', 'super_admin']
    },
    {
      icon: <Star className="w-6 h-6" />,
      title: "⭐ Astuces de pro",
      description: "Secrets pour événements à succès. Augmentez vos chances !",
      button: "Découvrir",
      color: "from-yellow-500 to-amber-500",
      action: () => window.location.href = '/guide-utilisation',
      targetUserTypes: ['organizer', 'admin', 'super_admin']
    }
  ],

  // Packs de pièces
  '/packs': [
    {
      icon: <ShoppingCart className="w-6 h-6" />,
      title: "🛒 -30% offre limitée !",
      description: "Économisez 30% sur les packs. Dernière chance !",
      button: "Profiter",
      color: "from-green-500 to-teal-500",
      action: () => window.location.href = '/packs',
      targetUserTypes: ['user', 'organizer', 'admin', 'super_admin']
    },
    {
      icon: <Gift className="w-6 h-6" />,
      title: "🎁 Pièces bonus offertes",
      description: "Achetez maintenant = Pièces bonus gratuites !",
      button: "Voir offres",
      color: "from-red-500 to-pink-500",
      action: () => window.location.href = '/packs',
      targetUserTypes: ['user', 'organizer', 'admin', 'super_admin']
    },
    {
      icon: <Coins className="w-6 h-6" />,
      title: "💰 Investissez = Succès",
      description: "Plus de pièces = Plus de visibilité. Multipliez votre audience !",
      button: "Acheter",
      color: "from-yellow-500 to-orange-500",
      action: () => window.location.href = '/packs',
      targetUserTypes: ['organizer', 'admin', 'super_admin']
    }
  ],

  // Création d'événements spécifiques
  '/create-simple-event': [
    {
      icon: <Zap className="w-6 h-6" />,
      title: "⚡ Simple & efficace",
      description: "Créez en 2 min. Formulaire simplifié pour débutants !",
      button: "Créer",
      color: "from-blue-500 to-cyan-500",
      action: () => window.location.href = '/create-simple-event',
      targetUserTypes: ['organizer', 'admin', 'super_admin']
    }
  ],

  '/create-raffle-event': [
    {
      icon: <Ticket className="w-6 h-6" />,
      title: "🎫 Tombola = Excitant !",
      description: "Générez un engouement fou. Lots attractifs !",
      button: "Lancer",
      color: "from-green-500 to-emerald-500",
      action: () => window.location.href = '/create-raffle-event',
      targetUserTypes: ['organizer', 'admin', 'super_admin']
    }
  ],

  '/create-voting-event': [
    {
      icon: <Vote className="w-6 h-6" />,
      title: "🗳️ Faites participer",
      description: "Interaction forte avec communauté. Engagement garanti !",
      button: "Créer vote",
      color: "from-blue-500 to-indigo-500",
      action: () => window.location.href = '/create-voting-event',
      targetUserTypes: ['organizer', 'admin', 'super_admin']
    }
  ],

  '/create-stand-event': [
    {
      icon: <Store className="w-6 h-6" />,
      title: "🏪 Stands = Revenus",
      description: "95% pour vous, 5% pour nous. Générez des revenus en ligne !",
      button: "Louer",
      color: "from-orange-500 to-amber-500",
      action: () => window.location.href = '/create-stand-event',
      targetUserTypes: ['organizer', 'admin', 'super_admin']
    }
  ],

  '/create-ticketing-event': [
    {
      icon: <Ticket className="w-6 h-6" />,
      title: "🎫 Billetterie = Ventes",
      description: "95% pour vous. Vendez en ligne facilement. Sécurisé !",
      button: "Vendre",
      color: "from-teal-500 to-green-500",
      action: () => window.location.href = '/create-ticketing-event',
      targetUserTypes: ['organizer', 'admin', 'super_admin']
    }
  ]
};

// Routes qui doivent afficher des bannières promotionnelles
export const promotionalRoutes = [
  '/',
  '/discover', 
  '/events',
  '/create-event',
  '/boost',
  '/wallet',
  '/profile',
  '/marketing',
  '/guide-utilisation',
  '/packs',
  '/create-simple-event',
  '/create-raffle-event',
  '/create-voting-event',
  '/create-stand-event',
  '/create-ticketing-event',
  '/partner-signup'
];