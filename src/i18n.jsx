import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const resources = {
  fr: {
    translation: {
      // ===== NAVIGATION =====
      nav: {
        home: "Accueil",
        discover: "Découvrir",
        events: "Événements",
        partnership: "Partenariat",
        profile: "Profil",
        wallet: "Portefeuille",
        create_event: "Créer un Événement",
        logout: "Déconnexion",
        notifications: "Notifications",
      },
en: {
    translation: {
      // ===== NAVIGATION =====
      nav: {
        home: "Home",
        discover: "Discover",
        events: "Events",
        partnership: "Partnership",
        profile: "Profile",
        wallet: "Wallet",
        create_event: "Create Event",
        logout: "Logout",
        notifications: "Notifications",
          }
            }
      },

      Theme: "Theme",            // AJOUT
      Language: "Language" , 
      // ===== AUTHENTIFICATION =====
      auth: {
        fetch_error: {
          title: "Erreur de Connexion",
          description:
            "Impossible de récupérer les données. Veuillez vérifier votre connexion internet et rafraîchir la page.",
        },
        login: {
          meta_title: "Connexion",
          meta_description: "Connectez-vous à votre compte BonPlanInfos.",
          title: "Connexion",
          subtitle: "Connectez-vous pour continuer.",
          button: "Se connecter",
          switch_text: "Pas encore de compte ?",
          switch_button: "S'inscrire ici",
          error_invalid_credentials: "Email ou mot de passe incorrect.",
        },
        register: {
          meta_title: "Inscription",
          meta_description:
            "Créez un compte sur BonPlanInfos et commencez à découvrir les meilleurs plans.",
          title: "S'inscrire",
          subtitle: "Créez votre compte.",
          button: "S'inscrire",
          country_city_required: "Veuillez sélectionner un pays et une ville.",
          switch_text: "Déjà un compte ?",
          switch_button: "Connectez-vous ici",
          confirmation_email_title: "Vérifiez vos emails !",
          confirmation_email_description:
            "Nous vous avons envoyé un email de confirmation. Veuillez consulter votre boîte de réception et cliquer sur le lien pour activer votre compte.",
          terms_agreement:
            "J'accepte les <1>Conditions Générales d'Utilisation</1>",
          terms_required: "Vous devez accepter les conditions d'utilisation.",
        },
        full_name: "Nom complet",
        country: "Pays",
        select_country_placeholder: "Sélectionnez votre pays",
        city: "Ville",
        select_city_placeholder: "Sélectionnez votre ville",
        choose_role: "Vous êtes ?",
        choose_role_placeholder: "Choisissez votre rôle",
        role_user: "Utilisateur",
        role_organizer: "Organisateur",
        email: "Email",
        password: "Mot de passe",
        referral_code_optional: "Code de parrainage (Optionnel)",
      },

      // ===== PAGES PRINCIPALES =====
      home: "Accueil",
      events: "Événements",
      contests: "Concours",
      discover: "Découvrir",
      login: "Connexion",
      logout: "Déconnexion",
      profile: "Profil",
      wallet: "Portefeuille",
      settings: "Paramètres",

      // ===== HOME PAGE =====
      home_page: {
        sponsored_events: "Événements Sponsorisés",
        boost_event: "Booster un événement",
        explore_by_type: {
          title: "Explorer par Type d'Événement",
          subtitle: "Trouvez l'expérience qui vous convient.",
        },
        event_types: {
          standard: "Standard",
          ticketing: "Billetterie",
          raffles: "Tombolas",
          voting: "Votes",
          stands: "Stands",
        },
        no_sponsored_events: {
          title: "Aucun Événement Sponsorisé Actuellement",
          description:
            "Soyez le premier à promouvoir un événement et à toucher un public plus large.",
          button: "Booster un Événement",
        },
        view_all_events: "Voir tous les événements",
        loading_error: {
          title: "Erreur de Chargement des Données",
          description:
            "Nous n'avons pas pu charger les données nécessaires. Veuillez vérifier votre connexion et réessayer.",
          retry: "Réessayer",
        },
      },

      // ===== EVENTS PAGE =====
      events_page: {
        title: "Explorer les Événements",
        subtitle: "Découvrez ce qui se passe près de chez vous et au-delà.",
        search_placeholder: "Rechercher par nom, ville, catégorie...",
        filters: "Filtres",
        quick_filters: {
          trending: "Tendances",
          popular_by_category: "Populaires par catégorie",
          free_weekend: "Gratuits ce week-end",
          ending_soon: "Bientôt terminés",
        },
        event_types: "Types d'événement",
        categories: "Catégories",
        countries: "Pays",
        cities: "Villes",
        reset: "Réinitialiser",
        no_events_found: {
          title: "Aucun événement trouvé",
          description:
            "Essayez d'ajuster vos filtres de recherche ou d'élargir votre zone de recherche.",
          reset_button: "Réinitialiser les filtres",
        },
        unlock_modal: {
          title: "Débloquer cet Événement",
          description:
            'Pour voir les détails de "{{title}}", un coût de {{cost}}π (environ {{costFcfa}} FCFA) sera déduit de votre solde.',
          info: "Cette action est unique. Une fois débloqué, vous aurez un accès permanent à cet événement.",
          cancel: "Annuler",
          confirm: "Confirmer et Débloquer",
          success_title: "Accès débloqué!",
          success_desc:
            'Vous pouvez maintenant voir les détails de "{{title}}".',
        },
      },

      // ===== PROFILE PAGE =====
      profile_page: {
        helmet_title: "Profil de {{name}}",
        helmet_desc:
          "Gérez votre profil, vos événements et vos transactions sur BonPlanInfos.",
        unauthorized_title: "Accès Refusé",
        unauthorized_desc: "Vous devez être connecté pour voir votre profil.",
        go_to_login: "Aller à la page de connexion",
        connection_failed_title: "Échec de la Connexion",
        connection_failed_desc:
          "Nous n'avons pas pu charger votre profil. Veuillez réessayer de vous connecter.",
        loading_error_title: "Erreur de Chargement des Données",
        loading_error_desc:
          "Nous n'avons pas pu charger toutes les données de votre profil. Certaines informations peuvent être manquantes.",
      },

      // ===== WALLET PAGE =====
      wallet_page: {
        title: "Mon Portefeuille",
        total_balance: "Solde Total de Pièces",
        free_coins: "Pièces Gratuites",
        paid_coins: "Pièces Achetées",
        available_earnings: "Gains Disponibles (Pièces)",
        earnings_in_fcfa: "≈ {{amount}} FCFA",
        buy_coins_title: "Acheter des pièces",
        buy_coins_desc: "Rechargez votre solde pour ne rien manquer !",
        buy_coins_button: "Voir les packs",
        balance_details_title: "Détails du Solde de Pièces",
        free_coins_desc:
          "Les pièces gratuites sont utilisées en priorité pour les interactions. Les pièces achetées sont utilisées ensuite et une partie est reversée aux organisateurs.",
        withdrawal_title: "Retrait des Gains",
        withdrawal_desc: "Convertissez vos gains en argent réel.",
        request_withdrawal_button: "Demander un retrait",
        withdrawal_minimum: "Minimum pour un retrait : {{amount}} pièces.",
      },

      // ===== DASHBOARDS =====
      admin_dashboard: "Tableau de bord Admin",
      secretary_dashboard: "Tableau de bord Secrétaire",

      admin_dashboard: {
        unauthorized_title: "Accès non autorisé",
        unauthorized_desc:
          "Vous n'avez pas les permissions nécessaires pour accéder à cette page.",
        loading_error_title: "Erreur de chargement",
        super_admin_title: "Tableau de bord Super Administrateur",
        admin_title: "Tableau de bord Admin - {{country}}",
        secretary_title: "Tableau de bord Secrétaire",
        welcome: "Bienvenue, {{name}}",
        tabs: {
          analytics: "Analyses",
          users: "Utilisateurs",
          secretaries: "Secrétaires",
          config: "Configuration",
          videos: "Vidéos",
          partners: "Partenaires",
          withdrawals: "Retraits",
          salary_withdrawals: "Retraits Salaires",
          withdrawal_history: "Historique Retraits",
          announcements: "Annonces",
          events: "Événements",
          promotions: "Promotions",
          popups: "Popups",
          credits: "Crédits",
          credit_management: "Gestion Crédits",
          reversed_credits: "Crédits Annulés",
          transactions: "Transactions",
          activity_log: "Activités",
          payments: "Paiements",
          locations: "Lieux",
          badges: "Badges",
          credit_stats: "Stats Crédits",
          salary: "Mon Salaire",
          credits_history: "Historique Crédits",
        },
        stats: {
          error_title: "Erreur de statistiques",
          revenue_title: "Revenus (Crédits Manuels)",
        },
        license: {
          partner_error_title: "Erreur de chargement du partenaire",
          status_title: "Statut de la licence",
          status_active: "Active",
          status_expired: "Expirée",
          activated_on: "Activée le",
          expires_on: "Expire le",
          expired_since: "Expirée depuis {{count}} jours",
          days_remaining: "jours restants",
          renew_button: "Demander le renouvellement",
          confirm_renewal_title: "Confirmer la demande de renouvellement ?",
          confirm_renewal_desc:
            "Une notification sera envoyée au super administrateur pour examiner votre demande de renouvellement de licence.",
          renewal_sent_title: "Demande envoyée",
          renewal_sent_desc:
            "Votre demande de renouvellement a été envoyée avec succès.",
          renewal_error_desc:
            "Erreur lors de l'envoi de la demande de renouvellement : ",
        },
        banner: {
          pending:
            "Votre compte admin est en attente de vérification. Certaines fonctionnalités peuvent être limitées.",
          suspended:
            "Votre compte admin a été suspendu. Veuillez contacter le support.",
          expired:
            "Votre licence a expiré. Veuillez la renouveler pour restaurer l'accès complet.",
        },
        salary_dashboard: {
          title: "Tableau de Bord de Salaire",
          current_month_revenue: "Revenu de la zone (Mois en cours)",
          personal_score: "Score Personnel",
          projected_salary: "Salaire Projeté (Mois en cours)",
          request_withdrawal: "Demander un Retrait",
          history_title: "Historique des Salaires",
          month: "Mois",
          revenue: "Revenu Zone",
          license_rate: "Taux Licence",
          score: "Score",
          salary: "Salaire Final",
          status: "Statut",
          paid: "Payé",
          unpaid: "Non Payé",
        },
        withdrawal_form: {
          title: "Demande de Retrait de Salaire",
          description:
            "Soumettez une demande pour retirer votre salaire disponible.",
          available_salary: "Salaire disponible pour le retrait",
          amount_to_withdraw: "Montant",
          withdrawal_method: "Méthode",
          select_method: "Sélectionner une méthode",
          bank_name: "Nom de la banque",
          account_holder: "Titulaire du compte",
          account_number: "Numéro de compte",
          mobile_money_operator: "Opérateur",
          phone_number: "Numéro de téléphone",
          reason: "Raison (Optionnel)",
          submit: "Soumettre la demande",
        },
      },

      secretary_dashboard: {
        title: "Tableau de bord Secrétaire",
        welcome: "Bienvenue, {{name}}",
        competence_zone: "Zone de compétence : {{city}}, {{country}}",
        tabs: {
          user_management: "Gestion Utilisateurs",
          event_management: "Gestion Événements",
          location_management: "Gestion Lieux",
          credit_management: "Gestion Crédits",
          reversed_credits: "Crédits Annulés",
          withdrawal_management: "Gestion Retraits",
          withdrawal_history: "Historique Retraits",
          event_moderation: "Modération Événements & Lieux",
        },
        credit_form: {
          title: "Créditer un utilisateur",
          search_user_label: "Rechercher un utilisateur",
          search_user_placeholder: "Nom ou email...",
          user_label: "Utilisateur",
          select_user_placeholder: "Sélectionner un utilisateur",
          amount_label: "Montant (pièces)",
          amount_placeholder: "ex: 100",
          reason_label: "Raison (optionnel)",
          reason_placeholder: "ex: Récompense",
          submit_button: "Créditer l'utilisateur",
        },
        event_moderation: {
          title: "Modération des Événements",
          zone_country: "Zone: {{country}}",
          filter_all: "Tous",
          filter_active: "Actifs",
          filter_inactive: "Inactifs",
          credit_participants_button: "Créditer Participants",
          confirm_delete_title: "Êtes-vous sûr ?",
          confirm_delete_desc:
            "Cette action est irréversible. L'événement et toutes ses données associées (tickets, votes, etc.) seront définitivement supprimés.",
          event_deleted_success: "Événement supprimé avec succès.",
          event_deleted_error: "Impossible de supprimer l'événement.",
          status_updated_success: "Statut de l'événement mis à jour.",
          status_updated_error: "Impossible de mettre à jour le statut.",
          credit_user_for_event_title:
            "Créditer pour l'événement : {{eventName}}",
          credit_user_for_event_desc:
            "Sélectionnez un utilisateur de votre zone pour lui attribuer des pièces pour sa participation.",
          user_search_placeholder: "Rechercher par nom ou email...",
          credit_amount_label: "Montant (pièces)",
          credit_reason_label: "Raison du crédit",
          credit_reason_placeholder:
            "Participation à l'événement : {{eventName}}",
          no_users_found: "Aucun utilisateur trouvé dans votre zone.",
          credit_success_message:
            "{{userName}} a été crédité de {{amount}} pièces.",
          credit_error_generic: "Une erreur est survenue lors du crédit.",
        },
      },

      // ===== ACTIONS & BOUTONS =====
      confirm_logout: "Voulez-vous vraiment vous déconnecter ?",
      cancel: "Annuler",
      confirm: "Confirmer",
      back_home: "Retour à l'accueil",

      // ===== ERREURS =====
      not_found_title: "Page non trouvée",
      not_found_message: "Désolé, la page que vous recherchez n'existe pas.",

      // ===== FORMULAIRES =====
      email_label: "Adresse e-mail",
      password_label: "Mot de passe",
      full_name_label: "Nom complet",
      phone_label: "Numéro de téléphone",
      username_label: "Nom d'utilisateur",
      country_label: "Pays",
      city_label: "Ville",
      referral_code_label: "Code de parrainage (facultatif)",

      // ===== AUTH TABS =====
      login_tab: "Se connecter",
      register_tab: "S'inscrire",
      login_magic_link_tab: "Lien magique",
      send_magic_link: "Envoyer le lien magique",
      or_continue_with: "Ou continuer avec",
      forgot_password: "Mot de passe oublié ?",

      // ===== LANDING PAGE =====
      landing: {
        title: "Votre Portail pour les Meilleurs Plans",
        subtitle:
          "Découvrez, participez et organisez des événements, concours, et plus encore. Le tout, en un seul endroit.",
        search_placeholder: "Recherchez un événement, un lieu...",
        search_button: "Rechercher",
        create_event_button: "Créer un Événement",
        discover_events_button: "Découvrir les Événements",
        featured_title: "Événements à ne pas manquer",
        featured_subtitle:
          "Participez aux événements les plus populaires et vivez des moments inoubliables.",
        categories_title: "Explorez par Catégories",
        categories_subtitle:
          "Trouvez des événements qui correspondent à vos centres d'intérêt.",
        how_it_works_title: "Comment ça marche ?",
        how_it_works_step1_title: "Découvrez",
        how_it_works_step1_desc:
          "Explorez une multitude d'événements, de concours et de lieux.",
        how_it_works_step2_title: "Participez",
        how_it_works_step2_desc:
          "Achetez des billets, votez pour vos candidats favoris, et bien plus.",
        how_it_works_step3_title: "Gagnez & Profitez",
        how_it_works_step3_desc:
          "Gagnez des récompenses, remportez des concours et vivez des expériences uniques.",
        how_it_works_step4_title: "Organisez",
        how_it_works_step4_desc:
          "Créez et gérez vos propres événements en toute simplicité.",
        cta_title: "Prêt à commencer l'aventure ?",
        cta_subtitle:
          "Rejoignez notre communauté dès aujourd'hui et ne manquez plus aucun bon plan.",
        cta_button: "Inscrivez-vous Gratuitement",
      },

      // ===== FOOTER =====
      footer: {
        home: "Accueil",
        about: "À propos",
        partnership: "Partenariat",
        sponsors: "Sponsors",
        privacy: "Politique de confidentialité",
        terms: "Conditions d'utilisation",
        contact: "Contact",
        tagline:
          "Votre guide ultime pour les meilleurs événements et divertissements.",
        platform: "Plateforme",
        company: "Entreprise",
        legal: "Légal",
        how_it_works: "Comment ça marche ?",
        help: "Centre d'aide",
        faq: "FAQ",
        data_protection: "Protection des données",
        legal_mentions: "Mentions légales",
      },





      
data_protection: {
  meta_title: "Protection des Données Personnelles",
  meta_description: "Politique de protection des données personnelles de BonPlanInfos. Conforme aux réglementations africaines sur la protection des données.",
  title: "Protection des Données Personnelles",
  subtitle: "Notre engagement pour la protection de vos données en Afrique",
africa_compliance: "Nos pratiques de protection des données respectent les réglementations nationales dans tous les pays d'opération en Afrique de l'Ouest (Côte d'Ivoire, Burkina Faso, Sénégal, Mali, Bénin, Ghana, Nigeria), Afrique Centrale (Cameroun, Gabon), Afrique du Nord (Tunisie, Maroc) et Afrique Australe (Afrique du Sud), en suivant à la fois les lois locales et les standards de l'Union Africaine.",
  contact_title: "Contact Délégué à la Protection des Données",
  
  commitment: {
    title: "Notre Engagement",
    content: "BonPlanInfos s'engage à protéger vos données personnelles conformément aux lois africaines sur la protection des données. Nous mettons en œuvre des mesures techniques et organisationnelles robustes pour assurer la sécurité et la confidentialité de vos informations."
  },
  
  dpo: {
    title: "Délégué à la Protection des Données",
    content: "Notre Délégué à la Protection des Données (DPD) veille au respect des obligations légales et réglementaires concernant la protection des données personnelles dans tous les pays africains où nous opérons."
  },
  
  data_collected: {
    title: "Données Collectées",
    content: "Nous collectons uniquement les données nécessaires au bon fonctionnement de nos services événementiels :",
    list: [
      "Informations de profil : nom, prénom, email, téléphone",
      "Données de transaction : historiques d'achats de billets",
      "Données d'utilisation : préférences événementielles, interactions avec la plateforme",
      "Données techniques : adresse IP, type d'appareil, cookies essentiels",
      "Données de localisation : pays et ville pour personnaliser les événements"
    ]
  },
  
  usage: {
    title: "Utilisation des Données",
    content: "Vos données sont utilisées dans le strict respect des finalités suivantes :",
    list: [
      "Gestion des inscriptions et participations aux événements",
      "Traitement sécurisé des paiements de billets",
      "Envoi de confirmations et informations événementielles",
      "Amélioration de l'expérience utilisateur sur notre plateforme",
      "Conformité avec les obligations légales africaines",
      "Personnalisation des recommandations d'événements par pays"
    ]
  },
  
  sharing: {
    title: "Partage des Données",
    content: "Nous ne partageons vos données qu'avec :",
    list: [
      "Prestataires de paiement certifiés (MoneyFusion, PayPal, Mobile Money, Orange Money, MTN Mobile Money, Moov Money, Wave, etc.)",
      "Organisateurs d'événements (uniquement les données nécessaires à la gestion de leur événement)",
      "Autorités légales (sur demande formelle conforme aux lois locales)",
      "Partenaires techniques sous contrat de confidentialité strict"
    ]
  },
  
  security: {
    title: "Sécurité des Données",
    content: "Nous mettons en œuvre des mesures de sécurité avancées conformes aux standards africains :",
    list: [
      "Chiffrement SSL/TLS pour toutes les transmissions de données",
      "Stockage sécurisé avec préférence pour les serveurs localisés en Afrique",
      "Contrôles d'accès stricts et authentification multi-facteurs",
      "Audits réguliers de sécurité conformes aux lois locales",
      "Sauvegardes cryptées et plans de reprise d'activité"
    ]
  },
  
  retention: {
    title: "Conservation des Données",
    content: "Vos données sont conservées pour des durées limitées conformément aux lois de chaque pays :",
    list: [
      "Données de compte : 3 ans après dernière activité",
      "Données transactionnelles : 5 à 10 ans selon les obligations légales locales",
      "Données de navigation : 13 mois maximum",
      "Données des événements : 2 ans après la fin de l'événement",
      "Données marketing : 3 ans après dernier contact"
    ]
  },
  
  hosting: {
    title: "Hébergement des Données",
    content: "Vos données sont principalement hébergées sur des serveurs sécurisés. Nous privilégions les solutions d'hébergement en Afrique lorsque cela est possible, tout en garantissant la même qualité de service et de sécurité. Nos infrastructures respectent les exigences de souveraineté numérique des pays où nous opérons."
  },
  
  deletion: {
    title: "Droit à l'Effacement",
    content: "Conformément aux lois africaines sur la protection des données, vous avez le droit de demander la suppression de vos données personnelles. Contactez notre DPD à support@bonplaninfos.net pour toute demande d'effacement. Nous nous engageons à répondre dans les délais légaux de chaque pays."
  },
  
  last_updated: "Dernière mise à jour : Novembre 2025"
},




      // ===== MARKETING =====
      marketing: {
        badge: "Pour les Organisateurs & Créateurs",
        title: "Donnez une Nouvelle Dimension à Vos Événements",
        subtitle:
          "Atteignez une audience plus large, interagissez avec votre communauté et monétisez votre contenu comme jamais auparavant. BonPlanInfos est la plateforme tout-en-un pour des événements réussis.",
        createEventCta: "Créer mon événement maintenant",
        becomePartnerCta: "Devenir Partenaire",
        trust: "Reconnu par des centaines d'organisateurs en Afrique.",
        why: {
          title: "Pourquoi choisir BonPlanInfos ?",
          subtitle:
            "Nous vous donnons les outils pour faire de chaque événement un succès retentissant.",
          feature1: "Visibilité Maximale",
          feature1_desc:
            "Profitez de notre large audience pour promouvoir vos événements et atteindre des milliers de participants potentiels.",
          feature2: "Monétisation Facile",
          feature2_desc:
            "Vente de billets, votes payants, tombolas, stands... Diversifiez vos sources de revenus en quelques clics.",
          feature3: "Interaction & Engagement",
          feature3_desc:
            "Créez un lien fort avec votre communauté grâce à nos outils d'interaction : commentaires, partages, et réactions.",
          feature4: "Statistiques en Temps Réel",
          feature4_desc:
            "Suivez la performance de vos événements avec des données précises pour optimiser vos stratégies.",
          feature5: "Sécurité & Fiabilité",
          feature5_desc:
            "Une plateforme robuste et sécurisée pour gérer vos transactions et les données de vos participants.",
          feature6: "Support Dédié",
          feature6_desc:
            "Notre équipe est à votre écoute pour vous accompagner à chaque étape de votre organisation.",
        },
        revenue_simulation: {
          title: "Imaginez Vos Revenus Mensuels Potentiels...",
          subtitle:
            "Chaque interaction sur votre contenu génère des pièces, convertibles en argent réel. Voici une simulation simple basée sur des événements populaires.",
          summary_title: "Résumé Mensuel (Simulation)",
          total_interactions: "Interactions Totales",
          revenue_coins: "Revenus en Pièces",
          revenue_fcfa: "Revenus en FCFA",
          miss_ci: "Concours Miss Côte d'Ivoire",
          music_festival: "Festival de Musique Urbaine",
          football_tournament: "Tournoi de Foot Inter-quartiers",
          entrepreneur_conf: "Conférence sur l'Entrepreneuriat",
          shares: "Partages",
          downloads: "Téléchargements",
          views: "Vues",
          comments: "Commentaires",
          reactions: "Réactions",
          total_revenue: "Revenu Total",
          interactions: "Interactions",
          how_it_works_title: "Comment ça marche ?",
          organizer: "Organisateur",
          user: "Utilisateur",
          easy_withdrawal: "Retrait facile",
          from_50_pi: "Dès 50π",
          ready_cta_title: "Prêt à transformer vos idées en succès ?",
          ready_cta_subtitle:
            "Rejoignez des milliers d'organisateurs qui nous font confiance.",
          cta_button: "Lancer mon premier événement",
        },
       testimonials: {
  title: "Ils nous font confiance",
  subtitle: "Découvrez les retours d'expérience de nos utilisateurs satisfaits",
  play: "Lecture",
  pause: "Pause",
  previous: "Précédent",
  next: "Suivant",
  counter: "{{current}} / {{total}}",
  testimonial1: {
    role: "Organisatrice de concerts",
    content: "Avec BonPlanInfos, mes événements protégés génèrent un revenu passif impressionnant. 1000 vues = 10,000F !"
  },
  testimonial2: {
    role: "Manager d'artistes",
    content: "La billetterie est révolutionnaire. 95% des revenus me reviennent directement, sans intermédiaire."
  },
  testimonial3: {
    role: "Partenaire officielle",
    content: "Devenir partenaire m'a permis de générer un revenu mensuel stable tout en développant mon réseau."
  },
  testimonial4: {
    role: "Promoteur événementiel",
    content: "Le système de concours a boosté l'engagement de ma communauté. Les revenus ont augmenté de 300% !"
  },
  testimonial5: {
    role: "Artiste musicienne",
    content: "En tant qu'artiste, BonPlanInfos m'a donné une autonomie financière grâce aux événements protégés."
  },
  testimonial6: {
    role: "Organisateur de festivals",
    content: "La location de stands via la plateforme a simplifié toute la logistique de mon festival."
  },
  testimonial7: {
    role: "Influenceuse lifestyle",
    content: "Mes tirages au sort génèrent un engagement incroyable. Ma communauté adore participer !"
  },
  testimonial8: {
    role: "Entrepreneur événementiel",
    content: "Le programme partenaire m'a ouvert des opportunités que je n'aurais jamais imaginées."
  },
  testimonial9: {
    role: "Photographe événements",
    content: "Je monétise maintenant mes reportages photos grâce aux événements protégés. Génial !"
  },
  testimonial10: {
    role: "DJ & Producteur",
    content: "Mes lives protégés me rapportent plus que mes anciennes plateformes. Je recommande à 100% !"
  },
  testimonial11: {
    role: "Organisatrice mariages",
    content: "BonPlanInfos a révolutionné ma façon de travailler. Les clients adorent le système de billetterie."
  },
  testimonial12: {
    role: "Community Manager",
    content: "Je gère plusieurs artistes sur la plateforme. L'interface est intuitive et les revenus transparents."
  },
  testimonial13: {
    role: "Créatrice de contenu",
    content: "Mes ateliers en ligne sont maintenant protégés et génèrent des revenus stables chaque mois."
  },
  testimonial14: {
    role: "Organisateur sportif",
    content: "Pour nos tournois, le système de votes et concours a multiplié par 5 notre audience."
  },
  testimonial15: {
    role: "Agence événementielle",
    content: "Nous utilisons BonPlanInfos pour tous nos clients. La satisfaction est toujours au rendez-vous !"
  }
},
        cta: {
          title:
            "Vous êtes prêt à faire passer vos événements au niveau supérieur ?",
          subtitle:
            "Ne laissez pas la complexité vous freiner. Avec BonPlanInfos, l'organisation d'événements devient simple, rentable et amusante.",
          cta: "Devenir Partenaire Officiel",
        },
        meta_title: "Partenariat & Marketing - BonPlanInfos",
        meta_description:
          "Rejoignez BonPlanInfos en tant que partenaire ou organisateur. Maximisez la visibilité de vos événements, engagez votre communauté et augmentez vos revenus.",
      },

      // ===== WALLET & COINS =====
      wallet_info_modal: {
        title: "À quoi servent les pièces (π) ?",
        intro:
          "Les pièces sont la monnaie virtuelle de BonPlanInfos. Elles vous permettent d'accéder à des contenus exclusifs et d'interagir avec les événements.",
        free_coins_title: "Pièces Gratuites (🎁)",
        free_coins_desc:
          "Vous les gagnez en regardant des vidéos publicitaires ou lors de promotions. Elles vous permettent de réaliser des actions de base.",
        paid_coins_title: "Pièces Achetées (💳)",
        paid_coins_desc:
          "Achetées avec de l'argent réel, elles débloquent toutes les fonctionnalités et soutiennent directement les organisateurs.",
        usage_title: "Comment les utiliser ?",
        usage_item1: "Accéder à des événements protégés.",
        usage_item2: "Liker, commenter, télécharger du contenu exclusif.",
        usage_item3: "Participer à des votes, tombolas et bien plus.",
        cta_button: "Acheter des pièces",
        usage_priority:
          "Les pièces gratuites sont toujours utilisées en premier pour vos actions !",
      },

      // ===== ÉVÉNEMENTS =====
      events_title: "Événements à la Une",
      all_events_button: "Tous les événements",
      promoted_events: "Événements Sponsorisés",
      popular_contests: "Concours Populaires",
      see_all_contests: "Voir tous les concours",

      event_card: {
        days_remaining: "{{count}} jour restant",
        days_remaining_plural: "{{count}} jours restants",
        event_ended: "Terminé",
        event_starting_today: "Commence aujourd'hui",
        starting_from: "À partir de",
      },

      filters: {
        all: "Tout",
        promoted: "Boostés",
        live: "En direct",
        today: "Aujourd'hui",
        this_week: "Cette semaine",
        free: "Gratuits",
      },

      event_detail: {
        by_organizer: "Par",
        share: "Partager",
        location: "Lieu",
        date_time: "Date et Heure",
        get_directions: "Obtenir l'itinéraire",
        about_event: "À propos de l'événement",
        tags: "Tags",
        unlock_event_to_see_content:
          "Débloquez cet événement pour voir le contenu exclusif !",
        unlock_button: "Débloquer pour {{price}}π",
        unlocking: "Déblocage...",
        free_access: "Accès gratuit",
        owner_access: "Accès propriétaire",
        comments: "Commentaires",
        leave_comment: "Laissez un commentaire...",
        submit_comment: "Envoyer",
        comment_cost: "Commenter pour {{price}}π",
        ticketing: "Billetterie",
        voting: "Vote",
        raffle: "Tombola",
        stands: "Stands",
      },

      // ===== INTERACTIONS SOCIALES =====
      social_interactions: {
        like: "J'aime",
        comment: "Commenter",
        share: "Partager",
        download: "Télécharger",
        cost: "{{price}}π",
        comment_placeholder: "Ajouter un commentaire...",
        post_comment: "Publier",
      },

      // ===== TOASTS & NOTIFICATIONS =====
      toasts: {
        copied_to_clipboard: "Copié dans le presse-papiers !",
        feature_not_implemented:
          "🚧 Cette fonctionnalité n'est pas encore implémentée—mais ne vous inquiétez pas ! Vous pouvez la demander dans votre prochain prompt ! 🚀",
      },

partner_signup: {
  meta_title: "Devenir Partenaire - BonPlanInfos",
  meta_description: "Devenez partenaire officiel BonPlanInfos et générez des revenus mensuels stables. Programme de partenariat avec licences avantageuses.",
  
  unauthorized_title: "Accès non autorisé",
  unauthorized_desc: "Vous devez être connecté pour accéder à la page partenaire.",
  unauthorized_cta: "Se connecter",
  
  loading_licenses: "Chargement des licences...",
  error_loading_licenses: "Erreur lors du chargement des licences",
  
  your_licenses_title: "Vos Licences Actives",
  available_licenses_title: "Licences Disponibles",
  available_licenses_subtitle: "Choisissez la licence qui correspond à vos ambitions et commencez à générer des revenus",
  
  license_card: {
    active: "Active",
    expired: "Expirée",
    revenue_share: "Part de revenus : {{percent}}%",
    purchased_on: "Achetée le",
    expires_on: "Expire le",
    days_remaining: "{{count}} jour(s) restant(s)"
  },
  
  per_month: "/mois",
  revenue_label: "Part des revenus",
  duration_label: "{{months}} mois ({{days}} jours)",
  
  purchase_cta: "Acheter maintenant",
  
  error_toast: {
    title: "Erreur",
    login_required: "Vous devez être connecté pour acheter une licence",
    purchase_failed: "Erreur lors de l'achat de la licence"
  }
},
license_features: {
  // Pour la licence Premium/Pro
  feature1: "Zone maximale",
  feature2: "Dashboard avancé", 
  feature3: "Support 24/7",
  feature4: "Formation avancée",
  feature5: "Accès early",
  
  // Pour la licence Standard
  feature6: "Gestion de zone",
  feature7: "Rapports mensuels", 
  feature8: "Support basic",
  
  // Pour la licence Basique
  feature9: "Zone étendue",
  feature10: "Analyses détaillées",
  feature11: "Support prioritaire",
  feature12: "Formation",
  
  // Descriptions des revenus
  revenue_description_40: "40% de gain sur chiffre d'affaires de sa zone",
  revenue_description_20: "20% de gain sur chiffre d'affaires de sa zone"
},
      // ===== CREATE EVENT PAGE =====
create_event_page: {
  meta: {
    title: "Créer un Événement - Choisir le Type",
    description: "Choisissez le type d'événement que vous souhaitez créer sur BonPlanInfos"
  },
  title: "Créer un Événement",
  subtitle: "Choisissez le type d'événement que vous souhaitez créer",
  types: {
    simple: {
      title: "Événement Simple",
      desc: "Événement basique avec informations générales"
    },
    ticketing: {
      title: "Billetterie",
      desc: "Vendez des billets pour votre événement"
    },
    voting: {
      title: "Vote & Concours",
      desc: "Créez un concours avec système de vote"
    },
    raffle: {
      title: "Tirage au Sort",
      desc: "Organisez un tirage au sort avec lots"
    },
    stand: {
      title: "Location de Stands",
      desc: "Louez des stands pour un salon ou foire"
    }
  },
  help: {
    title: "Besoin d'aide ?",
    description: "Consultez notre guide pour apprendre à créer et gérer vos événements efficacement",
    button: "Voir le Guide d'Utilisation"
  }
},

// ===== USER GUIDE PAGE =====
user_guide_page: {
    meta: {
      title: "BonPlanInfos - Plateforme Événementielle 100% Africaine",
      description: "Créez, gérez et monétisez vos événements avec BonPlanInfos. La plateforme ivoirienne qui vous reverse 95% de vos revenus."
    },
    hero: {
      title: "BonPlanInfos",
      subtitle: "Votre Succès Événementiel",
      description: "La plateforme ivoirienne qui vous reverse <strong>95% de vos revenus</strong>",
      coin_info: "1 pièce = 10F • 1 interaction = 1 pièce",
      create_event: "Créer un Événement",
      become_partner: "Devenir Partenaire",
      features: {
        revenue: "95% des revenus reversés",
        coin: "1 pièce = 10F CFA",
        support: "Support 24/7"
      }
    },
    features: {
      title: "Nos Solutions Événementielles",
      subtitle: "Des outils puissants pour maximiser vos revenus et votre visibilité",
      ticketing: {
        title: "Billetterie Intelligente",
        description: "Vendez des billets pour vos concerts et événements. Fixez vos prix et recevez 95% des revenus directement",
        stats: "95% de revenus reversés"
      },
      voting: {
        title: "Concours & Votes",
        description: "Organisez des concours interactifs avec système de vote. Monétisez chaque participation",
        stats: "95% sur chaque participation"
      },
      raffle: {
        title: "Tirage au Sort",
        description: "Créez des tirages au sort avec lots attractifs. Participation payante ou gratuite selon votre choix",
        stats: "Gestion automatique avec 95% sur chaque participation"
      },
      stand_rental: {
        title: "Location de Stands",
        description: "Louez des stands pour salons et foires. Gérez les réservations et paiements en ligne",
        stats: "95% du prix de location vous êtes reversés"
      },
      protected_events: {
        title: "Événements Protégés",
        description: "Contenu exclusif monétisé. Gagnez 1 pièce par interaction (vue, like, commentaire, partage)",
        stats: "+1 pièce par interaction"
      },
      boost: {
        title: "Boost Instantané",
        description: "Augmentez la visibilité de vos événements. Atteignez plus de participants en temps réel en boostant vos évènements sur bonplaninfos.",
        stats: "Portée multipliée"
      }
    },
    simulation: {
      title: "Simulation Événement Protégé",
      subtitle: "Découvrez comment monétiser chaque interaction sur vos événements",
      main_title: "💰 1 Interaction = 1 Pièce = 10F CFA",
      description: "Chaque vue, like, commentaire ou partage vous rapporte de l'argent",
      views: "Vues",
      likes: "Likes",
      comments: "Commentaires",
      shares: "Partages",
      total: "Total: {{amount}} F CFA",
      revenue_description: "Revenus générés par un événement avec {{count}} interactions"
    },
    stats: {
      revenue: "Revenus reversés aux organisateurs",
      coin_cost: "Coût d'1 pièce",
      coin_earned: "Pièce gagnée par interaction",
      no_fees: "Frais d'inscription"
    },
    partner_program: {
      title: "Programme Partenaire",
      subtitle: "Représentez BonPlanInfos dans votre région et générez des revenus mensuels",
      advantages: "Avantages Partenaire",
      benefits: {
        revenue: "Revenus mensuels garantis",
        training: "Formation complète offerte",
        support: "Support prioritaire 24/7",
        network: "Réseau de partenaires exclusif"
      },
      become_partner: "Devenez Partenaire",
      partner_description: "Représentez BonPlanInfos dans votre ville",
      apply_now: "Postuler Maintenant"
    },
   testimonials: {
  title: "Ils nous font confiance",
  subtitle: "Découvrez les retours d'expérience de nos utilisateurs satisfaits",
  play: "Lecture",
  pause: "Pause",
  previous: "Précédent",
  next: "Suivant",
  counter: "{{current}} / {{total}}",
  testimonial1: {
    name: "Marie K.",
    role: "Organisatrice de concerts",
    content: "Avec BonPlanInfos, mes événements protégés génèrent un revenu passif impressionnant. 1000 vues = 10,000F !"
  },
  testimonial2: {
    name: "Jean A.",
    role: "Manager d'artistes",
    content: "La billetterie est révolutionnaire. 95% des revenus me reviennent directement, sans intermédiaire."
  },
  testimonial3: {
    name: "Sophie T.",
    role: "Partenaire officielle",
    content: "Devenir partenaire m'a permis de générer un revenu mensuel stable tout en développant mon réseau."
  },
  testimonial4: {
    name: "Paul D.",
    role: "Promoteur événementiel",
    content: "Le système de concours a boosté l'engagement de ma communauté. Les revenus ont augmenté de 300% !"
  },
  testimonial5: {
    name: "Fatou M.",
    role: "Artiste musicienne",
    content: "En tant qu'artiste, BonPlanInfos m'a donné une autonomie financière grâce aux événements protégés."
  },
  testimonial6: {
    name: "Kevin L.",
    role: "Organisateur de festivals",
    content: "La location de stands via la plateforme a simplifié toute la logistique de mon festival."
  },
  testimonial7: {
    name: "Aïcha B.",
    role: "Influenceuse lifestyle",
    content: "Mes tirages au sort génèrent un engagement incroyable. Ma communauté adore participer !"
  },
  testimonial8: {
    name: "Marc T.",
    role: "Entrepreneur événementiel",
    content: "Le programme partenaire m'a ouvert des opportunités que je n'aurais jamais imaginées."
  },
  testimonial9: {
    name: "Julie N.",
    role: "Photographe événements",
    content: "Je monétise maintenant mes reportages photos grâce aux événements protégés. Génial !"
  },
  testimonial10: {
    name: "David K.",
    role: "DJ & Producteur",
    content: "Mes lives protégés me rapportent plus que mes anciennes plateformes. Je recommande à 100% !"
  },
  testimonial11: {
    name: "Sarah J.",
    role: "Organisatrice mariages",
    content: "BonPlanInfos a révolutionné ma façon de travailler. Les clients adorent le système de billetterie."
  },
  testimonial12: {
    name: "Mohamed C.",
    role: "Community Manager",
    content: "Je gère plusieurs artistes sur la plateforme. L'interface est intuitive et les revenus transparents."
  },
  testimonial13: {
    name: "Laura P.",
    role: "Créatrice de contenu",
    content: "Mes ateliers en ligne sont maintenant protégés et génèrent des revenus stables chaque mois."
  },
  testimonial14: {
    name: "Pierre G.",
    role: "Organisateur sportif",
    content: "Pour nos tournois, le système de votes et concours a multiplié par 5 notre audience."
  },
  testimonial15: {
    name: "Nadia S.",
    role: "Agence événementielle",
    content: "Nous utilisons BonPlanInfos pour tous nos clients. La satisfaction est toujours au rendez-vous !"
  }
},
    cta: {
      title: "Prêt à révolutionner vos événements ?",
      description: "Rejoignez la communauté BonPlanInfos et commencez à générer des revenus dès aujourd'hui",
      create_event: "Créer mon premier événement",
      become_partner: "Devenir Partenaire"
    },
    footer: {
      description: "La plateforme événementielle ivoirienne qui vous reverse 95% de vos revenus.",
      navigation: "Navigation",
      home: "Accueil",
      events: "Événements",
      create_event: "Créer un événement",
      become_partner: "Devenir partenaire",
      contact: "Contact",
      information: "Informations",
      copyright: "© 2024 BonPlanInfos. Tous droits réservés."
    }
  },




      // ===== ADMIN =====
      admin: {
        tabs: {
          analytics: "Analyses",
          users: "Utilisateurs",
          partners: "Partenaires",
          events: "Événements",
          locations: "Lieux",
          promotions: "Promotions",
          credits: "Crédits",
          config: "Configuration",
          withdrawals: "Retraits",
          videos: "Vidéos",
          announcements: "Annonces",
          welcome_popup: "Popup Accueil",
        },
      },

      // ===== DISCOVER PAGE =====
      discover_places: "Découvrir des lieux",
      discover_more_places: "Découvrir plus de lieux",

      discover_page: {
        title: "Découvrir des Lieux",
        subtitle: "Trouvez de nouveaux lieux recommandés par la communauté.",
        search_placeholder: "Rechercher un lieu, une catégorie, une ville...",
        filter_by_type: "Filtrer par type",
        no_locations_found: "Aucun lieu trouvé.",
        no_locations_description:
          "Essayez d'élargir votre recherche ou de sélectionner moins de filtres.",
        add_new_location: "Ajouter un nouveau lieu",
        add_place: "Ajouter un Lieu",
      },

      add_location: {
        title: "Ajouter un nouveau lieu",
        subtitle: "Partagez un super endroit avec la communauté.",
        location_name: "Nom du lieu",
        location_description: "Description",
        location_type: "Type de lieu",
        address: "Adresse",
        city: "Ville",
        country: "Pays",
        website: "Site web (facultatif)",
        phone: "Téléphone (facultatif)",
        submit: "Soumettre le lieu",
        success_title: "Lieu soumis !",
        success_message:
          "Merci ! Votre lieu a été soumis et sera examiné par notre équipe.",
      },

      // ===== VÉRIFICATION BILLETS =====
      verify_ticket: {
        title: "Vérification de Billet",
        scan_instruction:
          "Scannez le code QR du billet ou entrez le code du scanner.",
        scanner_code_label: "Code du Scanner",
        start_session: "Démarrer la session",
        stop_session: "Arrêter la session",
        scan_ticket: "Scanner un Billet",
        camera_permission_denied: "Permission de la caméra refusée.",
        camera_error: "Erreur de caméra :",
        scan_result: "Résultat du scan",
        scan_again: "Scanner à nouveau",
        valid_ticket: "Billet Valide",
        invalid_ticket: "Billet Invalide",
        ticket_number: "Numéro de billet:",
        ticket_type: "Type de billet:",
        attendee_name: "Nom du participant:",
        event_title: "Titre de l'événement:",
        scan_time: "Heure de scan:",
        error: "Erreur",
        session_active: "Session de vérification active",
        session_stopped: "Session de vérification arrêtée",
        verifying_ticket: "Vérification du billet...",
        enter_scanner_code: "Veuillez entrer un code de scanner valide.",
      },

      // ===== CRÉATION D'ÉVÉNEMENTS =====
      create_event: {
        title: "Créer un Événement",
        subtitle:
          "Choisissez le type d'événement que vous souhaitez organiser.",
        simple: "Simple",
        simple_desc:
          "Publiez rapidement un événement informatif (gratuit ou payant à l'entrée).",
        ticketing: "Billetterie",
        ticketing_desc: "Vendez des billets avec différents tarifs et options.",
        voting: "Concours de Vote",
        voting_desc:
          "Organisez un concours où les participants votent pour des candidats.",
        raffle: "Tombola",
        raffle_desc: "Créez une tombola avec des tickets et des prix à gagner.",
        stands: "Location de Stands",
        stands_desc: "Gérez la location de stands pour un salon ou un marché.",
      },

      create_ticketing_event: {
        title: "Créer un Événement avec Billetterie",
        event_details: "Détails de l'Événement",
        event_title: "Titre de l'événement",
        event_description: "Description",
        event_cover_image: "Image de couverture",
        upload_image: "Télécharger une image",
        event_date: "Date de l'événement",
        category: "Catégorie",
        select_category: "Sélectionner une catégorie",
        location: "Lieu",
        address: "Adresse",
        city: "Ville",
        country: "Pays",
        ticket_types: "Types de Billets",
        add_ticket_type: "Ajouter un type de billet",
        ticket_name: "Nom du billet (ex: Standard, VIP)",
        ticket_price_fcfa: "Prix (FCFA)",
        ticket_quantity: "Quantité disponible",
        ticket_benefits: "Avantages (séparés par des virgules)",
        remove: "Supprimer",
        verification_options: "Options de Vérification",
        enable_verification: "Activer la vérification des billets par QR code",
        submit: "Créer l'événement",
        event_created_success: "Événement créé avec succès !",
        editing_event: "Modification de l'événement",
      },

      ticketing_interface: {
        select_ticket_type: "Sélectionnez vos billets",
        total_cost: "Coût Total :",
        buy_tickets: "Acheter des Billets",
        sold_out: "Épuisé",
        sales_ended: "Ventes terminées",
        available: "disponibles",
        benefits: "Avantages :",
      },

      // ===== FORMULAIRES COMMUNS =====
      select_country: "Sélectionner un pays",
      select_city: "Sélectionner une ville",
      choose_file: "Choisir un fichier",
      no_file_chosen: "Aucun fichier choisi",

      // ===== COMMUN =====
      common: {
        error_title: "Erreur",
        confirm: "Confirmer",
        cancel: "Annuler",
        delete: "Supprimer",
        close: "Fermer",
        save: "Sauvegarder",
        edit: "Modifier",
        loading: "Chargement...",
        success_title: "Succès",
        search: "Rechercher...",
        activate: "Activer",
        deactivate: "Désactiver",
        credit: "Créditer",
        retry: "Réessayer",
      },

      // ===== POLITIQUE DE CONFIDENTIALITÉ =====
      privacy: {
        meta_title: "Politique de Confidentialité",
        meta_description:
          "Consultez notre politique de confidentialité pour comprendre comment nous collectons, utilisons et protégeons vos données personnelles.",
        title: "Politique de Confidentialité",
        last_updated: "Dernière mise à jour : 02 Novembre 2025",
        introduction: {
          title: "1. Introduction",
          p1: "Cette politique de confidentialité explique comment BonPlanInfos collecte, utilise et protège vos informations personnelles lorsque vous utilisez notre plateforme.",
        },
        data_collected: {
          title: "2. Données que nous collectons",
          p1: "Nous collectons diverses informations pour fournir et améliorer nos services :",
          item1:
            "<b>Informations de compte :</b> Nom, adresse e-mail, pays, ville, type de compte.",
          item2:
            "<b>Données d'utilisation :</b> Pages visitées, interactions avec les événements, recherches effectuées.",
          item3:
            "<b>Contenu généré par l'utilisateur :</b> Événements créés, commentaires, photos.",
          item4:
            "<b>Données de transaction :</b> Historique des achats de pièces et des retraits de gains.",
        },
        data_usage: {
          title: "3. Comment nous utilisons vos données",
          p1: "Vos données sont utilisées pour :",
          item1: "Fournir, maintenir et améliorer la plateforme.",
          item2:
            "Personnaliser votre expérience en vous recommandant des événements pertinents.",
          item3: "Traiter les transactions et les paiements.",
          item4:
            "Communiquer avec vous concernant votre compte ou nos services.",
        },
        cookies: {
          title: "4. Cookies",
          p1: "Nous utilisons des cookies pour assurer le bon fonctionnement du site, analyser notre trafic et personnaliser le contenu. Vous pouvez gérer vos préférences de cookies à tout moment.",
        },
        data_sharing: {
          title: "5. Partage des données",
          p1: "Nous ne partageons pas vos informations personnelles avec des tiers, sauf si cela est nécessaire pour fournir le service (par exemple, avec les processeurs de paiement) ou si la loi l'exige.",
        },
        security: {
          title: "6. Sécurité",
          p1: "Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles pour protéger vos données contre l'accès non autorisé, la perte ou la destruction.",
        },
        your_rights: {
          title: "7. Vos droits",
          p1: "Conformément à la réglementation, vous disposez des droits suivants :",
          item1:
            "<b>Droit d'accès :</b> Vous pouvez demander une copie des données que nous détenons sur vous.",
          item2:
            "<b>Droit de rectification :</b> Vous pouvez corriger toute information inexacte.",
          item3:
            "<b>Droit à l'effacement :</b> Vous pouvez demander la suppression de votre compte et de vos données.",
          p2: "Pour exercer ces droits, veuillez nous contacter à l'adresse ci-dessous.",
        },
        contact: {
          title: "8. Contact",
          p1: "Pour toute question relative à cette politique de confidentialité, veuillez nous contacter à :",
          email: "privacy@bonplaninfos.net",
        },
      },

      // ===== MENTIONS LÉGALES =====
      legal_mentions: {
        meta_title: "Mentions Légales",
        meta_description:
          "Consultez les mentions légales de BonPlanInfos pour obtenir des informations sur l'éditeur du site, l'hébergement et nos obligations légales.",
        title: "Mentions Légales",
        subtitle: "Informations légales concernant la plateforme BonPlanInfos.",
        lastUpdate: "Dernière mise à jour : 02 Novembre 2025",
        sections: {
          editor: {
            title: "Éditeur du Site",
            content: "Le site BonPlanInfos est édité par :",
            company: "BON PLAN INFOS (BPI)",
            capital:
              "Société par actions simplifiée (SAS) au capital de 1.000.000 FCFA",
            address: "Siège social : Abidjan, Côte d'Ivoire",
            phone: "Téléphone : (+225) 07 12 27 53 74",
            email: "contact@bonplaninfos.net",
          },
          director: {
            title: "Directeur de la Publication",
            content:
              "Le directeur de la publication est Monsieur S.Rayane KIBORA, en sa qualité de Président de BON PLAN INFOS (BPI).",
          },
          hosting: {
            title: "Hébergement",
            content: "La plateforme est hébergée par :",
            company: "Hostinger International Ltd.",
            address: "61 Lordou Vironos Street, 6023 Larnaca, Chypre",
            website: "www.hostinger.fr",
          },
          data: {
            title: "Protection des Données Personnelles",
            content1:
              "Conformément à la législation en vigueur sur la protection des données, vous disposez d'un droit d'accès, de rectification, de suppression et d'opposition de vos données personnelles. Pour exercer ce droit, veuillez contacter notre Délégué à la Protection des Données (DPO) à l'adresse : ",
            content2:
              "Pour plus d'informations, veuillez consulter notre <1>Politique de Confidentialité</1>.",
          },
          cookies: {
            title: "Cookies",
            content1:
              "Le site utilise des cookies pour améliorer l'expérience utilisateur. Ces cookies sont utilisés pour :",
            item1:
              "Assurer le bon fonctionnement du site (cookies de session).",
            item2:
              "Analyser l'audience et la performance (cookies analytiques).",
            item3:
              "Proposer des publicités personnalisées (cookies marketing).",
            content2:
              "Vous pouvez configurer vos préférences en matière de cookies via notre bannière de consentement.",
          },
          ip: {
            title: "Propriété Intellectuelle",
            content:
              "L'ensemble des contenus de ce site (textes, images, vidéos, logos, code source) est la propriété exclusive de BON PLAN INFOS (BPI) ou de ses partenaires. Toute reproduction, même partielle, est strictement interdite sans autorisation préalable.",
          },
          liability: {
            title: "Limitation de Responsabilité",
            content:
              "BonPlanInfos s'efforce de fournir des informations exactes et à jour, mais ne peut garantir l'exactitude de toutes les informations. L'utilisation des informations et contenus disponibles sur l'ensemble du site, ne sauraient en aucun cas engager la responsabilité de l'éditeur, à quelque titre que ce soit.",
          },
          links: {
            title: "Liens Hypertextes",
            content:
              "La plateforme peut contenir des liens hypertextes vers d'autres sites. BonPlanInfos n'est pas responsable du contenu de ces sites tiers et ne saurait être tenu responsable des dommages résultant de leur consultation.",
          },
          applicableLaw: {
            title: "Droit Applicable",
            content:
              "Les présentes mentions légales sont soumises au droit ivoirien. En cas de litige, les tribunaux d'Abidjan seront seuls compétents.",
          },
        },
      },
    },
  },










  // ==================== ENGLISH VERSION ====================
  en: {
    translation: {
      // ===== NAVIGATION =====
      nav: {
        home: "Home",
        discover: "Discover",
        events: "Events",
        partnership: "Partnership",
        profile: "Profile",
        wallet: "Wallet",
        create_event: "Create Event",
        logout: "Logout",
        notifications: "Notifications",
      },

      // ===== AUTHENTICATION =====
      auth: {
        fetch_error: {
          title: "Connection Error",
          description:
            "Could not fetch data. Please check your internet connection and refresh the page.",
        },
        login: {
          meta_title: "Login",
          meta_description: "Log in to your BonPlanInfos account.",
          title: "Login",
          subtitle: "Log in to continue.",
          button: "Login",
          switch_text: "Don't have an account yet?",
          switch_button: "Sign Up",
          error_invalid_credentials: "Incorrect email or password.",
        },
        register: {
          meta_title: "Register",
          meta_description:
            "Create an account on BonPlanInfos and start discovering the best plans.",
          title: "Register",
          subtitle: "Create your account.",
          button: "Register",
          country_city_required: "Please select a country and a city.",
          switch_text: "Already have an account?",
          switch_button: "Login",
          confirmation_email_title: "Check your email!",
          confirmation_email_description:
            "We have sent you a confirmation email. Please check your inbox and click on the link to activate your account.",
          terms_agreement: "I agree to the <1>Terms of Service</1>",
          terms_required: "You must accept the terms of service.",
        },
        full_name: "Full Name",
        country: "Country",
        select_country_placeholder: "Select your country",
        city: "City",
        select_city_placeholder: "Select your city",
        choose_role: "You are?",
        choose_role_placeholder: "Choose your role",
        role_user: "User",
        role_organizer: "Organizer",
        email: "Email",
        password: "Password",
        referral_code_optional: "Referral Code (Optional)",
      },

      // ===== MAIN PAGES =====
      home: "Home",
      events: "Events",
      contests: "Contests",
      discover: "Discover",
      login: "Login",
      logout: "Logout",
      profile: "Profile",
      wallet: "Wallet",
      settings: "Settings",

      // ===== HOME PAGE =====
      home_page: {
        sponsored_events: "Sponsored Events",
        boost_event: "Boost an Event",
        explore_by_type: {
          title: "Explore by Event Type",
          subtitle: "Find the experience that's right for you.",
        },
        event_types: {
          standard: "Standard",
          ticketing: "Ticketing",
          raffles: "Raffles",
          voting: "Voting",
          stands: "Stands",
        },
        no_sponsored_events: {
          title: "No Sponsored Events Currently",
          description:
            "Be the first to promote an event and reach a wider audience.",
          button: "Boost an Event",
        },
        view_all_events: "View All Events",
        loading_error: {
          title: "Error Loading Data",
          description:
            "We couldn't load the necessary data. Please check your connection and try again.",
          retry: "Retry",
        },
      },

      // ===== EVENTS PAGE =====
      events_page: {
        title: "Explore Events",
        subtitle: "Discover what's happening near you and beyond.",
        search_placeholder: "Search by name, city, category...",
        filters: "Filters",
        quick_filters: {
          trending: "Trending",
          popular_by_category: "Popular by Category",
          free_weekend: "Free This Weekend",
          ending_soon: "Ending Soon",
        },
        event_types: "Event Types",
        categories: "Categories",
        countries: "Countries",
        cities: "Cities",
        reset: "Reset",
        no_events_found: {
          title: "No Events Found",
          description:
            "Try adjusting your search filters or expanding your search area.",
          reset_button: "Reset Filters",
        },
        unlock_modal: {
          title: "Unlock This Event",
          description:
            'To see the details for "{{title}}", a cost of {{cost}}π (about {{costFcfa}} FCFA) will be deducted from your balance.',
          info: "This is a one-time action. Once unlocked, you will have permanent access to this event.",
          cancel: "Cancel",
          confirm: "Confirm and Unlock",
          success_title: "Access Unlocked!",
          success_desc: 'You can now see the details for "{{title}}".',
        },
      },

      // ===== PROFILE PAGE =====
      profile_page: {
        helmet_title: "{{name}}'s Profile",
        helmet_desc:
          "Manage your profile, events, and transactions on BonPlanInfos.",
        unauthorized_title: "Access Denied",
        unauthorized_desc: "You must be logged in to view your profile.",
        go_to_login: "Go to Login Page",
        connection_failed_title: "Connection Failed",
        connection_failed_desc:
          "We were unable to load your profile. Please try logging in again.",
        loading_error_title: "Error Loading Data",
        loading_error_desc:
          "We couldn't load all your profile data. Some information may be missing.",
      },




      data_protection: {
  meta_title: "Personal Data Protection",
  meta_description: "BonPlanInfos personal data protection policy. Compliant with African data protection regulations.",
  title: "Personal Data Protection",
  subtitle: "Our commitment to protecting your data in Africa",
  africa_compliance: "Our data protection practices comply with national regulations in all operating countries across West Africa (Côte d'Ivoire, Burkina Faso, Senegal, Mali, Benin, Ghana, Nigeria), Central Africa (Cameroon, Gabon), North Africa (Tunisia, Morocco), and Southern Africa (South Africa), following both local laws and African Union standards.",
  contact_title: "Contact Data Protection Officer",
  
  commitment: {
    title: "Our Commitment",
    content: "BonPlanInfos is committed to protecting your personal data in accordance with African data protection laws. We implement robust technical and organizational measures to ensure the security and confidentiality of your information."
  },
  
  dpo: {
    title: "Data Protection Officer",
    content: "Our Data Protection Officer (DPO) ensures compliance with legal and regulatory obligations regarding personal data protection in all African countries where we operate."
  },
  
  data_collected: {
    title: "Collected Data",
    content: "We only collect data necessary for the proper functioning of our event services:",
    list: [
      "Profile information: name, surname, email, phone number",
      "Transaction data: ticket purchase history",
      "Usage data: event preferences, platform interactions",
      "Technical data: IP address, device type, essential cookies",
      "Location data: country and city to personalize events"
    ]
  },
  
  usage: {
    title: "Data Usage",
    content: "Your data is used strictly for the following purposes:",
    list: [
      "Management of event registrations and participations",
      "Secure processing of ticket payments",
      "Sending event confirmations and information",
      "Improving user experience on our platform",
      "Compliance with African legal obligations",
      "Personalization of event recommendations by country"
    ]
  },
  
  sharing: {
    title: "Data Sharing",
    content: "We only share your data with:",
    list: [
      "Certified payment providers (MoneyFusion, PayPal, Mobile Money, Orange Money, MTN Mobile Money, Moov Money, Wave, etc.)",
      "Event organizers (only data necessary for their event management)",
      "Legal authorities (upon formal request compliant with local laws)",
      "Technical partners under strict confidentiality agreements"
    ]
  },
  
  security: {
    title: "Data Security",
    content: "We implement advanced security measures compliant with African standards:",
    list: [
      "SSL/TLS encryption for all data transmissions",
      "Secure storage with preference for servers located in Africa",
      "Strict access controls and multi-factor authentication",
      "Regular security audits compliant with local laws",
      "Encrypted backups and business continuity plans"
    ]
  },
  
  retention: {
    title: "Data Retention",
    content: "Your data is retained for limited periods according to each country's laws:",
    list: [
      "Account data: 3 years after last activity",
      "Transaction data: 5 to 10 years depending on local legal obligations",
      "Browsing data: maximum 13 months",
      "Event data: 2 years after event end",
      "Marketing data: 3 years after last contact"
    ]
  },
  
  hosting: {
    title: "Data Hosting",
    content: "Your data is primarily hosted on secure servers. We prioritize hosting solutions in Africa when possible, while guaranteeing the same quality of service and security. Our infrastructures respect the digital sovereignty requirements of the countries where we operate."
  },
  
  deletion: {
    title: "Right to Erasure",
    content: "In accordance with African data protection laws, you have the right to request the deletion of your personal data. Contact our DPO at support@bonplaninfos.net for any erasure request. We commit to responding within the legal deadlines of each country."
  },
  
  last_updated: "Last updated: December 2024"
},
      // ===== WALLET PAGE =====
      wallet_page: {
        title: "My Wallet",
        total_balance: "Total Coin Balance",
        free_coins: "Free Coins",
        paid_coins: "Paid Coins",
        available_earnings: "Available Earnings (Coins)",
        earnings_in_fcfa: "≈ {{amount}} FCFA",
        buy_coins_title: "Buy Coins",
        buy_coins_desc: "Top up your balance and never miss out!",
        buy_coins_button: "View Packs",
        balance_details_title: "Coin Balance Details",
        free_coins_desc:
          "Free coins are used first for interactions. Paid coins are used next, and a portion goes to organizers.",
        withdrawal_title: "Withdraw Earnings",
        withdrawal_desc: "Convert your earnings into real money.",
        request_withdrawal_button: "Request Withdrawal",
        withdrawal_minimum: "Minimum for withdrawal: {{amount}} coins.",
      },





// ===== CREATE EVENT PAGE =====
create_event_page: {
  meta: {
    title: "Create Event - Choose Type",
    description: "Choose the type of event you want to create on BonPlanInfos"
  },
  title: "Create Event",
  subtitle: "Choose the type of event you want to create",
  types: {
    simple: {
      title: "Simple Event",
      desc: "Basic event with general information"
    },
    ticketing: {
      title: "Ticketing",
      desc: "Sell tickets for your event"
    },
    voting: {
      title: "Voting & Contest",
      desc: "Create a contest with voting system"
    },
    raffle: {
      title: "Raffle",
      desc: "Organize a raffle with prizes"
    },
    stand: {
      title: "Stand Rental",
      desc: "Rent stands for a fair or exhibition"
    }
  },
  help: {
    title: "Need help?",
    description: "Check our guide to learn how to create and manage your events effectively",
    button: "View User Guide"
  }
},


testimonials: {
  title: "They Trust Us",
  subtitle: "Discover feedback from our satisfied users",
  play: "Play",
  pause: "Pause",
  previous: "Previous",
  next: "Next",
  counter: "{{current}} / {{total}}",
  testimonial1: {
    name: "Marie K.",
    role: "Concert Organizer",
    content: "With BonPlanInfos, my protected events generate impressive passive income. 1000 views = 10,000F!"
  },
  testimonial2: {
    name: "Jean A.",
    role: "Artist Manager",
    content: "The ticketing system is revolutionary. 95% of revenue comes directly to me, without intermediaries."
  },
  testimonial3: {
    name: "Sophie T.",
    role: "Official Partner",
    content: "Becoming a partner allowed me to generate stable monthly income while developing my network."
  },
  testimonial4: {
    name: "Paul D.",
    role: "Event Promoter",
    content: "The contest system boosted my community engagement. Revenues increased by 300%!"
  },
  testimonial5: {
    name: "Fatou M.",
    role: "Musician Artist",
    content: "As an artist, BonPlanInfos gave me financial autonomy through protected events."
  },
  testimonial6: {
    name: "Kevin L.",
    role: "Festival Organizer",
    content: "Stand rental through the platform simplified all my festival logistics."
  },
  testimonial7: {
    name: "Aïcha B.",
    role: "Lifestyle Influencer",
    content: "My raffles generate incredible engagement. My community loves to participate!"
  },
  testimonial8: {
    name: "Marc T.",
    role: "Event Entrepreneur",
    content: "The partner program opened opportunities I never would have imagined."
  },
  testimonial9: {
    name: "Julie N.",
    role: "Event Photographer",
    content: "I now monetize my photo reports through protected events. Amazing!"
  },
  testimonial10: {
    name: "David K.",
    role: "DJ & Producer",
    content: "My protected live streams earn me more than my previous platforms. I recommend 100%!"
  },
  testimonial11: {
    name: "Sarah J.",
    role: "Wedding Planner",
    content: "BonPlanInfos revolutionized my way of working. Clients love the ticketing system."
  },
  testimonial12: {
    name: "Mohamed C.",
    role: "Community Manager",
    content: "I manage several artists on the platform. The interface is intuitive and revenues transparent."
  },
  testimonial13: {
    name: "Laura P.",
    role: "Content Creator",
    content: "My online workshops are now protected and generate stable income every month."
  },
  testimonial14: {
    name: "Pierre G.",
    role: "Sports Organizer",
    content: "For our tournaments, the voting and contest system multiplied our audience by 5."
  },
  testimonial15: {
    name: "Nadia S.",
    role: "Event Agency",
    content: "We use BonPlanInfos for all our clients. Satisfaction is always guaranteed!"
  }
},
// ===== USER GUIDE PAGE =====
 user_guide_page: {
    meta: {
      title: "BonPlanInfos - 100% African Event Platform",
      description: "Create, manage and monetize your events with BonPlanInfos. The Ivorian platform that gives you back 95% of your revenue."
    },
    hero: {
      title: "BonPlanInfos",
      subtitle: "Your Event Success",
      description: "The Ivorian platform that gives you back <strong>95% of your revenue</strong>",
      coin_info: "1 coin = 10F • 1 interaction = 1 coin",
      create_event: "Create an Event",
      become_partner: "Become a Partner",
      features: {
        revenue: "95% revenue shared",
        coin: "1 coin = 10F CFA",
        support: "24/7 Support"
      }
    },
    features: {
      title: "Our Event Solutions",
      subtitle: "Powerful tools to maximize your revenue and visibility",
      ticketing: {
        title: "Smart Ticketing",
        description: "Sell tickets for your concerts and events. Set your prices and receive 95% of revenue directly",
        stats: "95% revenue shared"
      },
      voting: {
        title: "Contests & Voting",
        description: "Organize interactive contests with voting system. Monetize every participation",
        stats: "95% on each participation"
      },
      raffle: {
        title: "Raffle & Draws",
        description: "Create raffles with attractive prizes. Paid or free participation according to your choice",
        stats: "Automatic management with 95% on each participation"
      },
      stand_rental: {
        title: "Stand Rental",
        description: "Rent stands for trade shows and fairs. Manage reservations and payments online",
        stats: "95% of rental price goes to you"
      },
      protected_events: {
        title: "Protected Events",
        description: "Monetized exclusive content. Earn 1 coin per interaction (view, like, comment, share)",
        stats: "+1 coin per interaction"
      },
      boost: {
        title: "Instant Boost",
        description: "Increase your events visibility. Reach more participants in real time by boosting your events on bonplaninfos.",
        stats: "Reach multiplied"
      }
    },
    simulation: {
      title: "Protected Event Simulation",
      subtitle: "Discover how to monetize every interaction on your events",
      main_title: "💰 1 Interaction = 1 Coin = 10F CFA",
      description: "Every view, like, comment or share earns you money",
      views: "Views",
      likes: "Likes",
      comments: "Comments",
      shares: "Shares",
      total: "Total: {{amount}} F CFA",
      revenue_description: "Revenue generated by an event with {{count}} interactions"
    },
    stats: {
      revenue: "Revenue shared to organizers",
      coin_cost: "Cost of 1 coin",
      coin_earned: "Coin earned per interaction",
      no_fees: "Registration fees"
    },
    partner_program: {
      title: "Partner Program",
      subtitle: "Represent BonPlanInfos in your region and generate monthly income",
      advantages: "Partner Advantages",
      benefits: {
        revenue: "Guaranteed monthly income",
        training: "Complete training offered",
        support: "Priority 24/7 support",
        network: "Exclusive partner network"
      },
      become_partner: "Become a Partner",
      partner_description: "Represent BonPlanInfos in your city",
      apply_now: "Apply Now"
    },
    testimonials: {
      title: "They Trust Us",
      subtitle: "Discover feedback from our satisfied users",
      play: "Play",
      pause: "Pause",
      previous: "Previous",
      next: "Next",
      counter: "{{current}} / {{total}}"
    },
    cta: {
      title: "Ready to revolutionize your events?",
      description: "Join the BonPlanInfos community and start generating revenue today",
      create_event: "Create my first event",
      become_partner: "Become a Partner"
    },
    footer: {
      description: "The Ivorian event platform that gives you back 95% of your revenue.",
      navigation: "Navigation",
      home: "Home",
      events: "Events",
      create_event: "Create an event",
      become_partner: "Become a partner",
      contact: "Contact",
      information: "Information",
      copyright: "© 2024 BonPlanInfos. All rights reserved."
    }
  },
partner_signup: {
  meta_title: "Become a Partner - BonPlanInfos",
  meta_description: "Become an official BonPlanInfos partner and generate stable monthly income. Partnership program with advantageous licenses.",
  
  unauthorized_title: "Unauthorized Access",
  unauthorized_desc: "You must be logged in to access the partner page.",
  unauthorized_cta: "Login",
  
  loading_licenses: "Loading licenses...",
  error_loading_licenses: "Error loading licenses",
  
  your_licenses_title: "Your Active Licenses",
  available_licenses_title: "Available Licenses",
  available_licenses_subtitle: "Choose the license that matches your ambitions and start generating income",

  license_features: {
    // Premium license features
    premium: {
      feature1: "Maximum zone",
      feature2: "Advanced dashboard", 
      feature3: "24/7 support",
      feature4: "Advanced training",
      feature5: "Early access"
    },
    standard: {
      feature1: "Extended zone",
      feature2: "Detailed analytics",
      feature3: "Priority support", 
      feature4: "Training"
    },
    basic: {
      feature1: "Zone management",
      feature2: "Monthly reports",
      feature3: "Basic support"
    },
    
    // Revenue descriptions
    revenue_description_40: "40% revenue share from your zone's turnover",
    revenue_description_30: "30% revenue share from your zone's turnover",
    revenue_description_20: "20% revenue share from your zone's turnover"
  },
  
  license_card: {
    active: "Active",
    expired: "Expired",
    revenue_share: "Revenue share: {{percent}}%",
    purchased_on: "Purchased on",
    expires_on: "Expires on",
    days_remaining: "{{count}} day(s) remaining"
  },
  
  per_month: "/month",
  revenue_label: "Revenue share",
  duration_label: "{{months}} months ({{days}} days)",
  
  purchase_cta: "Buy Now",
  
  error_toast: {
    title: "Error",
    login_required: "You must be logged in to purchase a license",
    purchase_failed: "Error purchasing license"
  }
},
      // ===== DASHBOARDS =====
      admin_dashboard: "Admin Dashboard",
      secretary_dashboard: "Secretary Dashboard",

      admin_dashboard: {
        unauthorized_title: "Unauthorized Access",
        unauthorized_desc:
          "You do not have the required permissions to access this page.",
        loading_error_title: "Loading Error",
        super_admin_title: "Super Admin Dashboard",
        admin_title: "Admin Dashboard - {{country}}",
        secretary_title: "Secretary Dashboard",
        welcome: "Welcome, {{name}}",
        tabs: {
          analytics: "Analytics",
          users: "Users",
          secretaries: "Secretaries",
          config: "Configuration",
          videos: "Videos",
          partners: "Partners",
          withdrawals: "Withdrawals",
          salary_withdrawals: "Salary Withdrawals",
          withdrawal_history: "Withdrawal History",
          announcements: "Announcements",
          events: "Events",
          promotions: "Promotions",
          popups: "Popups",
          credits: "Credits",
          credit_management: "Credit Management",
          reversed_credits: "Reversed Credits",
          transactions: "Transactions",
          activity_log: "Activity Log",
          payments: "Payments",
          locations: "Locations",
          badges: "Badges",
          credit_stats: "Credit Stats",
          salary: "My Salary",
          credits_history: "Credits History",
        },
        stats: {
          error_title: "Statistics Error",
          revenue_title: "Revenue (Manual Credits)",
        },
        license: {
          partner_error_title: "Error loading partner",
          status_title: "License Status",
          status_active: "Active",
          status_expired: "Expired",
          activated_on: "Activated on",
          expires_on: "Expires on",
          expired_since: "Expired for {{count}} days",
          days_remaining: "days remaining",
          renew_button: "Request Renewal",
          confirm_renewal_title: "Confirm Renewal Request?",
          confirm_renewal_desc:
            "A notification will be sent to the super administrator to review your license renewal request.",
          renewal_sent_title: "Request Sent",
          renewal_sent_desc: "Your renewal request has been sent successfully.",
          renewal_error_desc: "Error sending renewal request: ",
        },
        banner: {
          pending:
            "Your admin account is pending verification. Some features may be limited.",
          suspended:
            "Your admin account has been suspended. Please contact support.",
          expired:
            "Your license has expired. Please renew it to restore full access.",
        },
        salary_dashboard: {
          title: "Salary Dashboard",
          current_month_revenue: "Zone Revenue (Current Month)",
          personal_score: "Personal Score",
          projected_salary: "Projected Salary (Current Month)",
          request_withdrawal: "Request Withdrawal",
          history_title: "Salary History",
          month: "Month",
          revenue: "Zone Revenue",
          license_rate: "License Rate",
          score: "Score",
          salary: "Final Salary",
          status: "Status",
          paid: "Paid",
          unpaid: "Unpaid",
        },
        withdrawal_form: {
          title: "Salary Withdrawal Request",
          description: "Submit a request to withdraw your available salary.",
          available_salary: "Salary available for withdrawal",
          amount_to_withdraw: "Amount",
          withdrawal_method: "Method",
          select_method: "Select a method",
          bank_name: "Bank Name",
          account_holder: "Account Holder",
          account_number: "Account Number",
          mobile_money_operator: "Operator",
          phone_number: "Phone Number",
          reason: "Reason (Optional)",
          submit: "Submit Request",
        },
      },

      secretary_dashboard: {
        title: "Secretary Dashboard",
        welcome: "Welcome, {{name}}",
        competence_zone: "Area of competence: {{city}}, {{country}}",
        tabs: {
          user_management: "User Management",
          event_management: "Event Management",
          location_management: "Location Management",
          credit_management: "Credit Management",
          reversed_credits: "Reversed Credits",
          withdrawal_management: "Withdrawal Management",
          withdrawal_history: "Withdrawal History",
          event_moderation: "Event & Location Moderation",
        },
        credit_form: {
          title: "Credit a User",
          search_user_label: "Search for a user",
          search_user_placeholder: "Name or email...",
          user_label: "User",
          select_user_placeholder: "Select a user",
          amount_label: "Amount (coins)",
          amount_placeholder: "e.g., 100",
          reason_label: "Reason (optional)",
          reason_placeholder: "e.g., Reward",
          submit_button: "Credit User",
        },
        event_moderation: {
          title: "Event Moderation",
          zone_country: "Zone: {{country}}",
          filter_all: "All",
          filter_active: "Active",
          filter_inactive: "Inactive",
          credit_participants_button: "Credit Participants",
          confirm_delete_title: "Are you sure?",
          confirm_delete_desc:
            "This action is irreversible. The event and all its associated data (tickets, votes, etc.) will be permanently deleted.",
          event_deleted_success: "Event deleted successfully.",
          event_deleted_error: "Could not delete event.",
          status_updated_success: "Event status updated.",
          status_updated_error: "Could not update status.",
          credit_user_for_event_title: "Credit for event: {{eventName}}",
          credit_user_for_event_desc:
            "Select a user from your zone to award coins for their participation.",
          user_search_placeholder: "Search by name or email...",
          credit_amount_label: "Amount (coins)",
          credit_reason_label: "Reason for credit",
          credit_reason_placeholder: "Participation in event: {{eventName}}",
          no_users_found: "No users found in your zone.",
          credit_success_message:
            "{{userName}} has been credited with {{amount}} coins.",
          credit_error_generic: "An error occurred while crediting.",
        },
      },

      // ===== ACTIONS & BUTTONS =====
      confirm_logout: "Are you sure you want to log out?",
      cancel: "Cancel",
      confirm: "Confirm",
      back_home: "Back to Home",

      // ===== ERRORS =====
      not_found_title: "Page Not Found",
      not_found_message: "Sorry, the page you are looking for does not exist.",

      // ===== FORMS =====
      email_label: "Email address",
      password_label: "Password",
      full_name_label: "Full name",
      phone_label: "Phone number",
      username_label: "Username",
      country_label: "Country",
      city_label: "City",
      referral_code_label: "Referral code (optional)",

      // ===== AUTH TABS =====
      login_tab: "Login",
      register_tab: "Register",
      login_magic_link_tab: "Magic Link",
      send_magic_link: "Send Magic Link",
      or_continue_with: "Or continue with",
      forgot_password: "Forgot password?",

      // ===== LANDING PAGE =====
      landing: {
        title: "Your Gateway to the Best Deals",
        subtitle:
          "Discover, participate, and organize events, contests, and more. All in one place.",
        search_placeholder: "Search for an event, a place...",
        search_button: "Search",
        create_event_button: "Create Event",
        discover_events_button: "Discover Events",
        featured_title: "Events Not to Miss",
        featured_subtitle:
          "Participate in the most popular events and live unforgettable moments.",
        categories_title: "Explore by Categories",
        categories_subtitle: "Find events that match your interests.",
        how_it_works_title: "How It Works",
        how_it_works_step1_title: "Discover",
        how_it_works_step1_desc:
          "Explore a multitude of events, contests, and places.",
        how_it_works_step2_title: "Participate",
        how_it_works_step2_desc:
          "Buy tickets, vote for your favorite candidates, and much more.",
        how_it_works_step3_title: "Win & Enjoy",
        how_it_works_step3_desc:
          "Earn rewards, win contests, and live unique experiences.",
        how_it_works_step4_title: "Organize",
        how_it_works_step4_desc: "Create and manage your own events with ease.",
        cta_title: "Ready to start the adventure?",
        cta_subtitle:
          "Join our community today and never miss a good deal again.",
        cta_button: "Sign Up for Free",
      },

      // ===== FOOTER =====
      footer: {
        home: "Home",
        about: "About",
        partnership: "Partnership",
        sponsors: "Sponsors",
        privacy: "Privacy Policy",
        terms: "Terms of Use",
        contact: "Contact",
        tagline: "Your ultimate guide to the best events and entertainment.",
        platform: "Platform",
        company: "Company",
        legal: "Legal",
        how_it_works: "How it works",
        help: "Help Center",
        faq: "FAQ",
        data_protection: "Data Protection",
        legal_mentions: "Legal Mentions",
      },

      // ===== MARKETING =====
      marketing: {
 simulation: {
    title: "Revenue Simulator",
    subtitle: "Calculate your potential earnings with our platform",
    event_type: "Event Type",
    ticket_price: "Price per unit",
    number_of_tickets: "Number of participants",
    potential_revenue: "Potential Revenue",
    platform_fee: "Platform fee (5%)",
    your_net_earning: "Your net earnings",
    cta: "Start Earning Now",
    note: "Simulation based on standard 5% platform fee. Actual results may vary."
  },

        badge: "For Organizers & Creators",
        title: "Take Your Events to the Next Level",
        subtitle:
          "Reach a wider audience, engage with your community, and monetize your content like never before. BonPlanInfos is the all-in-one platform for successful events.",
        createEventCta: "Create My Event Now",
        becomePartnerCta: "Become a Partner",
        trust: "Trusted by hundreds of organizers in Africa.",
        why: {
          title: "Why choose BonPlanInfos?",
          subtitle:
            "We give you the tools to make every event a resounding success.",
          feature1: "Maximum Visibility",
          feature1_desc:
            "Leverage our large audience to promote your events and reach thousands of potential attendees.",
          feature2: "Easy Monetization",
          feature2_desc:
            "Ticket sales, paid voting, raffles, stands... Diversify your income streams in just a few clicks.",
          feature3: "Interaction & Engagement",
          feature3_desc:
            "Create a strong bond with your community through our interaction tools: comments, shares, and reactions.",
          feature4: "Real-Time Statistics",
          feature4_desc:
            "Track the performance of your events with precise data to optimize your strategies.",
          feature5: "Security & Reliability",
          feature5_desc:
            "A robust and secure platform to manage your transactions and your attendees' data.",
          feature6: "Dedicated Support",
          feature6_desc:
            "Our team is here to support you at every stage of your organization.",
        },
        revenue_simulation: {
          title: "Imagine Your Potential Monthly Income...",
          subtitle:
            "Every interaction on your content generates coins, convertible into real money. Here is a simple simulation based on popular events.",
          summary_title: "Monthly Summary (Simulation)",
          total_interactions: "Total Interactions",
          revenue_coins: "Revenue in Coins",
          revenue_fcfa: "Revenue in FCFA",
          miss_ci: "Miss Côte d'Ivoire Contest",
          music_festival: "Urban Music Festival",
          football_tournament: "Inter-neighborhood Football Tournament",
          entrepreneur_conf: "Entrepreneurship Conference",
          shares: "Shares",
          downloads: "Downloads",
          views: "Views",
          comments: "Comments",
          reactions: "Reactions",
          total_revenue: "Total Revenue",
          interactions: "Interactions",
          how_it_works_title: "How it Works",
          organizer: "Organizer",
          user: "User",
          easy_withdrawal: "Easy Withdrawal",
          from_50_pi: "From 50π",
          ready_cta_title: "Ready to turn your ideas into success?",
          ready_cta_subtitle: "Join thousands of organizers who trust us.",
          cta_button: "Launch my first event",
        },
        testimonials: {
          title: "They trust us",
          dj_kerozen_quote:
            "With BonPlanInfos, I sold out my concert in record time. The platform's virality is just incredible!",
          fatou_sylla_quote:
            "I organize all my clients' events through the app. It simplifies my life and my clients love it.",
          eric_b_quote:
            "We funded our entire integration weekend by monetizing our party. A must-have!",
          bintou_diallo_name: "Bintou Diallo",
          bintou_diallo_role: "Show Promoter",
          kwesi_mensah_name: "Kwesi Mensah",
          kwesi_mensah_role: "Wedding Planner",
          aisha_traore_name: "Aïsha Traoré",
          aisha_traore_role: "Student & BDE President",
          amadou_ba_name: "Amadou Ba",
          amadou_ba_role: "Personal Development Coach",
          amadou_ba_quote:
            "Managing registrations for my seminars has become child's play. I save so much time!",
          chimamanda_ngozi_name: "Chimamanda Ngozi",
          chimamanda_ngozi_role: "Literary Festival Organizer",
          chimamanda_ngozi_quote:
            "The live voting feature added an exciting interactive dimension to our literary prize.",
          didier_kouame_name: "Didier Kouamé",
          didier_kouame_role: "Sports Club Manager",
          didier_kouame_quote:
            "The online raffle generated unexpected revenue for our club. It's simple and incredibly effective.",
          mariam_kone_name: "Mariam Koné",
          mariam_kone_role: "Fashion Designer",
          mariam_kone_quote:
            "My fashion show got national reach thanks to the promotion on BonPlanInfos. The impact was immediate.",
          femi_adebayo_name: "Femi Adebayo",
          femi_adebayo_role: "Food Truck Owner",
          femi_adebayo_quote:
            "Renting a stand at the biggest events in town has never been easier. My business has exploded!",
          abena_asante_name: "Abena Asante",
          abena_asante_role: "Painter",
          abena_asante_quote:
            "I sold more canvases during my online exhibition than I could have ever imagined. The visibility is top-notch.",
          yannick_zongo_name: "Yannick Zongo",
          yannick_zongo_role: "E-sport Tournament Organizer",
          yannick_zongo_quote:
            "The integrated ticketing and QR code check-in system are perfect for managing a large number of participants.",
        },
        cta: {
          title: "Ready to take your events to the next level?",
          subtitle:
            "Don't let complexity hold you back. With BonPlanInfos, event organizing becomes simple, profitable, and fun.",
          cta: "Become an Official Partner",
        },
        meta_title: "Partnership & Marketing - BonPlanInfos",
        meta_description:
          "Join BonPlanInfos as a partner or organizer. Maximize your event's visibility, engage your community, and increase your revenue.",
      },

      // ===== WALLET & COINS =====
      wallet_info_modal: {
        title: "What are coins (π) for?",
        intro:
          "Coins are the virtual currency of BonPlanInfos. They allow you to access exclusive content and interact with events.",
        free_coins_title: "Free Coins (🎁)",
        free_coins_desc:
          "You earn them by watching video ads or during promotions. They allow you to perform basic actions.",
        paid_coins_title: "Purchased Coins (💳)",
        paid_coins_desc:
          "Purchased with real money, they unlock all features and directly support the organizers.",
        usage_title: "How to use them?",
        usage_item1: "Access protected events.",
        usage_item2: "Like, comment, download exclusive content.",
        usage_item3: "Participate in votes, raffles, and much more.",
        cta_button: "Buy Coins",
        usage_priority: "Free coins are always used first for your actions!",
      },

      // ===== EVENTS =====
      events_title: "Featured Events",
      all_events_button: "All Events",
      promoted_events: "Sponsored Events",
      popular_contests: "Popular Contests",
      see_all_contests: "See all contests",

      event_card: {
        days_remaining: "{{count}} day remaining",
        days_remaining_plural: "{{count}} days remaining",
        event_ended: "Ended",
        event_starting_today: "Starts today",
        starting_from: "From",
      },

      filters: {
        all: "All",
        promoted: "Boosted",
        live: "Live",
        today: "Today",
        this_week: "This week",
        free: "Free",
      },

      event_detail: {
        by_organizer: "By",
        share: "Share",
        location: "Location",
        date_time: "Date and Time",
        get_directions: "Get Directions",
        about_event: "About the Event",
        tags: "Tags",
        unlock_event_to_see_content:
          "Unlock this event to see exclusive content!",
        unlock_button: "Unlock for {{price}}π",
        unlocking: "Unlocking...",
        free_access: "Free Access",
        owner_access: "Owner Access",
        comments: "Comments",
        leave_comment: "Leave a comment...",
        submit_comment: "Submit",
        comment_cost: "Comment for {{price}}π",
        ticketing: "Ticketing",
        voting: "Voting",
        raffle: "Raffle",
        stands: "Stands",
      },

      // ===== SOCIAL INTERACTIONS =====
      social_interactions: {
        like: "Like",
        comment: "Comment",
        share: "Share",
        download: "Download",
        cost: "{{price}}π",
        comment_placeholder: "Add a comment...",
        post_comment: "Post",
      },

      // ===== TOASTS & NOTIFICATIONS =====
      toasts: {
        copied_to_clipboard: "Copied to clipboard!",
        feature_not_implemented:
          "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
      },

      // ===== ADMIN =====
      admin: {
        tabs: {
          analytics: "Analytics",
          users: "Users",
          partners: "Partners",
          events: "Events",
          locations: "Locations",
          promotions: "Promotions",
          credits: "Credits",
          config: "Configuration",
          withdrawals: "Withdrawals",
          videos: "Videos",
          announcements: "Announcements",
          welcome_popup: "Welcome Popup",
        },
      },

      // ===== DISCOVER PAGE =====
      discover_places: "Discover Places",
      discover_more_places: "Discover more places",

      discover_page: {
        title: "Discover Places",
        subtitle: "Find new places recommended by the community.",
        search_placeholder: "Search for a place, category, city...",
        filter_by_type: "Filter by type",
        no_locations_found: "No locations found.",
        no_locations_description:
          "Try broadening your search or selecting fewer filters.",
        add_new_location: "Add a new place",
        add_place: "Add a Place",
      },

      add_location: {
        title: "Add a New Place",
        subtitle: "Share a great spot with the community.",
        location_name: "Place Name",
        location_description: "Description",
        location_type: "Place Type",
        address: "Address",
        city: "City",
        country: "Country",
        website: "Website (optional)",
        phone: "Phone (optional)",
        submit: "Submit Place",
        success_title: "Place Submitted!",
        success_message:
          "Thanks! Your place has been submitted and will be reviewed by our team.",
      },

      // ===== TICKET VERIFICATION =====
      verify_ticket: {
        title: "Ticket Verification",
        scan_instruction:
          "Scan the ticket's QR code or enter the scanner code.",
        scanner_code_label: "Scanner Code",
        start_session: "Start Session",
        stop_session: "Stop Session",
        scan_ticket: "Scan a Ticket",
        camera_permission_denied: "Camera permission denied.",
        camera_error: "Camera error:",
        scan_result: "Scan Result",
        scan_again: "Scan Again",
        valid_ticket: "Valid Ticket",
        invalid_ticket: "Invalid Ticket",
        ticket_number: "Ticket Number:",
        ticket_type: "Ticket Type:",
        attendee_name: "Attendee Name:",
        event_title: "Event Title:",
        scan_time: "Scan Time:",
        error: "Error",
        session_active: "Verification session active",
        session_stopped: "Verification session stopped",
        verifying_ticket: "Verifying ticket...",
        enter_scanner_code: "Please enter a valid scanner code.",
      },

      // ===== EVENT CREATION =====
      create_event: {
        title: "Create an Event",
        subtitle: "Choose the type of event you want to organize.",
        simple: "Simple",
        simple_desc:
          "Quickly post an informational event (free or paid at the door).",
        ticketing: "Ticketing",
        ticketing_desc: "Sell tickets with different prices and options.",
        voting: "Voting Contest",
        voting_desc:
          "Organize a contest where participants vote for candidates.",
        raffle: "Raffle",
        raffle_desc: "Create a raffle with tickets and prizes to be won.",
        stands: "Stand Rental",
        stands_desc: "Manage the rental of stands for a trade show or market.",
      },

      create_ticketing_event: {
        title: "Create an Event with Ticketing",
        event_details: "Event Details",
        event_title: "Event Title",
        event_description: "Description",
        event_cover_image: "Cover Image",
        upload_image: "Upload Image",
        event_date: "Event Date",
        category: "Category",
        select_category: "Select a category",
        location: "Location",
        address: "Address",
        city: "City",
        country: "Country",
        ticket_types: "Ticket Types",
        add_ticket_type: "Add Ticket Type",
        ticket_name: "Ticket Name (e.g., Standard, VIP)",
        ticket_price_fcfa: "Price (FCFA)",
        ticket_quantity: "Quantity Available",
        ticket_benefits: "Benefits (comma-separated)",
        remove: "Remove",
        verification_options: "Verification Options",
        enable_verification: "Enable QR code ticket verification",
        submit: "Create Event",
        event_created_success: "Event created successfully!",
        editing_event: "Editing Event",
      },

      ticketing_interface: {
        select_ticket_type: "Select your tickets",
        total_cost: "Total Cost:",
        buy_tickets: "Buy Tickets",
        sold_out: "Sold Out",
        sales_ended: "Sales Ended",
        available: "available",
        benefits: "Benefits:",
      },

      // ===== COMMON FORMS =====
      select_country: "Select a country",
      select_city: "Select a city",
      choose_file: "Choose file",
      no_file_chosen: "No file chosen",

      // ===== COMMON =====
      common: {
        error_title: "Error",
        confirm: "Confirm",
        cancel: "Cancel",
        delete: "Delete",
        close: "Close",
        save: "Save",
        edit: "Edit",
        loading: "Loading...",
        success_title: "Success",
        search: "Search...",
        activate: "Activate",
        deactivate: "Deactivate",
        credit: "Credit",
        retry: "Retry",
      },

      // ===== PRIVACY POLICY =====
      privacy: {
        meta_title: "Privacy Policy",
        meta_description:
          "Read our privacy policy to understand how we collect, use, and protect your personal data.",
        title: "Privacy Policy",
        last_updated: "Last updated: November 02, 2025",
        introduction: {
          title: "1. Introduction",
          p1: "This privacy policy explains how BonPlanInfos collects, uses, and protects your personal information when you use our platform.",
        },
        data_collected: {
          title: "2. Data We Collect",
          p1: "We collect various information to provide and improve our services:",
          item1:
            "<b>Account Information:</b> Name, email address, country, city, account type.",
          item2:
            "<b>Usage Data:</b> Pages visited, interactions with events, searches performed.",
          item3:
            "<b>User-Generated Content:</b> Events created, comments, photos.",
          item4:
            "<b>Transaction Data:</b> History of coin purchases and earning withdrawals.",
        },
        data_usage: {
          title: "3. How We Use Your Data",
          p1: "Your data is used to:",
          item1: "Provide, maintain, and improve the platform.",
          item2: "Personalize your experience by recommending relevant events.",
          item3: "Process transactions and payments.",
          item4: "Communicate with you regarding your account or our services.",
        },
        cookies: {
          title: "4. Cookies",
          p1: "We use cookies to ensure the proper functioning of the site, analyze our traffic, and personalize content. You can manage your cookie preferences at any time.",
        },
        data_sharing: {
          title: "5. Data Sharing",
          p1: "We do not share your personal information with third parties, unless it is necessary to provide the service (e.g., with payment processors) or required by law.",
        },
        security: {
          title: "6. Security",
          p1: "We implement technical and organizational security measures to protect your data against unauthorized access, loss, or destruction.",
        },
        your_rights: {
          title: "7. Your Rights",
          p1: "In accordance with regulations, you have the following rights:",
          item1:
            "<b>Right of Access:</b> You can request a copy of the data we hold about you.",
          item2:
            "<b>Right to Rectification:</b> You can correct any inaccurate information.",
          item3:
            "<b>Right to Erasure:</b> You can request the deletion of your account and data.",
          p2: "To exercise these rights, please contact us at the address below.",
        },
        contact: {
          title: "8. Contact",
          p1: "For any questions regarding this privacy policy, please contact us at:",
          email: "privacy@bonplaninfos.net",
        },
      },

      // ===== LEGAL MENTIONS =====
      legal_mentions: {
        meta_title: "Legal Mentions",
        meta_description:
          "Consult the legal mentions of BonPlanInfos for information on the site editor, hosting, and our legal obligations.",
        title: "Legal Mentions",
        subtitle: "Legal information concerning the BonPlanInfos platform.",
        lastUpdate: "Last updated: November 02, 2025",
        sections: {
          editor: {
            title: "Site Editor",
            content: "The BonPlanInfos site is edited by:",
            company: "BON PLAN INFOS (BPI)",
            capital:
              "Simplified joint-stock company (SAS) with a capital of 1,000,000 FCFA",
            address: "Head office: Abidjan, Côte d'Ivoire",
            phone: "Phone: (+225) 07 12 27 53 74",
            email: "contact@bonplaninfos.net",
          },
          director: {
            title: "Publication Director",
            content:
              "The publication director is Mr. S.Rayane KIBORA, in his capacity as President of BON PLAN INFOS (BPI).",
          },
          hosting: {
            title: "Hosting",
            content: "The platform is hosted by:",
            company: "Hostinger International Ltd.",
            address: "61 Lordou Vironos Street, 6023 Larnaca, Cyprus",
            website: "www.hostinger.com",
          },
          data: {
            title: "Personal Data Protection",
            content1:
              "In accordance with current data protection legislation, you have the right to access, rectify, delete, and object to your personal data. To exercise this right, please contact our Data Protection Officer (DPO) at: ",
            content2:
              "For more information, please consult our <1>Privacy Policy</1>.",
          },
          cookies: {
            title: "Cookies",
            content1:
              "The site uses cookies to improve the user experience. These cookies are used to:",
            item1:
              "Ensure the proper functioning of the site (session cookies).",
            item2: "Analyze audience and performance (analytics cookies).",
            item3: "Offer personalized advertising (marketing cookies).",
            content2:
              "You can configure your cookie preferences via our consent banner.",
          },
          ip: {
            title: "Intellectual Property",
            content:
              "All content on this site (texts, images, videos, logos, source code) is the exclusive property of BON PLAN INFOS (BPI) or its partners. Any reproduction, even partial, is strictly prohibited without prior authorization.",
          },
          liability: {
            title: "Limitation of Liability",
            content:
              "BonPlanInfos strives to provide accurate and up-to-date information but cannot guarantee the accuracy of all information. The use of information and content available on the entire site shall in no case engage the liability of the publisher, for any reason whatsoever.",
          },
          links: {
            title: "Hyperlinks",
            content:
              "The platform may contain hyperlinks to other sites. BonPlanInfos is not responsible for the content of these third-party sites and cannot be held liable for any damages resulting from their consultation.",
          },
          applicableLaw: {
            title: "Applicable Law",
            content:
              "These legal mentions are subject to Ivorian law. In case of a dispute, the courts of Abidjan will have sole jurisdiction.",
          },
        },
      },
    },
  },
};

// Initialisation de i18n
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    debug: true,
    fallbackLng: "fr",
    interpolation: {
      escapeValue: false,
    },
    resources: resources,
    detection: {
      order: [
        "queryString",
        "cookie",
        "localStorage",
        "navigator",
        "htmlTag",
        "path",
        "subdomain",
      ],
      caches: ["cookie"],
    },
  });

export default i18n;
