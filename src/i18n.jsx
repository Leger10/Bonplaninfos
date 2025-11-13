import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  fr: {
    translation: {
      "nav": {
        "home": "Accueil",
        "discover": "Découvrir",
        "events": "Événements",
        "partnership": "Partenariat",
        "profile": "Profil",
        "wallet": "Portefeuille"
      },
      "auth": {
        "fetch_error": {
          "title": "Erreur de Connexion",
          "description": "Impossible de récupérer les données. Veuillez vérifier votre connexion internet et rafraîchir la page."
        },
        "login": {
          "meta_title": "Connexion",
          "meta_description": "Connectez-vous à votre compte BonPlanInfos.",
          "title": "Connexion",
          "subtitle": "Connectez-vous pour continuer.",
          "button": "Se connecter",
          "switch_text": "Pas encore de compte ?",
          "switch_button": "Inscrivez-vous",
          "error_invalid_credentials": "Email ou mot de passe incorrect."
        },
        "register": {
          "meta_title": "Inscription",
          "meta_description": "Créez un compte sur BonPlanInfos et commencez à découvrir les meilleurs plans.",
          "title": "S'inscrire",
          "subtitle": "Créez votre compte.",
          "button": "S'inscrire",
          "country_city_required": "Veuillez sélectionner un pays et une ville.",
          "switch_text": "Déjà un compte ?",
          "switch_button": "Connectez-vous",
          "confirmation_email_title": "Vérifiez vos emails !",
          "confirmation_email_description": "Nous vous avons envoyé un email de confirmation. Veuillez consulter votre boîte de réception et cliquer sur le lien pour activer votre compte.",
          "terms_agreement": "J'accepte les <1>Conditions Générales d'Utilisation</1>",
          "terms_required": "Vous devez accepter les conditions d'utilisation."
        },
        "full_name": "Nom complet",
        "country": "Pays",
        "select_country_placeholder": "Sélectionnez votre pays",
        "city": "Ville",
        "select_city_placeholder": "Sélectionnez votre ville",
        "choose_role": "Vous êtes ?",
        "choose_role_placeholder": "Choisissez votre rôle",
        "role_user": "Utilisateur",
        "role_organizer": "Organisateur",
        "email": "Email",
        "password": "Mot de passe",
        "referral_code_optional": "Code de parrainage (Optionnel)"
      },
      "home": "Accueil",
      "events": "Événements",
      "contests": "Concours",
      "discover": "Découvrir",
      "login": "Connexion",
      "logout": "Déconnexion",
      "profile": "Profil",
      "wallet": "Portefeuille",
      "settings": "Paramètres",
      "admin_dashboard": "Tableau de bord Admin",
      "secretary_dashboard": "Tableau de bord Secrétaire",
      "confirm_logout": "Voulez-vous vraiment vous déconnecter ?",
      "cancel": "Annuler",
      "confirm": "Confirmer",
      "back_home": "Retour à l'accueil",
      "not_found_title": "Page non trouvée",
      "not_found_message": "Désolé, la page que vous recherchez n'existe pas.",
      "email_label": "Adresse e-mail",
      "password_label": "Mot de passe",
      "full_name_label": "Nom complet",
      "phone_label": "Numéro de téléphone",
      "username_label": "Nom d'utilisateur",
      "country_label": "Pays",
      "city_label": "Ville",
      "referral_code_label": "Code de parrainage (facultatif)",
      "login_tab": "Se connecter",
      "register_tab": "S'inscrire",
      "login_magic_link_tab": "Lien magique",
      "send_magic_link": "Envoyer le lien magique",
      "or_continue_with": "Ou continuer avec",
      "forgot_password": "Mot de passe oublié ?",
      "events_title": "Événements à la Une",
      "all_events_button": "Tous les événements",
      "promoted_events": "Événements Sponsorisés",
      "popular_contests": "Concours Populaires",
      "see_all_contests": "Voir tous les concours",
      "discover_places": "Découvrir des lieux",
      "discover_more_places": "Découvrir plus de lieux",
      "landing": {
        "title": "Votre Portail pour les Meilleurs Plans",
        "subtitle": "Découvrez, participez et organisez des événements, concours, et plus encore. Le tout, en un seul endroit.",
        "search_placeholder": "Recherchez un événement, un lieu...",
        "search_button": "Rechercher",
        "create_event_button": "Créer un Événement",
        "discover_events_button": "Découvrir les Événements",
        "featured_title": "Événements à ne pas manquer",
        "featured_subtitle": "Participez aux événements les plus populaires et vivez des moments inoubliables.",
        "categories_title": "Explorez par Catégories",
        "categories_subtitle": "Trouvez des événements qui correspondent à vos centres d'intérêt.",
        "how_it_works_title": "Comment ça marche ?",
        "how_it_works_step1_title": "Découvrez",
        "how_it_works_step1_desc": "Explorez une multitude d'événements, de concours et de lieux.",
        "how_it_works_step2_title": "Participez",
        "how_it_works_step2_desc": "Achetez des billets, votez pour vos candidats favoris, et bien plus.",
        "how_it_works_step3_title": "Gagnez & Profitez",
        "how_it_works_step3_desc": "Gagnez des récompenses, remportez des concours et vivez des expériences uniques.",
        "how_it_works_step4_title": "Organisez",
        "how_it_works_step4_desc": "Créez et gérez vos propres événements en toute simplicité.",
        "cta_title": "Prêt à commencer l'aventure ?",
        "cta_subtitle": "Rejoignez notre communauté dès aujourd'hui et ne manquez plus aucun bon plan.",
        "cta_button": "Inscrivez-vous Gratuitement"
      },
      "footer": {
        "home": "Accueil",
        "about": "À propos",
        "partnership": "Partenariat",
        "sponsors": "Sponsors",
        "privacy": "Politique de confidentialité",
        "terms": "Conditions d'utilisation",
        "contact": "Contact",
        "tagline": "Votre guide ultime pour les meilleurs événements et divertissements.",
        "platform": "Plateforme",
        "company": "Entreprise",
        "legal": "Légal",
        "how_it_works": "Comment ça marche ?",
        "help": "Centre d'aide",
        "faq": "FAQ",
        "data_protection": "Protection des données",
        "legal_mentions": "Mentions légales"
      },
      "marketing": {
        "badge": "Pour les Organisateurs & Créateurs",
        "title": "Donnez une Nouvelle Dimension à Vos Événements",
        "subtitle": "Atteignez une audience plus large, interagissez avec votre communauté et monétisez votre contenu comme jamais auparavant. BonPlanInfos est la plateforme tout-en-un pour des événements réussis.",
        "createEventCta": "Créer mon événement maintenant",
        "becomePartnerCta": "Devenir Partenaire",
        "trust": "Reconnu par des centaines d'organisateurs en Afrique.",
        "why": {
          "title": "Pourquoi choisir BonPlanInfos ?",
          "subtitle": "Nous vous donnons les outils pour faire de chaque événement un succès retentissant.",
          "feature1": "Visibilité Maximale",
          "feature1_desc": "Profitez de notre large audience pour promouvoir vos événements et atteindre des milliers de participants potentiels.",
          "feature2": "Monétisation Facile",
          "feature2_desc": "Vente de billets, votes payants, tombolas, stands... Diversifiez vos sources de revenus en quelques clics.",
          "feature3": "Interaction & Engagement",
          "feature3_desc": "Créez un lien fort avec votre communauté grâce à nos outils d'interaction : commentaires, partages, et réactions.",
          "feature4": "Statistiques en Temps Réel",
          "feature4_desc": "Suivez la performance de vos événements avec des données précises pour optimiser vos stratégies.",
          "feature5": "Sécurité & Fiabilité",
          "feature5_desc": "Une plateforme robuste et sécurisée pour gérer vos transactions et les données de vos participants.",
          "feature6": "Support Dédié",
          "feature6_desc": "Notre équipe est à votre écoute pour vous accompagner à chaque étape de votre organisation."
        },
        "revenue_simulation": {
          "title": "Imaginez Vos Revenus Mensuels Potentiels...",
          "subtitle": "Chaque interaction sur votre contenu génère des pièces, convertibles en argent réel. Voici une simulation simple basée sur des événements populaires.",
          "summary_title": "Résumé Mensuel (Simulation)",
          "total_interactions": "Interactions Totales",
          "revenue_coins": "Revenus en Pièces",
          "revenue_fcfa": "Revenus en FCFA",
          "miss_ci": "Concours Miss Côte d'Ivoire",
          "music_festival": "Festival de Musique Urbaine",
          "football_tournament": "Tournoi de Foot Inter-quartiers",
          "entrepreneur_conf": "Conférence sur l'Entrepreneuriat",
          "shares": "Partages",
          "downloads": "Téléchargements",
          "views": "Vues",
          "comments": "Commentaires",
          "reactions": "Réactions",
          "total_revenue": "Revenu Total",
          "interactions": "Interactions",
          "how_it_works_title": "Comment ça marche ?",
          "organizer": "Organisateur",
          "user": "Utilisateur",
          "easy_withdrawal": "Retrait facile",
          "from_50_pi": "Dès 50π",
          "ready_cta_title": "Prêt à transformer vos idées en succès ?",
          "ready_cta_subtitle": "Rejoignez des milliers d'organisateurs qui nous font confiance.",
          "cta_button": "Lancer mon premier événement"
        },
        "testimonials": {
          "title": "Ils nous font confiance",
          "dj_kerozen_quote": "Avec BonPlanInfos, j'ai rempli ma salle de concert en un temps record. La viralité de la plateforme est juste incroyable !",
          "fatou_sylla_quote": "J'organise tous les événements de mes clients via l'application. Ça me simplifie la vie et mes clients adorent.",
          "eric_b_quote": "On a financé tout notre week-end d'intégration grâce à la monétisation de notre soirée. Un must-have !",
          "bintou_diallo_name": "Bintou Diallo",
          "bintou_diallo_role": "Promotrice de Spectacles",
          "kwesi_mensah_name": "Kwesi Mensah",
          "kwesi_mensah_role": "Wedding Planner",
          "aisha_traore_name": "Aïsha Traoré",
          "aisha_traore_role": "Étudiante & Présidente BDE",
          "amadou_ba_name": "Amadou Ba",
          "amadou_ba_role": "Coach en développement personnel",
          "amadou_ba_quote": "La gestion des inscriptions pour mes séminaires est devenue un jeu d'enfant. Je gagne un temps fou !",
          "chimamanda_ngozi_name": "Chimamanda Ngozi",
          "chimamanda_ngozi_role": "Organisatrice de festival littéraire",
          "chimamanda_ngozi_quote": "La fonctionnalité de vote en direct a ajouté une dimension interactive et passionnante à notre prix littéraire.",
          "didier_kouame_name": "Didier Kouamé",
          "didier_kouame_role": "Gérant de club sportif",
          "didier_kouame_quote": "La tombola en ligne a généré des revenus inattendus pour notre club. C'est simple et terriblement efficace.",
          "mariam_kone_name": "Mariam Koné",
          "mariam_kone_role": "Créatrice de mode",
          "mariam_kone_quote": "Mon défilé a eu une portée nationale grâce à la promotion sur BonPlanInfos. Les retombées ont été immédiates.",
          "femi_adebayo_name": "Femi Adebayo",
          "femi_adebayo_role": "Propriétaire de food truck",
          "femi_adebayo_quote": "Louer un stand sur les plus gros événements de la ville n'a jamais été aussi simple. Mon business a explosé !",
          "abena_asante_name": "Abena Asante",
          "abena_asante_role": "Artiste peintre",
          "abena_asante_quote": "J'ai vendu plus de toiles lors de mon vernissage en ligne que je n'aurais jamais imaginé. La visibilité est top.",
          "yannick_zongo_name": "Yannick Zongo",
          "yannick_zongo_role": "Organisateur de tournois e-sport",
          "yannick_zongo_quote": "La billetterie intégrée et le système de check-in par QR code sont parfaits pour gérer un grand nombre de participants."
        },
        "cta": {
          "title": "Vous êtes prêt à faire passer vos événements au niveau supérieur ?",
          "subtitle": "Ne laissez pas la complexité vous freiner. Avec BonPlanInfos, l'organisation d'événements devient simple, rentable et amusante.",
          "cta": "Devenir Partenaire Officiel"
        },
        "meta_title": "Partenariat & Marketing - BonPlanInfos",
        "meta_description": "Rejoignez BonPlanInfos en tant que partenaire ou organisateur. Maximisez la visibilité de vos événements, engagez votre communauté et augmentez vos revenus."
      },
      "wallet_info_modal": {
        "title": "À quoi servent les pièces (π) ?",
        "intro": "Les pièces sont la monnaie virtuelle de BonPlanInfos. Elles vous permettent d'accéder à des contenus exclusifs et d'interagir avec les événements.",
        "free_coins_title": "Pièces Gratuites (🎁)",
        "free_coins_desc": "Vous les gagnez en regardant des vidéos publicitaires ou lors de promotions. Elles vous permettent de réaliser des actions de base.",
        "paid_coins_title": "Pièces Achetées (💳)",
        "paid_coins_desc": "Achetées avec de l'argent réel, elles débloquent toutes les fonctionnalités et soutiennent directement les organisateurs.",
        "usage_title": "Comment les utiliser ?",
        "usage_item1": "Accéder à des événements protégés.",
        "usage_item2": "Liker, commenter, télécharger du contenu exclusif.",
        "usage_item3": "Participer à des votes, tombolas et bien plus.",
        "cta_button": "Acheter des pièces",
        "usage_priority": "Les pièces gratuites sont toujours utilisées en premier pour vos actions !"
      },
      "event_card": {
        "days_remaining": "{{count}} jour restant",
        "days_remaining_plural": "{{count}} jours restants",
        "event_ended": "Terminé",
        "event_starting_today": "Commence aujourd'hui",
        "starting_from": "À partir de"
      },
      "filters": {
        "all": "Tout",
        "promoted": "Boostés",
        "live": "En direct",
        "today": "Aujourd'hui",
        "this_week": "Cette semaine",
        "free": "Gratuits"
      },
      "events_page": {
        "title": "Découvrez tous les événements",
        "search_placeholder": "Rechercher un événement par nom, ville, catégorie...",
        "no_events_title": "Aucun événement trouvé",
        "no_events_description": "Essayez d'ajuster vos filtres de recherche ou revenez plus tard.",
        "load_more": "Voir plus"
      },
      "event_detail": {
        "by_organizer": "Par",
        "share": "Partager",
        "location": "Lieu",
        "date_time": "Date et Heure",
        "get_directions": "Obtenir l'itinéraire",
        "about_event": "À propos de l'événement",
        "tags": "Tags",
        "unlock_event_to_see_content": "Débloquez cet événement pour voir le contenu exclusif !",
        "unlock_button": "Débloquer pour {{price}}π",
        "unlocking": "Déblocage...",
        "free_access": "Accès gratuit",
        "owner_access": "Accès propriétaire",
        "comments": "Commentaires",
        "leave_comment": "Laissez un commentaire...",
        "submit_comment": "Envoyer",
        "comment_cost": "Commenter pour {{price}}π",
        "ticketing": "Billetterie",
        "voting": "Vote",
        "raffle": "Tombola",
        "stands": "Stands"
      },
      "social_interactions": {
        "like": "J'aime",
        "comment": "Commenter",
        "share": "Partager",
        "download": "Télécharger",
        "cost": "{{price}}π",
        "comment_placeholder": "Ajouter un commentaire...",
        "post_comment": "Publier"
      },
      "toasts": {
        "copied_to_clipboard": "Copié dans le presse-papiers !",
        "feature_not_implemented": "🚧 Cette fonctionnalité n'est pas encore implémentée—mais ne vous inquiétez pas ! Vous pouvez la demander dans votre prochain prompt ! 🚀"
      },
      "admin": {
        "tabs": {
          "analytics": "Analyses",
          "users": "Utilisateurs",
          "partners": "Partenaires",
          "events": "Événements",
          "locations": "Lieux",
          "promotions": "Promotions",
          "credits": "Crédits",
          "config": "Configuration",
          "withdrawals": "Retraits",
          "videos": "Vidéos",
          "announcements": "Annonces",
          "welcome_popup": "Popup Accueil"
        }
      },
      "discover_page": {
        "title": "Découvrir",
        "search_placeholder": "Rechercher un lieu, une catégorie, une ville...",
        "filter_by_type": "Filtrer par type",
        "no_locations_found": "Aucun lieu trouvé.",
        "no_locations_description": "Essayez d'élargir votre recherche ou de sélectionner moins de filtres.",
        "add_new_location": "Ajouter un nouveau lieu"
      },
      "add_location": {
        "title": "Ajouter un nouveau lieu",
        "subtitle": "Partagez un super endroit avec la communauté.",
        "location_name": "Nom du lieu",
        "location_description": "Description",
        "location_type": "Type de lieu",
        "address": "Adresse",
        "city": "Ville",
        "country": "Pays",
        "website": "Site web (facultatif)",
        "phone": "Téléphone (facultatif)",
        "submit": "Soumettre le lieu",
        "success_title": "Lieu soumis !",
        "success_message": "Merci ! Votre lieu a été soumis et sera examiné par notre équipe."
      },
      "verify_ticket": {
        "title": "Vérification de Billet",
        "scan_instruction": "Scannez le code QR du billet ou entrez le code du scanner.",
        "scanner_code_label": "Code du Scanner",
        "start_session": "Démarrer la session",
        "stop_session": "Arrêter la session",
        "scan_ticket": "Scanner un Billet",
        "camera_permission_denied": "Permission de la caméra refusée.",
        "camera_error": "Erreur de caméra :",
        "scan_result": "Résultat du scan",
        "scan_again": "Scanner à nouveau",
        "valid_ticket": "Billet Valide",
        "invalid_ticket": "Billet Invalide",
        "ticket_number": "Numéro de billet:",
        "ticket_type": "Type de billet:",
        "attendee_name": "Nom du participant:",
        "event_title": "Titre de l'événement:",
        "scan_time": "Heure de scan:",
        "error": "Erreur",
        "session_active": "Session de vérification active",
        "session_stopped": "Session de vérification arrêtée",
        "verifying_ticket": "Vérification du billet...",
        "enter_scanner_code": "Veuillez entrer un code de scanner valide."
      },
       "create_event": {
        "title": "Créer un Événement",
        "subtitle": "Choisissez le type d'événement que vous souhaitez organiser.",
        "simple": "Simple",
        "simple_desc": "Publiez rapidement un événement informatif (gratuit ou payant à l'entrée).",
        "ticketing": "Billetterie",
        "ticketing_desc": "Vendez des billets avec différents tarifs et options.",
        "voting": "Concours de Vote",
        "voting_desc": "Organisez un concours où les participants votent pour des candidats.",
        "raffle": "Tombola",
        "raffle_desc": "Créez une tombola avec des tickets et des prix à gagner.",
        "stands": "Location de Stands",
        "stands_desc": "Gérez la location de stands pour un salon ou un marché."
      },
      "create_ticketing_event": {
        "title": "Créer un Événement avec Billetterie",
        "event_details": "Détails de l'Événement",
        "event_title": "Titre de l'événement",
        "event_description": "Description",
        "event_cover_image": "Image de couverture",
        "upload_image": "Télécharger une image",
        "event_date": "Date de l'événement",
        "category": "Catégorie",
        "select_category": "Sélectionner une catégorie",
        "location": "Lieu",
        "address": "Adresse",
        "city": "Ville",
        "country": "Pays",
        "ticket_types": "Types de Billets",
        "add_ticket_type": "Ajouter un type de billet",
        "ticket_name": "Nom du billet (ex: Standard, VIP)",
        "ticket_price_fcfa": "Prix (FCFA)",
        "ticket_quantity": "Quantité disponible",
        "ticket_benefits": "Avantages (séparés par des virgules)",
        "remove": "Supprimer",
        "verification_options": "Options de Vérification",
        "enable_verification": "Activer la vérification des billets par QR code",
        "submit": "Créer l'événement",
        "event_created_success": "Événement créé avec succès !",
        "editing_event": "Modification de l'événement"
      },
      "ticketing_interface": {
        "select_ticket_type": "Sélectionnez vos billets",
        "total_cost": "Coût Total :",
        "buy_tickets": "Acheter des Billets",
        "sold_out": "Épuisé",
        "sales_ended": "Ventes terminées",
        "available": "disponibles",
        "benefits": "Avantages :"
      },
      "select_country": "Sélectionner un pays",
      "select_city": "Sélectionner une ville",
      "choose_file": "Choisir un fichier",
      "no_file_chosen": "Aucun fichier choisi",
      "common": {
        "error_title": "Erreur"
      },
      "privacy": {
        "meta_title": "Politique de Confidentialité",
        "meta_description": "Consultez notre politique de confidentialité pour comprendre comment nous collectons, utilisons et protégeons vos données personnelles.",
        "title": "Politique de Confidentialité",
        "last_updated": "Dernière mise à jour : 02 Novembre 2025",
        "introduction": {
          "title": "1. Introduction",
          "p1": "Cette politique de confidentialité explique comment BonPlanInfos collecte, utilise et protège vos informations personnelles lorsque vous utilisez notre plateforme."
        },
        "data_collected": {
          "title": "2. Données que nous collectons",
          "p1": "Nous collectons diverses informations pour fournir et améliorer nos services :",
          "item1": "<b>Informations de compte :</b> Nom, adresse e-mail, pays, ville, type de compte.",
          "item2": "<b>Données d'utilisation :</b> Pages visitées, interactions avec les événements, recherches effectuées.",
          "item3": "<b>Contenu généré par l'utilisateur :</b> Événements créés, commentaires, photos.",
          "item4": "<b>Données de transaction :</b> Historique des achats de pièces et des retraits de gains."
        },
        "data_usage": {
          "title": "3. Comment nous utilisons vos données",
          "p1": "Vos données sont utilisées pour :",
          "item1": "Fournir, maintenir et améliorer la plateforme.",
          "item2": "Personnaliser votre expérience en vous recommandant des événements pertinents.",
          "item3": "Traiter les transactions et les paiements.",
          "item4": "Communiquer avec vous concernant votre compte ou nos services."
        },
        "cookies": {
          "title": "4. Cookies",
          "p1": "Nous utilisons des cookies pour assurer le bon fonctionnement du site, analyser notre trafic et personnaliser le contenu. Vous pouvez gérer vos préférences de cookies à tout moment."
        },
        "data_sharing": {
          "title": "5. Partage des données",
          "p1": "Nous ne partageons pas vos informations personnelles avec des tiers, sauf si cela est nécessaire pour fournir le service (par exemple, avec les processeurs de paiement) ou si la loi l'exige."
        },
        "security": {
          "title": "6. Sécurité",
          "p1": "Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles pour protéger vos données contre l'accès non autorisé, la perte ou la destruction."
        },
        "your_rights": {
          "title": "7. Vos droits",
          "p1": "Conformément à la réglementation, vous disposez des droits suivants :",
          "item1": "<b>Droit d'accès :</b> Vous pouvez demander une copie des données que nous détenons sur vous.",
          "item2": "<b>Droit de rectification :</b> Vous pouvez corriger toute information inexacte.",
          "item3": "<b>Droit à l'effacement :</b> Vous pouvez demander la suppression de votre compte et de vos données.",
          "p2": "Pour exercer ces droits, veuillez nous contacter à l'adresse ci-dessous."
        },
        "contact": {
          "title": "8. Contact",
          "p1": "Pour toute question relative à cette politique de confidentialité, veuillez nous contacter à :",
          "email": "privacy@bonplaninfos.net"
        }
      },
      "legal_mentions": {
        "meta_title": "Mentions Légales",
        "meta_description": "Consultez les mentions légales de BonPlanInfos pour obtenir des informations sur l'éditeur du site, l'hébergement et nos obligations légales.",
        "title": "Mentions Légales",
        "subtitle": "Informations légales concernant la plateforme BonPlanInfos.",
        "lastUpdate": "Dernière mise à jour : 02 Novembre 2025",
        "sections": {
            "editor": {
                "title": "Éditeur du Site",
                "content": "Le site BonPlanInfos est édité par :",
                "company": "BON PLAN INFOS (BPI)",
                "capital": "Société par actions simplifiée (SAS) au capital de 1.000.000 FCFA",
                "address": "Siège social : Abidjan, Côte d'Ivoire",
                "phone": "Téléphone : (+225) 07 12 27 53 74",
                "email": "contact@bonplaninfos.net"
            },
            "director": {
                "title": "Directeur de la Publication",
                "content": "Le directeur de la publication est Monsieur S.Rayane KIBORA, en sa qualité de Président de BON PLAN INFOS (BPI)."
            },
            "hosting": {
                "title": "Hébergement",
                "content": "La plateforme est hébergée par :",
                "company": "Hostinger International Ltd.",
                "address": "61 Lordou Vironos Street, 6023 Larnaca, Chypre",
                "website": "www.hostinger.fr"
            },
            "data": {
                "title": "Protection des Données Personnelles",
                "content1": "Conformément à la législation en vigueur sur la protection des données, vous disposez d'un droit d'accès, de rectification, de suppression et d'opposition de vos données personnelles. Pour exercer ce droit, veuillez contacter notre Délégué à la Protection des Données (DPO) à l'adresse : ",
                "content2": "Pour plus d'informations, veuillez consulter notre <1>Politique de Confidentialité</1>."
            },
            "cookies": {
                "title": "Cookies",
                "content1": "Le site utilise des cookies pour améliorer l'expérience utilisateur. Ces cookies sont utilisés pour :",
                "item1": "Assurer le bon fonctionnement du site (cookies de session).",
                "item2": "Analyser l'audience et la performance (cookies analytiques).",
                "item3": "Proposer des publicités personnalisées (cookies marketing).",
                "content2": "Vous pouvez configurer vos préférences en matière de cookies via notre bannière de consentement."
            },
            "ip": {
                "title": "Propriété Intellectuelle",
                "content": "L'ensemble des contenus de ce site (textes, images, vidéos, logos, code source) est la propriété exclusive de BON PLAN INFOS (BPI) ou de ses partenaires. Toute reproduction, même partielle, est strictement interdite sans autorisation préalable."
            },
            "liability": {
                "title": "Limitation de Responsabilité",
                "content": "BonPlanInfos s'efforce de fournir des informations exactes et à jour, mais ne peut garantir l'exactitude de toutes les informations. L'utilisation des informations et contenus disponibles sur l'ensemble du site, ne sauraient en aucun cas engager la responsabilité de l'éditeur, à quelque titre que ce soit."
            },
            "links": {
                "title": "Liens Hypertextes",
                "content": "La plateforme peut contenir des liens hypertextes vers d'autres sites. BonPlanInfos n'est pas responsable du contenu de ces sites tiers et ne saurait être tenu responsable des dommages résultant de leur consultation."
            },
            "applicableLaw": {
                "title": "Droit Applicable",
                "content": "Les présentes mentions légales sont soumises au droit ivoirien. En cas de litige, les tribunaux d'Abidjan seront seuls compétents."
            }
        }
      }
    }
  },
  "en": {
    "translation": {
      "nav": {
        "home": "Home",
        "discover": "Discover",
        "events": "Events",
        "partnership": "Partnership",
        "profile": "Profile",
        "wallet": "Wallet"
      },
      "auth": {
        "fetch_error": {
          "title": "Connection Error",
          "description": "Could not fetch data. Please check your internet connection and refresh the page."
        },
        "login": {
          "meta_title": "Login",
          "meta_description": "Log in to your BonPlanInfos account.",
          "title": "Login",
          "subtitle": "Log in to continue.",
          "button": "Login",
          "switch_text": "Don't have an account yet?",
          "switch_button": "Sign Up",
          "error_invalid_credentials": "Incorrect email or password."
        },
        "register": {
          "meta_title": "Register",
          "meta_description": "Create an account on BonPlanInfos and start discovering the best plans.",
          "title": "Register",
          "subtitle": "Create your account.",
          "button": "Register",
          "country_city_required": "Please select a country and a city.",
          "switch_text": "Already have an account?",
          "switch_button": "Login",
          "confirmation_email_title": "Check your email!",
          "confirmation_email_description": "We have sent you a confirmation email. Please check your inbox and click on the link to activate your account.",
          "terms_agreement": "I agree to the <1>Terms of Service</1>",
          "terms_required": "You must accept the terms of service."
        },
        "full_name": "Full Name",
        "country": "Country",
        "select_country_placeholder": "Select your country",
        "city": "City",
        "select_city_placeholder": "Select your city",
        "choose_role": "You are?",
        "choose_role_placeholder": "Choose your role",
        "role_user": "User",
        "role_organizer": "Organizer",
        "email": "Email",
        "password": "Password",
        "referral_code_optional": "Referral Code (Optional)"
      },
      "home": "Home",
      "events": "Events",
      "contests": "Contests",
      "discover": "Discover",
      "login": "Login",
      "logout": "Logout",
      "profile": "Profile",
      "wallet": "Wallet",
      "settings": "Settings",
      "admin_dashboard": "Admin Dashboard",
      "secretary_dashboard": "Secretary Dashboard",
      "confirm_logout": "Are you sure you want to log out?",
      "cancel": "Cancel",
      "confirm": "Confirm",
      "back_home": "Back to Home",
      "not_found_title": "Page Not Found",
      "not_found_message": "Sorry, the page you are looking for does not exist.",
      "email_label": "Email address",
      "password_label": "Password",
      "full_name_label": "Full name",
      "phone_label": "Phone number",
      "username_label": "Username",
      "country_label": "Country",
      "city_label": "City",
      "referral_code_label": "Referral code (optional)",
      "login_tab": "Login",
      "register_tab": "Register",
      "login_magic_link_tab": "Magic Link",
      "send_magic_link": "Send Magic Link",
      "or_continue_with": "Or continue with",
      "forgot_password": "Forgot password?",
      "events_title": "Featured Events",
      "all_events_button": "All Events",
      "promoted_events": "Sponsored Events",
      "popular_contests": "Popular Contests",
      "see_all_contests": "See all contests",
      "discover_places": "Discover Places",
      "discover_more_places": "Discover more places",
      "landing": {
        "title": "Your Gateway to the Best Deals",
        "subtitle": "Discover, participate, and organize events, contests, and more. All in one place.",
        "search_placeholder": "Search for an event, a place...",
        "search_button": "Search",
        "create_event_button": "Create Event",
        "discover_events_button": "Discover Events",
        "featured_title": "Events Not to Miss",
        "featured_subtitle": "Participate in the most popular events and live unforgettable moments.",
        "categories_title": "Explore by Categories",
        "categories_subtitle": "Find events that match your interests.",
        "how_it_works_title": "How It Works",
        "how_it_works_step1_title": "Discover",
        "how_it_works_step1_desc": "Explore a multitude of events, contests, and places.",
        "how_it_works_step2_title": "Participate",
        "how_it_works_step2_desc": "Buy tickets, vote for your favorite candidates, and much more.",
        "how_it_works_step3_title": "Win & Enjoy",
        "how_it_works_step3_desc": "Earn rewards, win contests, and live unique experiences.",
        "how_it_works_step4_title": "Organize",
        "how_it_works_step4_desc": "Create and manage your own events with ease.",
        "cta_title": "Ready to start the adventure?",
        "cta_subtitle": "Join our community today and never miss a good deal again.",
        "cta_button": "Sign Up for Free"
      },
      "footer": {
        "home": "Home",
        "about": "About",
        "partnership": "Partnership",
        "sponsors": "Sponsors",
        "privacy": "Privacy Policy",
        "terms": "Terms of Use",
        "contact": "Contact",
        "tagline": "Your ultimate guide to the best events and entertainment.",
        "platform": "Platform",
        "company": "Company",
        "legal": "Legal",
        "how_it_works": "How it works",
        "help": "Help Center",
        "faq": "FAQ",
        "data_protection": "Data Protection",
        "legal_mentions": "Legal Mentions"
      },
      "marketing": {
        "badge": "For Organizers & Creators",
        "title": "Take Your Events to the Next Level",
        "subtitle": "Reach a wider audience, engage with your community, and monetize your content like never before. BonPlanInfos is the all-in-one platform for successful events.",
        "createEventCta": "Create My Event Now",
        "becomePartnerCta": "Become a Partner",
        "trust": "Trusted by hundreds of organizers in Africa.",
        "why": {
          "title": "Why choose BonPlanInfos?",
          "subtitle": "We give you the tools to make every event a resounding success.",
          "feature1": "Maximum Visibility",
          "feature1_desc": "Leverage our large audience to promote your events and reach thousands of potential attendees.",
          "feature2": "Easy Monetization",
          "feature2_desc": "Ticket sales, paid voting, raffles, stands... Diversify your income streams in just a few clicks.",
          "feature3": "Interaction & Engagement",
          "feature3_desc": "Create a strong bond with your community through our interaction tools: comments, shares, and reactions.",
          "feature4": "Real-Time Statistics",
          "feature4_desc": "Track the performance of your events with precise data to optimize your strategies.",
          "feature5": "Security & Reliability",
          "feature5_desc": "A robust and secure platform to manage your transactions and your attendees' data.",
          "feature6": "Dedicated Support",
          "feature6_desc": "Our team is here to support you at every stage of your organization."
        },
        "revenue_simulation": {
          "title": "Imagine Your Potential Monthly Income...",
          "subtitle": "Every interaction on your content generates coins, convertible into real money. Here is a simple simulation based on popular events.",
          "summary_title": "Monthly Summary (Simulation)",
          "total_interactions": "Total Interactions",
          "revenue_coins": "Revenue in Coins",
          "revenue_fcfa": "Revenue in FCFA",
          "miss_ci": "Miss Côte d'Ivoire Contest",
          "music_festival": "Urban Music Festival",
          "football_tournament": "Inter-neighborhood Football Tournament",
          "entrepreneur_conf": "Entrepreneurship Conference",
          "shares": "Shares",
          "downloads": "Downloads",
          "views": "Views",
          "comments": "Comments",
          "reactions": "Reactions",
          "total_revenue": "Total Revenue",
          "interactions": "Interactions",
          "how_it_works_title": "How it Works",
          "organizer": "Organizer",
          "user": "User",
          "easy_withdrawal": "Easy Withdrawal",
          "from_50_pi": "From 50π",
          "ready_cta_title": "Ready to turn your ideas into success?",
          "ready_cta_subtitle": "Join thousands of organizers who trust us.",
          "cta_button": "Launch my first event"
        },
        "testimonials": {
          "title": "They trust us",
          "dj_kerozen_quote": "With BonPlanInfos, I sold out my concert in record time. The platform's virality is just incredible!",
          "fatou_sylla_quote": "I organize all my clients' events through the app. It simplifies my life and my clients love it.",
          "eric_b_quote": "We funded our entire integration weekend by monetizing our party. A must-have!",
          "bintou_diallo_name": "Bintou Diallo",
          "bintou_diallo_role": "Show Promoter",
          "kwesi_mensah_name": "Kwesi Mensah",
          "kwesi_mensah_role": "Wedding Planner",
          "aisha_traore_name": "Aïsha Traoré",
          "aisha_traore_role": "Student & BDE President",
          "amadou_ba_name": "Amadou Ba",
          "amadou_ba_role": "Personal Development Coach",
          "amadou_ba_quote": "Managing registrations for my seminars has become child's play. I save so much time!",
          "chimamanda_ngozi_name": "Chimamanda Ngozi",
          "chimamanda_ngozi_role": "Literary Festival Organizer",
          "chimamanda_ngozi_quote": "The live voting feature added an exciting interactive dimension to our literary prize.",
          "didier_kouame_name": "Didier Kouamé",
          "didier_kouame_role": "Sports Club Manager",
          "didier_kouame_quote": "The online raffle generated unexpected revenue for our club. It's simple and incredibly effective.",
          "mariam_kone_name": "Mariam Koné",
          "mariam_kone_role": "Fashion Designer",
          "mariam_kone_quote": "My fashion show got national reach thanks to the promotion on BonPlanInfos. The impact was immediate.",
          "femi_adebayo_name": "Femi Adebayo",
          "femi_adebayo_role": "Food Truck Owner",
          "femi_adebayo_quote": "Renting a stand at the biggest events in town has never been easier. My business has exploded!",
          "abena_asante_name": "Abena Asante",
          "abena_asante_role": "Painter",
          "abena_asante_quote": "I sold more canvases during my online exhibition than I could have ever imagined. The visibility is top-notch.",
          "yannick_zongo_name": "Yannick Zongo",
          "yannick_zongo_role": "E-sport Tournament Organizer",
          "yannick_zongo_quote": "The integrated ticketing and QR code check-in system are perfect for managing a large number of participants."
        },
        "cta": {
          "title": "Ready to take your events to the next level?",
          "subtitle": "Don't let complexity hold you back. With BonPlanInfos, event organizing becomes simple, profitable, and fun.",
          "cta": "Become an Official Partner"
        },
        "meta_title": "Partnership & Marketing - BonPlanInfos",
        "meta_description": "Join BonPlanInfos as a partner or organizer. Maximize your event's visibility, engage your community, and increase your revenue."
      },
       "wallet_info_modal": {
        "title": "What are coins (π) for?",
        "intro": "Coins are the virtual currency of BonPlanInfos. They allow you to access exclusive content and interact with events.",
        "free_coins_title": "Free Coins (🎁)",
        "free_coins_desc": "You earn them by watching video ads or during promotions. They allow you to perform basic actions.",
        "paid_coins_title": "Purchased Coins (💳)",
        "paid_coins_desc": "Purchased with real money, they unlock all features and directly support the organizers.",
        "usage_title": "How to use them?",
        "usage_item1": "Access protected events.",
        "usage_item2": "Like, comment, download exclusive content.",
        "usage_item3": "Participate in votes, raffles, and much more.",
        "cta_button": "Buy Coins",
        "usage_priority": "Free coins are always used first for your actions!"
      },
      "event_card": {
        "days_remaining": "{{count}} day remaining",
        "days_remaining_plural": "{{count}} days remaining",
        "event_ended": "Ended",
        "event_starting_today": "Starts today",
        "starting_from": "From"
      },
      "filters": {
        "all": "All",
        "promoted": "Boosted",
        "live": "Live",
        "today": "Today",
        "this_week": "This week",
        "free": "Free"
      },
       "events_page": {
        "title": "Discover all events",
        "search_placeholder": "Search for an event by name, city, category...",
        "no_events_title": "No events found",
        "no_events_description": "Try adjusting your search filters or check back later.",
        "load_more": "Load more"
      },
      "event_detail": {
        "by_organizer": "By",
        "share": "Share",
        "location": "Location",
        "date_time": "Date and Time",
        "get_directions": "Get Directions",
        "about_event": "About the Event",
        "tags": "Tags",
        "unlock_event_to_see_content": "Unlock this event to see exclusive content!",
        "unlock_button": "Unlock for {{price}}π",
        "unlocking": "Unlocking...",
        "free_access": "Free Access",
        "owner_access": "Owner Access",
        "comments": "Comments",
        "leave_comment": "Leave a comment...",
        "submit_comment": "Submit",
        "comment_cost": "Comment for {{price}}π",
        "ticketing": "Ticketing",
        "voting": "Voting",
        "raffle": "Raffle",
        "stands": "Stands"
      },
      "social_interactions": {
        "like": "Like",
        "comment": "Comment",
        "share": "Share",
        "download": "Download",
        "cost": "{{price}}π",
        "comment_placeholder": "Add a comment...",
        "post_comment": "Post"
      },
      "toasts": {
        "copied_to_clipboard": "Copied to clipboard!",
        "feature_not_implemented": "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀"
      },
      "admin": {
        "tabs": {
          "analytics": "Analytics",
          "users": "Users",
          "partners": "Partners",
          "events": "Events",
          "locations": "Locations",
          "promotions": "Promotions",
          "credits": "Credits",
          "config": "Configuration",
          "withdrawals": "Withdrawals",
          "videos": "Videos",
          "announcements": "Announcements",
          "welcome_popup": "Welcome Popup"
        }
      },
      "discover_page": {
        "title": "Discover",
        "search_placeholder": "Search for a place, category, city...",
        "filter_by_type": "Filter by type",
        "no_locations_found": "No locations found.",
        "no_locations_description": "Try broadening your search or selecting fewer filters.",
        "add_new_location": "Add a new place"
      },
      "add_location": {
        "title": "Add a New Place",
        "subtitle": "Share a great spot with the community.",
        "location_name": "Place Name",
        "location_description": "Description",
        "location_type": "Place Type",
        "address": "Address",
        "city": "City",
        "country": "Country",
        "website": "Website (optional)",
        "phone": "Phone (optional)",
        "submit": "Submit Place",
        "success_title": "Place Submitted!",
        "success_message": "Thanks! Your place has been submitted and will be reviewed by our team."
      },
       "verify_ticket": {
        "title": "Ticket Verification",
        "scan_instruction": "Scan the ticket's QR code or enter the scanner code.",
        "scanner_code_label": "Scanner Code",
        "start_session": "Start Session",
        "stop_session": "Stop Session",
        "scan_ticket": "Scan a Ticket",
        "camera_permission_denied": "Camera permission denied.",
        "camera_error": "Camera error:",
        "scan_result": "Scan Result",
        "scan_again": "Scan Again",
        "valid_ticket": "Valid Ticket",
        "invalid_ticket": "Invalid Ticket",
        "ticket_number": "Ticket Number:",
        "ticket_type": "Ticket Type:",
        "attendee_name": "Attendee Name:",
        "event_title": "Event Title:",
        "scan_time": "Scan Time:",
        "error": "Error",
        "session_active": "Verification session active",
        "session_stopped": "Verification session stopped",
        "verifying_ticket": "Verifying ticket...",
        "enter_scanner_code": "Please enter a valid scanner code."
      },
      "create_event": {
        "title": "Create an Event",
        "subtitle": "Choose the type of event you want to organize.",
        "simple": "Simple",
        "simple_desc": "Quickly post an informational event (free or paid at the door).",
        "ticketing": "Ticketing",
        "ticketing_desc": "Sell tickets with different prices and options.",
        "voting": "Voting Contest",
        "voting_desc": "Organize a contest where participants vote for candidates.",
        "raffle": "Raffle",
        "raffle_desc": "Create a raffle with tickets and prizes to be won.",
        "stands": "Stand Rental",
        "stands_desc": "Manage the rental of stands for a trade show or market."
      },
      "create_ticketing_event": {
        "title": "Create an Event with Ticketing",
        "event_details": "Event Details",
        "event_title": "Event Title",
        "event_description": "Description",
        "event_cover_image": "Cover Image",
        "upload_image": "Upload Image",
        "event_date": "Event Date",
        "category": "Category",
        "select_category": "Select a category",
        "location": "Location",
        "address": "Address",
        "city": "City",
        "country": "Country",
        "ticket_types": "Ticket Types",
        "add_ticket_type": "Add Ticket Type",
        "ticket_name": "Ticket Name (e.g., Standard, VIP)",
        "ticket_price_fcfa": "Price (FCFA)",
        "ticket_quantity": "Quantity Available",
        "ticket_benefits": "Benefits (comma-separated)",
        "remove": "Remove",
        "verification_options": "Verification Options",
        "enable_verification": "Enable QR code ticket verification",
        "submit": "Create Event",
        "event_created_success": "Event created successfully!",
        "editing_event": "Editing Event"
      },
      "ticketing_interface": {
        "select_ticket_type": "Select your tickets",
        "total_cost": "Total Cost:",
        "buy_tickets": "Buy Tickets",
        "sold_out": "Sold Out",
        "sales_ended": "Sales Ended",
        "available": "available",
        "benefits": "Benefits:"
      },
      "select_country": "Select a country",
      "select_city": "Select a city",
      "choose_file": "Choose file",
      "no_file_chosen": "No file chosen",
      "common": {
        "error_title": "Error"
      },
      "privacy": {
        "meta_title": "Privacy Policy",
        "meta_description": "Read our privacy policy to understand how we collect, use, and protect your personal data.",
        "title": "Privacy Policy",
        "last_updated": "Last updated: November 02, 2025",
        "introduction": {
          "title": "1. Introduction",
          "p1": "This privacy policy explains how BonPlanInfos collects, uses, and protects your personal information when you use our platform."
        },
        "data_collected": {
          "title": "2. Data We Collect",
          "p1": "We collect various information to provide and improve our services:",
          "item1": "<b>Account Information:</b> Name, email address, country, city, account type.",
          "item2": "<b>Usage Data:</b> Pages visited, interactions with events, searches performed.",
          "item3": "<b>User-Generated Content:</b> Events created, comments, photos.",
          "item4": "<b>Transaction Data:</b> History of coin purchases and earning withdrawals."
        },
        "data_usage": {
          "title": "3. How We Use Your Data",
          "p1": "Your data is used to:",
          "item1": "Provide, maintain, and improve the platform.",
          "item2": "Personalize your experience by recommending relevant events.",
          "item3": "Process transactions and payments.",
          "item4": "Communicate with you regarding your account or our services."
        },
        "cookies": {
          "title": "4. Cookies",
          "p1": "We use cookies to ensure the proper functioning of the site, analyze our traffic, and personalize content. You can manage your cookie preferences at any time."
        },
        "data_sharing": {
          "title": "5. Data Sharing",
          "p1": "We do not share your personal information with third parties, unless it is necessary to provide the service (e.g., with payment processors) or required by law."
        },
        "security": {
          "title": "6. Security",
          "p1": "We implement technical and organizational security measures to protect your data against unauthorized access, loss, or destruction."
        },
        "your_rights": {
          "title": "7. Your Rights",
          "p1": "In accordance with regulations, you have the following rights:",
          "item1": "<b>Right of Access:</b> You can request a copy of the data we hold about you.",
          "item2": "<b>Right to Rectification:</b> You can correct any inaccurate information.",
          "item3": "<b>Right to Erasure:</b> You can request the deletion of your account and data.",
          "p2": "To exercise these rights, please contact us at the address below."
        },
        "contact": {
          "title": "8. Contact",
          "p1": "For any questions regarding this privacy policy, please contact us at:",
          "email": "privacy@bonplaninfos.net"
        }
      },
      "legal_mentions": {
        "meta_title": "Legal Mentions",
        "meta_description": "Consult the legal mentions of BonPlanInfos for information on the site editor, hosting, and our legal obligations.",
        "title": "Legal Mentions",
        "subtitle": "Legal information concerning the BonPlanInfos platform.",
        "lastUpdate": "Last updated: November 02, 2025",
        "sections": {
            "editor": {
                "title": "Site Editor",
                "content": "The BonPlanInfos site is edited by:",
                "company": "BON PLAN INFOS (BPI)",
                "capital": "Simplified joint-stock company (SAS) with a capital of 1,000,000 FCFA",
                "address": "Head office: Abidjan, Côte d'Ivoire",
                "phone": "Phone: (+225) 07 12 27 53 74",
                "email": "contact@bonplaninfos.net"
            },
            "director": {
                "title": "Publication Director",
                "content": "The publication director is Mr. S.Rayane KIBORA, in his capacity as President of BON PLAN INFOS (BPI)."
            },
            "hosting": {
                "title": "Hosting",
                "content": "The platform is hosted by:",
                "company": "Hostinger International Ltd.",
                "address": "61 Lordou Vironos Street, 6023 Larnaca, Cyprus",
                "website": "www.hostinger.com"
            },
            "data": {
                "title": "Personal Data Protection",
                "content1": "In accordance with current data protection legislation, you have the right to access, rectify, delete, and object to your personal data. To exercise this right, please contact our Data Protection Officer (DPO) at: ",
                "content2": "For more information, please consult our <1>Privacy Policy</1>."
            },
            "cookies": {
                "title": "Cookies",
                "content1": "The site uses cookies to improve the user experience. These cookies are used to:",
                "item1": "Ensure the proper functioning of the site (session cookies).",
                "item2": "Analyze audience and performance (analytics cookies).",
                "item3": "Offer personalized advertising (marketing cookies).",
                "content2": "You can configure your cookie preferences via our consent banner."
            },
            "ip": {
                "title": "Intellectual Property",
                "content": "All content on this site (texts, images, videos, logos, source code) is the exclusive property of BON PLAN INFOS (BPI) or its partners. Any reproduction, even partial, is strictly prohibited without prior authorization."
            },
            "liability": {
                "title": "Limitation of Liability",
                "content": "BonPlanInfos strives to provide accurate and up-to-date information but cannot guarantee the accuracy of all information. The use of information and content available on the entire site shall in no case engage the liability of the publisher, for any reason whatsoever."
            },
            "links": {
                "title": "Hyperlinks",
                "content": "The platform may contain hyperlinks to other sites. BonPlanInfos is not responsible for the content of these third-party sites and cannot be held liable for any damages resulting from their consultation."
            },
            "applicableLaw": {
                "title": "Applicable Law",
                "content": "These legal mentions are subject to Ivorian law. In case of a dispute, the courts of Abidjan will have sole jurisdiction."
            }
        }
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['queryString', 'cookie', 'localStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
      caches: ['cookie'],
    }
  });

export default i18n;