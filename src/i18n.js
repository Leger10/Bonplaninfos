
// import i18n from 'i18next';
// import { initReactI18next } from 'react-i18next';
// import LanguageDetector from 'i18next-browser-languagedetector';

// i18n
//   .use(LanguageDetector)
//   .use(initReactI18next)
//   .init({
//     debug: true,
//     fallbackLng: 'fr',
//     interpolation: {
//       escapeValue: false, 
//     },
//     resources: {
//       en: {
//         translation: {
//           nav: {
//             home: 'Home',
//             discover: 'Discover',
//             events: 'Events',
//             wallet: 'Wallet',
//             profile: 'Profile',
//             create_event: 'Create Event',
//             partnership: 'Partnership',
//             logout: 'Logout',
//             notifications: 'Notifications',
//           },
//           common: {
//             confirm: 'Confirm',
//             cancel: 'Cancel',
//             delete: 'Delete',
//             close: 'Close',
//             save: 'Save',
//             edit: 'Edit',
//             loading: 'Loading...',
//             error_title: 'Error',
//             success_title: 'Success',
//             search: 'Search...',
//             activate: 'Activate',
//             deactivate: 'Deactivate',
//             credit: 'Credit',
//             retry: 'Retry',
//           },
//           discover_page: {
//             title: "Discover Places",
//             subtitle: "Find new places recommended by the community.",
//             add_place: "Add a Place",
//           },
//           auth: {
//              fetch_error: {
//                 title: "Connection Error",
//                 description: "Failed to retrieve your profile. Please check your internet connection and try again."
//             },
//             login: {
//               title: "Login",
//               subtitle: "Welcome back!",
//               button: "Sign In",
//               error_invalid_credentials: "Incorrect email or password.",
//               switch_text: "Don't have an account?",
//               switch_button: "Sign Up"
//             },
//             register: {
//               title: "Create Account",
//               subtitle: "Join the community and discover unique events.",
//               button: "Sign Up",
//               terms_agreement: "I agree to the <1>Terms of Service</1>",
//               terms_required: "You must accept the terms of service.",
//               country_city_required: "Please select a country and city.",
//               confirmation_email_title: "Check your email!",
//               confirmation_email_description: "A confirmation link has been sent to your email address. Please click the link to activate your account.",
//               switch_text: "Already have an account?",
//               switch_button: "Sign In"
//             },
//             full_name: "Full Name",
//             email: "Email",
//             password: "Password",
//             country: "Country",
//             city: "City",
//             select_country_placeholder: "Select your country",
//             select_city_placeholder: "Select your city",
//             choose_role: "I am a...",
//             choose_role_placeholder: "Choose your role",
//             role_user: "User",
//             role_organizer: "Organizer",
//             referral_code_optional: "Referral Code (Optional)"
//           },
//           home_page: {
//             sponsored_events: "Sponsored Events",
//             boost_event: "Boost an Event",
//             explore_by_type: {
//               title: "Explore by Event Type",
//               subtitle: "Find the experience that's right for you."
//             },
//             event_types: {
//               standard: "Standard",
//               ticketing: "Ticketing",
//               raffles: "Raffles",
//               voting: "Voting",
//               stands: "Stands"
//             },
//             no_sponsored_events: {
//                 title: "No Sponsored Events Currently",
//                 description: "Be the first to promote an event and reach a wider audience.",
//                 button: "Boost an Event"
//             },
//             view_all_events: "View All Events",
//             loading_error: {
//                 title: "Error Loading Data",
//                 description: "We couldn't load the necessary data. Please check your connection and try again.",
//                 retry: "Retry"
//             }
//           },
//           events_page: {
//             title: "Explore Events",
//             subtitle: "Discover what's happening near you and beyond.",
//             search_placeholder: "Search by name, city, category...",
//             filters: "Filters",
//             quick_filters: {
//                 trending: "Trending",
//                 popular_by_category: "Popular by Category",
//                 free_weekend: "Free This Weekend",
//                 ending_soon: "Ending Soon"
//             },
//             event_types: "Event Types",
//             categories: "Categories",
//             countries: "Countries",
//             cities: "Cities",
//             reset: "Reset",
//             no_events_found: {
//                 title: "No Events Found",
//                 description: "Try adjusting your search filters or expanding your search area.",
//                 reset_button: "Reset Filters"
//             },
//             unlock_modal: {
//               title: "Unlock This Event",
//               description: "To see the details for \"{{title}}\", a cost of {{cost}}π (about {{costFcfa}} FCFA) will be deducted from your balance.",
//               info: "This is a one-time action. Once unlocked, you will have permanent access to this event.",
//               cancel: "Cancel",
//               confirm: "Confirm and Unlock",
//               success_title: "Access Unlocked!",
//               success_desc: "You can now see the details for \"{{title}}\"."
//             }
//           },
//           profile_page: {
//             helmet_title: "{{name}}'s Profile",
//             helmet_desc: "Manage your profile, events, and transactions on BonPlanInfos.",
//             unauthorized_title: "Access Denied",
//             unauthorized_desc: "You must be logged in to view your profile.",
//             go_to_login: "Go to Login Page",
//             connection_failed_title: "Connection Failed",
//             connection_failed_desc: "We were unable to load your profile. Please try logging in again.",
//             loading_error_title: "Error Loading Data",
//             loading_error_desc: "We couldn't load all your profile data. Some information may be missing."
//           },
//           wallet_page: {
//             title: "My Wallet",
//             total_balance: "Total Coin Balance",
//             free_coins: "Free Coins",
//             paid_coins: "Paid Coins",
//             available_earnings: "Available Earnings (Coins)",
//             earnings_in_fcfa: "≈ {{amount}} FCFA",
//             buy_coins_title: "Buy Coins",
//             buy_coins_desc: "Top up your balance and never miss out!",
//             buy_coins_button: "View Packs",
//             balance_details_title: "Coin Balance Details",
//             free_coins_desc: "Free coins are used first for interactions. Paid coins are used next, and a portion goes to organizers.",
//             withdrawal_title: "Withdraw Earnings",
//             withdrawal_desc: "Convert your earnings into real money.",
//             request_withdrawal_button: "Request Withdrawal",
//             withdrawal_minimum: "Minimum for withdrawal: {{amount}} coins."
//           },
//           admin_dashboard: {
//             unauthorized_title: 'Unauthorized Access',
//             unauthorized_desc: 'You do not have the required permissions to access this page.',
//             loading_error_title: 'Loading Error',
//             super_admin_title: 'Super Admin Dashboard',
//             admin_title: 'Admin Dashboard - {{country}}',
//             secretary_title: 'Secretary Dashboard',
//             welcome: 'Welcome, {{name}}',
//             tabs: {
//               analytics: 'Analytics',
//               users: 'Users',
//               secretaries: 'Secretaries',
//               config: 'Configuration',
//               videos: 'Videos',
//               partners: 'Partners',
//               withdrawals: 'Withdrawals',
//               salary_withdrawals: 'Salary Withdrawals',
//               withdrawal_history: 'Withdrawal History',
//               announcements: 'Announcements',
//               events: 'Events',
//               promotions: 'Promotions',
//               popups: 'Popups',
//               credits: 'Credits',
//               credit_management: 'Credit Management',
//               reversed_credits: 'Reversed Credits',
//               transactions: 'Transactions',
//               activity_log: 'Activity Log',
//               payments: 'Payments',
//               locations: 'Locations',
//               badges: 'Badges',
//               credit_stats: 'Credit Stats',
//               salary: 'My Salary',
//               credits_history: "Credits History"
//             },
//             stats: {
//               error_title: 'Statistics Error',
//               revenue_title: 'Revenue (Manual Credits)',
//             },
//             license: {
//                 partner_error_title: 'Error loading partner',
//                 status_title: 'License Status',
//                 status_active: 'Active',
//                 status_expired: 'Expired',
//                 activated_on: 'Activated on',
//                 expires_on: 'Expires on',
//                 expired_since: 'Expired for {{count}} days',
//                 days_remaining: 'days remaining',
//                 renew_button: 'Request Renewal',
//                 confirm_renewal_title: 'Confirm Renewal Request?',
//                 confirm_renewal_desc: 'A notification will be sent to the super administrator to review your license renewal request.',
//                 renewal_sent_title: 'Request Sent',
//                 renewal_sent_desc: 'Your renewal request has been sent successfully.',
//                 renewal_error_desc: 'Error sending renewal request: '
//             },
//             banner: {
//                 pending: 'Your admin account is pending verification. Some features may be limited.',
//                 suspended: 'Your admin account has been suspended. Please contact support.',
//                 expired: 'Your license has expired. Please renew it to restore full access.'
//             },
//             salary_dashboard: {
//               title: "Salary Dashboard",
//               current_month_revenue: "Zone Revenue (Current Month)",
//               personal_score: "Personal Score",
//               projected_salary: "Projected Salary (Current Month)",
//               request_withdrawal: "Request Withdrawal",
//               history_title: "Salary History",
//               month: "Month",
//               revenue: "Zone Revenue",
//               license_rate: "License Rate",
//               score: "Score",
//               salary: "Final Salary",
//               status: "Status",
//               paid: "Paid",
//               unpaid: "Unpaid"
//             },
//             withdrawal_form: {
//               title: "Salary Withdrawal Request",
//               description: "Submit a request to withdraw your available salary.",
//               available_salary: "Salary available for withdrawal",
//               amount_to_withdraw: "Amount",
//               withdrawal_method: "Method",
//               select_method: "Select a method",
//               bank_name: "Bank Name",
//               account_holder: "Account Holder",
//               account_number: "Account Number",
//               mobile_money_operator: "Operator",
//               phone_number: "Phone Number",
//               reason: "Reason (Optional)",
//               submit: "Submit Request"
//             }
//           },
//           secretary_dashboard: {
//             title: 'Secretary Dashboard',
//             welcome: 'Welcome, {{name}}',
//             competence_zone: 'Area of competence: {{city}}, {{country}}',
//             tabs: {
//               user_management: 'User Management',
//               event_management: 'Event Management',
//               location_management: 'Location Management',
//               credit_management: 'Credit Management',
//               reversed_credits: 'Reversed Credits',
//               withdrawal_management: 'Withdrawal Management',
//               withdrawal_history: 'Withdrawal History',
//               event_moderation: 'Event & Location Moderation',
//             },
//             credit_form: {
//               title: 'Credit a User',
//               search_user_label: 'Search for a user',
//               search_user_placeholder: 'Name or email...',
//               user_label: 'User',
//               select_user_placeholder: 'Select a user',
//               amount_label: 'Amount (coins)',
//               amount_placeholder: 'e.g., 100',
//               reason_label: 'Reason (optional)',
//               reason_placeholder: 'e.g., Reward',
//               submit_button: 'Credit User',
//             },
//             event_moderation: {
//                 title: 'Event Moderation',
//                 zone_country: 'Zone: {{country}}',
//                 filter_all: 'All',
//                 filter_active: 'Active',
//                 filter_inactive: 'Inactive',
//                 credit_participants_button: 'Credit Participants',
//                 confirm_delete_title: 'Are you sure?',
//                 confirm_delete_desc: "This action is irreversible. The event and all its associated data (tickets, votes, etc.) will be permanently deleted.",
//                 event_deleted_success: 'Event deleted successfully.',
//                 event_deleted_error: "Could not delete event.",
//                 status_updated_success: 'Event status updated.',
//                 status_updated_error: 'Could not update status.',
//                 credit_user_for_event_title: "Credit for event: {{eventName}}",
//                 credit_user_for_event_desc: "Select a user from your zone to award coins for their participation.",
//                 user_search_placeholder: "Search by name or email...",
//                 credit_amount_label: 'Amount (coins)',
//                 credit_reason_label: 'Reason for credit',
//                 credit_reason_placeholder: "Participation in event: {{eventName}}",
//                 no_users_found: "No users found in your zone.",
//                 credit_success_message: "{{userName}} has been credited with {{amount}} coins.",
//                 credit_error_generic: "An error occurred while crediting."
//             }
//           },
//         }
//       },
//       fr: {
//         translation: {
//           nav: {
//             home: 'Accueil',
//             discover: 'Découvrir',
//             events: 'Événements',
//             wallet: 'Portefeuille',
//             profile: 'Profil',
//             create_event: 'Créer un Événement',
//             partnership: 'Partenariat',
//             logout: 'Déconnexion',
//             notifications: 'Notifications',
//           },
//           common: {
//             confirm: 'Confirmer',
//             cancel: 'Annuler',
//             delete: 'Supprimer',
//             close: 'Fermer',
//             save: 'Sauvegarder',
//             edit: 'Modifier',
//             loading: 'Chargement...',
//             error_title: 'Erreur',
//             success_title: 'Succès',
//             search: 'Rechercher...',
//             activate: 'Activer',
//             deactivate: 'Désactiver',
//             credit: 'Créditer',
//             retry: 'Réessayer',
//           },
//            discover_page: {
//             title: "Découvrir des Lieux",
//             subtitle: "Trouvez de nouveaux lieux recommandés par la communauté.",
//             add_place: "Ajouter un Lieu",
//           },
//            auth: {
//              fetch_error: {
//                 title: "Erreur de Connexion",
//                 description: "Échec de la récupération de votre profil. Veuillez vérifier votre connexion internet et réessayer."
//             },
//             login: {
//               title: "Connexion",
//               subtitle: "Heureux de vous revoir !",
//               button: "Se connecter",
//               error_invalid_credentials: "Email ou mot de passe incorrect.",
//               switch_text: "Pas encore de compte ?",
//               switch_button: "Inscrivez-vous"
//             },
//             register: {
//               title: "Créer un compte",
//               subtitle: "Rejoignez la communauté et découvrez des événements uniques.",
//               button: "S'inscrire",
//               terms_agreement: "J'accepte les <1>Conditions Générales d'Utilisation</1>",
//               terms_required: "Vous devez accepter les conditions générales d'utilisation.",
//               country_city_required: "Veuillez sélectionner un pays et une ville.",
//               confirmation_email_title: "Vérifiez votre email !",
//               confirmation_email_description: "Un lien de confirmation a été envoyé à votre adresse email. Veuillez cliquer sur ce lien pour activer votre compte.",
//               switch_text: "Déjà un compte ?",
//               switch_button: "Connectez-vous"
//             },
//             full_name: "Nom complet",
//             email: "Email",
//             password: "Mot de passe",
//             country: "Pays",
//             city: "Ville",
//             select_country_placeholder: "Sélectionnez votre pays",
//             select_city_placeholder: "Sélectionnez votre ville",
//             choose_role: "Je suis un...",
//             choose_role_placeholder: "Choisissez votre rôle",
//             role_user: "Utilisateur",
//             role_organizer: "Organisateur",
//             referral_code_optional: "Code de parrainage (Optionnel)"
//           },
//           home_page: {
//             sponsored_events: "Événements Sponsorisés",
//             boost_event: "Booster un événement",
//             explore_by_type: {
//               title: "Explorer par Type d'Événement",
//               subtitle: "Trouvez l'expérience qui vous convient."
//             },
//             event_types: {
//               standard: "Standard",
//               ticketing: "Billetterie",
//               raffles: "Tombolas",
//               voting: "Votes",
//               stands: "Stands"
//             },
//             no_sponsored_events: {
//                 title: "Aucun Événement Sponsorisé Actuellement",
//                 description: "Soyez le premier à promouvoir un événement et à toucher un public plus large.",
//                 button: "Booster un Événement"
//             },
//             view_all_events: "Voir tous les événements",
//             loading_error: {
//                 title: "Erreur de Chargement des Données",
//                 description: "Nous n'avons pas pu charger les données nécessaires. Veuillez vérifier votre connexion et réessayer.",
//                 retry: "Réessayer"
//             }
//           },
//           events_page: {
//             title: "Explorer les Événements",
//             subtitle: "Découvrez ce qui se passe près de chez vous et au-delà.",
//             search_placeholder: "Rechercher par nom, ville, catégorie...",
//             filters: "Filtres",
//             quick_filters: {
//                 trending: "Tendances",
//                 popular_by_category: "Populaires par catégorie",
//                 free_weekend: "Gratuits ce week-end",
//                 ending_soon: "Bientôt terminés"
//             },
//             event_types: "Types d'événement",
//             categories: "Catégories",
//             countries: "Pays",
//             cities: "Villes",
//             reset: "Réinitialiser",
//             no_events_found: {
//                 title: "Aucun événement trouvé",
//                 description: "Essayez d'ajuster vos filtres de recherche ou d'élargir votre zone de recherche.",
//                 reset_button: "Réinitialiser les filtres"
//             },
//             unlock_modal: {
//               title: "Débloquer cet Événement",
//               description: "Pour voir les détails de \"{{title}}\", un coût de {{cost}}π (environ {{costFcfa}} FCFA) sera déduit de votre solde.",
//               info: "Cette action est unique. Une fois débloqué, vous aurez un accès permanent à cet événement.",
//               cancel: "Annuler",
//               confirm: "Confirmer et Débloquer",
//               success_title: "Accès débloqué!",
//               success_desc: "Vous pouvez maintenant voir les détails de \"{{title}}\"."
//             }
//           },
//           profile_page: {
//             helmet_title: "Profil de {{name}}",
//             helmet_desc: "Gérez votre profil, vos événements et vos transactions sur BonPlanInfos.",
//             unauthorized_title: "Accès Refusé",
//             unauthorized_desc: "Vous devez être connecté pour voir votre profil.",
//             go_to_login: "Aller à la page de connexion",
//             connection_failed_title: "Échec de la Connexion",
//             connection_failed_desc: "Nous n'avons pas pu charger votre profil. Veuillez réessayer de vous connecter.",
//             loading_error_title: "Erreur de Chargement des Données",
//             loading_error_desc: "Nous n'avons pas pu charger toutes les données de votre profil. Certaines informations peuvent être manquantes."
//           },
//           wallet_page: {
//             title: "Mon Portefeuille",
//             total_balance: "Solde Total de Pièces",
//             free_coins: "Pièces Gratuites",
//             paid_coins: "Pièces Achetées",
//             available_earnings: "Gains Disponibles (Pièces)",
//             earnings_in_fcfa: "≈ {{amount}} FCFA",
//             buy_coins_title: "Acheter des pièces",
//             buy_coins_desc: "Rechargez votre solde pour ne rien manquer !",
//             buy_coins_button: "Voir les packs",
//             balance_details_title: "Détails du Solde de Pièces",
//             free_coins_desc: "Les pièces gratuites sont utilisées en priorité pour les interactions. Les pièces achetées sont utilisées ensuite et une partie est reversée aux organisateurs.",
//             withdrawal_title: "Retrait des Gains",
//             withdrawal_desc: "Convertissez vos gains en argent réel.",
//             request_withdrawal_button: "Demander un retrait",
//             withdrawal_minimum: "Minimum pour un retrait : {{amount}} pièces."
//           },
//           admin_dashboard: {
//             unauthorized_title: 'Accès non autorisé',
//             unauthorized_desc: 'Vous n\'avez pas les permissions nécessaires pour accéder à cette page.',
//             loading_error_title: 'Erreur de chargement',
//             super_admin_title: 'Tableau de bord Super Administrateur',
//             admin_title: 'Tableau de bord Admin - {{country}}',
//             secretary_title: 'Tableau de bord Secrétaire',
//             welcome: 'Bienvenue, {{name}}',
//             tabs: {
//               analytics: 'Analyses',
//               users: 'Utilisateurs',
//               secretaries: 'Secrétaires',
//               config: 'Configuration',
//               videos: 'Vidéos',
//               partners: 'Partenaires',
//               withdrawals: 'Retraits',
//               salary_withdrawals: 'Retraits Salaires',
//               withdrawal_history: 'Historique Retraits',
//               announcements: 'Annonces',
//               events: 'Événements',
//               promotions: 'Promotions',
//               popups: 'Popups',
//               credits: 'Crédits',
//               credit_management: 'Gestion Crédits',
//               reversed_credits: 'Crédits Annulés',
//               transactions: 'Transactions',
//               activity_log: 'Activités',
//               payments: 'Paiements',
//               locations: 'Lieux',
//               badges: 'Badges',
//               credit_stats: 'Stats Crédits',
//               salary: 'Mon Salaire',
//               credits_history: "Historique Crédits"
//             },
//             stats: {
//               error_title: 'Erreur de statistiques',
//               revenue_title: 'Revenus (Crédits Manuels)',
//             },
//             license: {
//                 partner_error_title: 'Erreur de chargement du partenaire',
//                 status_title: 'Statut de la licence',
//                 status_active: 'Active',
//                 status_expired: 'Expirée',
//                 activated_on: 'Activée le',
//                 expires_on: 'Expire le',
//                 expired_since: 'Expirée depuis {{count}} jours',
//                 days_remaining: 'jours restants',
//                 renew_button: 'Demander le renouvellement',
//                 confirm_renewal_title: 'Confirmer la demande de renouvellement ?',
//                 confirm_renewal_desc: 'Une notification sera envoyée au super administrateur pour examiner votre demande de renouvellement de licence.',
//                 renewal_sent_title: 'Demande envoyée',
//                 renewal_sent_desc: 'Votre demande de renouvellement a été envoyée avec succès.',
//                 renewal_error_desc: 'Erreur lors de l\'envoi de la demande de renouvellement : '
//             },
//             banner: {
//                 pending: 'Votre compte admin est en attente de vérification. Certaines fonctionnalités peuvent être limitées.',
//                 suspended: 'Votre compte admin a été suspendu. Veuillez contacter le support.',
//                 expired: 'Votre licence a expiré. Veuillez la renouveler pour restaurer l\'accès complet.'
//             },
//             salary_dashboard: {
//               title: "Tableau de Bord de Salaire",
//               current_month_revenue: "Revenu de la zone (Mois en cours)",
//               personal_score: "Score Personnel",
//               projected_salary: "Salaire Projeté (Mois en cours)",
//               request_withdrawal: "Demander un Retrait",
//               history_title: "Historique des Salaires",
//               month: "Mois",
//               revenue: "Revenu Zone",
//               license_rate: "Taux Licence",
//               score: "Score",
//               salary: "Salaire Final",
//               status: "Statut",
//               paid: "Payé",
//               unpaid: "Non Payé"
//             },
//             withdrawal_form: {
//               title: "Demande de Retrait de Salaire",
//               description: "Soumettez une demande pour retirer votre salaire disponible.",
//               available_salary: "Salaire disponible pour le retrait",
//               amount_to_withdraw: "Montant",
//               withdrawal_method: "Méthode",
//               select_method: "Sélectionner une méthode",
//               bank_name: "Nom de la banque",
//               account_holder: "Titulaire du compte",
//               account_number: "Numéro de compte",
//               mobile_money_operator: "Opérateur",
//               phone_number: "Numéro de téléphone",
//               reason: "Raison (Optionnel)",
//               submit: "Soumettre la demande"
//             }
//           },
//           secretary_dashboard: {
//             title: 'Tableau de bord Secrétaire',
//             welcome: 'Bienvenue, {{name}}',
//             competence_zone: 'Zone de compétence : {{city}}, {{country}}',
//             tabs: {
//               user_management: 'Gestion Utilisateurs',
//               event_management: 'Gestion Événements',
//               location_management: 'Gestion Lieux',
//               credit_management: 'Gestion Crédits',
//               reversed_credits: 'Crédits Annulés',
//               withdrawal_management: 'Gestion Retraits',
//               withdrawal_history: 'Historique Retraits',
//               event_moderation: 'Modération Événements & Lieux',
//             },
//             credit_form: {
//               title: 'Créditer un utilisateur',
//               search_user_label: 'Rechercher un utilisateur',
//               search_user_placeholder: 'Nom ou email...',
//               user_label: 'Utilisateur',
//               select_user_placeholder: 'Sélectionner un utilisateur',
//               amount_label: 'Montant (pièces)',
//               amount_placeholder: 'ex: 100',
//               reason_label: 'Raison (optionnel)',
//               reason_placeholder: 'ex: Récompense',
//               submit_button: 'Créditer l\'utilisateur',
//             },
//             event_moderation: {
//                 title: 'Modération des Événements',
//                 zone_country: 'Zone: {{country}}',
//                 filter_all: 'Tous',
//                 filter_active: 'Actifs',
//                 filter_inactive: 'Inactifs',
//                 credit_participants_button: 'Créditer Participants',
//                 confirm_delete_title: 'Êtes-vous sûr ?',
//                 confirm_delete_desc: "Cette action est irréversible. L'événement et toutes ses données associées (tickets, votes, etc.) seront définitivement supprimés.",
//                 event_deleted_success: 'Événement supprimé avec succès.',
//                 event_deleted_error: "Impossible de supprimer l'événement.",
//                 status_updated_success: 'Statut de l\'événement mis à jour.',
//                 status_updated_error: 'Impossible de mettre à jour le statut.',
//                 credit_user_for_event_title: "Créditer pour l'événement : {{eventName}}",
//                 credit_user_for_event_desc: "Sélectionnez un utilisateur de votre zone pour lui attribuer des pièces pour sa participation.",
//                 user_search_placeholder: "Rechercher par nom ou email...",
//                 credit_amount_label: 'Montant (pièces)',
//                 credit_reason_label: 'Raison du crédit',
//                 credit_reason_placeholder: "Participation à l'événement : {{eventName}}",
//                 no_users_found: "Aucun utilisateur trouvé dans votre zone.",
//                 credit_success_message: "{{userName}} a été crédité de {{amount}} pièces.",
//                 credit_error_generic: "Une erreur est survenue lors du crédit."
//             }
//           },
//         }
//       }
//     }
//   });

// export default i18n;
