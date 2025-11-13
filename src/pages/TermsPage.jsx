import React from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const TermsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-white">
      <Helmet>
        <title>Conditions Générales d'Utilisation - BonPlaninfos</title>
        <meta name="description" content="Lisez les Conditions Générales d'Utilisation de BonPlaninfos pour comprendre vos droits et responsabilités sur la plateforme." />
      </Helmet>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-gray-300 hover:text-[#C9A227] mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>

          <h1 className="text-3xl font-bold text-white mb-2">
            Conditions Générales d'Utilisation de BonPlanInfos
          </h1>
          <p className="text-gray-400 text-sm">
            Date de dernière mise à jour : 01/10/2025 - Entrée en vigueur : 05/10/2025
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-effect rounded-2xl p-6 space-y-6 text-gray-300"
        >
          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Article 1 : Objet et Acceptation</h2>
            <p className="mb-2">Les présentes Conditions Générales d'Utilisation (CGU) régissent l'utilisation de la plateforme BonPlanInfos (bonplaninfos.net), application de mise en relation entre créateurs de contenu, organisateurs d'événements, annonceurs et utilisateurs en Afrique.</p>
            <p className="mb-2"><strong>Acceptation :</strong> L'utilisation de la plateforme implique l'acceptation sans réserve des présentes CGU.</p>

            <h3 className="text-lg font-semibold text-white mt-4 mb-2">Section 1 - Accès et Responsabilités</h3>
            <p className="mb-2">L'Administrateur Pays s'engage à :</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Maintenir la confidentialité de ses identifiants</li>
              <li>Ne pas partager son accès admin avec des tiers</li>
              <li>Respecter les guidelines de contenu BonPlanInfos</li>
              <li>Modérer activement les annonces de son territoire</li>
              <li>Signaler tout comportement suspect au Super Admin</li>
            </ul>
            <p className="mt-2 mb-2"><strong>Interdictions formelles :</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Tenter d'accéder aux données d'autres pays</li>
              <li>Modifier la structure technique de la plateforme</li>
              <li>Installer des extensions non autorisées</li>
              <li>Utiliser la plateforme à des fins personnelles.</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mt-4 mb-2">Section 2 - Standards de Contenu</h3>
            <p className="mb-2">Chaque Administrateur Pays doit garantir :</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>L'authenticité des annonces publiées</li>
              <li>Le respect des lois locales sur le commerce</li>
              <li>La modération des contenus inappropriés sous 24h</li>
              <li>La vérification des coordonnées des annonceurs</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mt-4 mb-2">Option A - Pour les Investisseurs-Fondateurs</h3>
            <p className="mb-2">Le partenaire investit [2.550.000F] pour obtenir la licence d'exploitation pour son pays.</p>
            <p className="mb-2"><strong>Revenue Sharing :</strong> 60% pour le partenaire local / 40% pour la maison mère</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Les 60% couvrent : marketing local, équipe, frais opérationnels</li>
              <li>Les 40% couvrent : maintenance technique, développement, support global</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mt-4 mb-2">Option B - Pour les Gestionnaires Salariés</h3>
            <p className="mb-2"><strong>Système de Paiement Centralisé :</strong></p>
            <p className="mb-2"><strong>Processus de Répartition :</strong></p>
            <ol className="list-decimal list-inside ml-4 space-y-1">
              <li>Tous les paiements arrivent sur le compte central BonPlanInfos</li>
              <li>Le système tracke automatiquement les revenus par pays</li>
              <li>Les rapports financiers sont générés le 5 de chaque mois</li>
              <li>Les virements aux partenaires sont effectués le 15 du mois</li>
              <li>Reçu et justificatifs fournis pour chaque transaction</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Article 2 : Définitions</h2>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><strong>Plateforme :</strong> Application et site web BonPlanInfos</li>
              <li><strong>Utilisateur :</strong> Toute personne utilisant la plateforme</li>
              <li><strong>Créateur ou Organisateur :</strong> Utilisateur publiant du contenu (événements, promotions)</li>
              <li><strong>Organisateur :</strong> Créateur organisant des événements payants ou gratuits</li>
              <li><strong>Annonceur ou Utilisateur :</strong> Utilisateur publiant des promotions commerciales</li>
              <li><strong>Pièces :</strong> Monnaie virtuelle de la plateforme (50 pièce = 1000 FCFA)</li>
              <li><strong>Contenu :</strong> Événements, promotions, publications, commentaires, notification a temps réel.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Article 3 : Inscription et Compte</h2>
            <h3 className="text-lg font-semibold text-white mt-4 mb-2">3.1 L'inscription nécessite :</h3>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Une adresse email valide</li>
              <li>Un numéro de téléphone vérifié</li>
              <li>Votre Pays et ville de résidence</li>
              <li>L'acceptation des CGU et de la politique de confidentialité</li>
            </ul>
            <h3 className="text-lg font-semibold text-white mt-4 mb-2">3.2 Les utilisateurs s'engagent à :</h3>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Fournir des informations exactes et complètes</li>
              <li>Maintenir la confidentialité de leurs identifiants</li>
              <li>Informer immédiatement de toute utilisation non autorisée</li>
            </ul>
            <h3 className="text-lg font-semibold text-white mt-4 mb-2">3.3 Types de comptes :</h3>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Utilisateur standard (accès gratuit aux fonctionnalités de base)</li>
              <li>Organisateur: (publication d'événements, vérification requise)</li>
              <li>Annonceur Utilisateur: (publication de promotions, vérification requise)</li>
              <li>Admin (gestion de plateforme)</li>
            </ul>
            <h3 className="text-lg font-semibold text-white mt-4 mb-2">3.4 Contenus et responsabilités</h3>
            <p className="mb-2">Vous vous engagez à ne pas publier de contenus offensants, illégaux, ou portant atteinte aux droits de tiers.</p>
            <p className="mb-2">BonPlaninfos se réserve le droit de supprimer tout contenu qui ne respecte pas nos standards.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Article 4 : Système de Pièces et Monétisation</h2>
            <h3 className="text-lg font-semibold text-white mt-4 mb-2">4.1 Acquisition de pièces :</h3>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Achat via packs (50 à 1300 pièces)</li>
              <li>Parrainage (20 pièces par filleul actif)</li>
              <li>Récompenses pour contenu populaire</li>
              <li>Participation aux programmes de fidélité</li>
            </ul>
            <h3 className="text-lg font-semibold text-white mt-4 mb-2">4.2 Utilisation des pièces :</h3>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Publication d'événements (coût variable)</li>
              <li>Publication de promotions (coût variable)</li>
              <li>Boost de visibilité du contenu</li>
              <li>Accès à du contenu exclusif</li>
            </ul>
            <h3 className="text-lg font-semibold text-white mt-4 mb-2">4.3 Conversion et retraits :</h3>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Taux de conversion : 50 pièces = 1000 FCFA</li>
              <li>Seuil minimal de retrait : 50 pièces</li>
              <li>Modalités de retrait : Orange Money, Moov Money, Wave, PayPal</li>
              <li>Délai de traitement : 24-72 heures</li>
            </ul>
            <h3 className="text-lg font-semibold text-white mt-4 mb-2">4.4 Politique de remboursement :</h3>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Aucun remboursement des pièces achetées</li>
              <li>Annulation d'événement : remboursement des pièces utilisées</li>
              <li>Content supprimé : pas de remboursement des pièces dépensées</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Article 5 : Contenu et Publications</h2>
            <h3 className="text-lg font-semibold text-white mt-4 mb-2">5.1 Responsabilités des créateurs :</h3>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Exactitude des informations publiées</li>
              <li>Respect des droits d'auteur et propriété intellectuelle</li>
              <li>Conformité avec la législation locale</li>
              <li>Obtenir les autorisations nécessaires pour les événements</li>
            </ul>
            <h3 className="text-lg font-semibold text-white mt-4 mb-2">5.2 Contenu interdit :</h3>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Contenu illégal ou frauduleux</li>
              <li>Contenu discriminatoire ou haineux</li>
              <li>Contenu pornographique ou explicite</li>
              <li>Informations commerciales trompeuses</li>
              <li>Spam et contenus répétitifs</li>
            </ul>
            <h3 className="text-lg font-semibold text-white mt-4 mb-2">5.3 Modération :</h3>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Droit de modération a posteriori par BonPlanInfos</li>
              <li>Possibilité de suppression sans préavis des contenus non conformes</li>
              <li>Système de signalement par les utilisateurs</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Article 6 : Propriété Intellectuelle</h2>
            <h3 className="text-lg font-semibold text-white mt-4 mb-2">6.1 Contenu utilisateur :</h3>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Les utilisateurs conservent leurs droits sur leur contenu</li>
              <li>Licence d'utilisation accordée à BonPlanInfos pour l'exploitation de la plateforme</li>
            </ul>
            <h3 className="text-lg font-semibold text-white mt-4 mb-2">6.2 Plateforme BonPlanInfos :</h3>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Marque, logo et éléments graphiques protégés</li>
              <li>Code source et architecture technique protégés</li>
              <li>Interdiction de reproduction sans autorisation</li>
            </ul>
            <p className="mb-2">Le Partenaire reconnaît que la plateforme, son code source, sa base de données et la marque BonPlanInfos sont et restent la propriété exclusive du Fondateur Principal.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Article 7 : Données Personnelles</h2>
            <h3 className="text-lg font-semibold text-white mt-4 mb-2">7.1 Collecte et utilisation :</h3>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Données collectées : identité, coordonnées, localisation, contenus, interactions</li>
              <li>Finalités : fourniture du service, personnalisation, analytics, marketing</li>
            </ul>
            <h3 className="text-lg font-semibold text-white mt-4 mb-2">7.2 Cookies et traceurs :</h3>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Utilisation de cookies techniques et analytiques</li>
              <li>Consentement requis pour les cookies marketing</li>
              <li>Possibilité de désactivation dans les paramètres</li>
            </ul>
            <h3 className="text-lg font-semibold text-white mt-4 mb-2">7.3 Droits des utilisateurs :</h3>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Droit d'accès, rectification, opposition, suppression</li>
              <li>Contact : bonplaninfos@gmail.com</li>
              <li>Délai de réponse : 30 jours maximum</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Article 8 : Responsabilités</h2>
            <h3 className="text-lg font-semibold text-white mt-4 mb-2">8.1 Responsabilité de BonPlanInfos :</h3>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Fourniture du service avec diligence raisonnable</li>
              <li>Non responsable des contenus publiés par les utilisateurs</li>
              <li>Obligation de moyens, non de résultat</li>
            </ul>
            <h3 className="text-lg font-semibold text-white mt-4 mb-2">8.2 Responsabilité des utilisateurs :</h3>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Exactitude des informations publiées</li>
              <li>Respect des engagements envers les autres utilisateurs</li>
              <li>Utilisation conforme aux lois en vigueur</li>
            </ul>
            <h3 className="text-lg font-semibold text-white mt-4 mb-2">8.3 Force majeure :</h3>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Interruptions de service pour maintenance technique</li>
              <li>Cas de force majeure (panne infrastructure, etc.)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Article 9 : Transactions et Paiements</h2>
            <h3 className="text-lg font-semibold text-white mt-4 mb-2">9.1 Événements payants :</h3>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>traitement des paiements via partenaires certifiés</li>
              <li>Retrait ; Commission de 2% est appliquée sur les transactions</li>
              <li>Paiement aux organisateurs sous 5 jours ouvrés</li>
            </ul>
            <h3 className="text-lg font-semibold text-white mt-4 mb-2">9.2 Promotions payantes :</h3>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Tarification selon visibilité et durée</li>
              <li>Aucun remboursement après publication</li>
            </ul>
            <h3 className="text-lg font-semibold text-white mt-4 mb-2">9.3 Paiements et commissions</h3>
            <p className="mb-2">Les commissions et gains sont versés selon les conditions établies sur la plateforme.</p>
            <p className="mb-2">BonPlaninfos ne peut être tenu responsable des retards ou erreurs de paiement causés par des informations incorrectes fournies par l’utilisateur</p>
            <h3 className="text-lg font-semibold text-white mt-4 mb-2">9.3 Litiges :</h3>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Médiation prioritaire en cas de litige entre utilisateurs</li>
              <li>Recours possibles auprès des autorités compétentes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Article 10 : Suspension et Résiliation</h2>
            <h3 className="text-lg font-semibold text-white mt-4 mb-2">10.1 Par l'utilisateur :</h3>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Résiliation à tout temps via paramètres du compte</li>
              <li>Suppression des données conformément à la politique de conservation</li>
            </ul>
            <h3 className="text-lg font-semibold text-white mt-4 mb-2">10.2 Par BonPlanInfos :</h3>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Suspension immédiate en cas de violation des CGU</li>
              <li>Résiliation après avertissement sans régularisation</li>
              <li>Conservation des données en cas d'obligation légale</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Article 11 : Évolutions et Modifications</h2>
            <h3 className="text-lg font-semibold text-white mt-4 mb-2">11.1 Service :</h3>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>BonPlanInfos se réserve le droit de faire évoluer les fonctionnalités</li>
              <li>Information des utilisateurs des modifications substantielles</li>
            </ul>
            <h3 className="text-lg font-semibold text-white mt-4 mb-2">11.2 CGU :</h3>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Modification possible à tout temps</li>
              <li>Information par email et notification dans l'application</li>
              <li>Acceptation implicite si poursuite d'utilisation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Article 12 : Loi Applicable et Litiges</h2>
            <h3 className="text-lg font-semibold text-white mt-4 mb-2">12.1 Loi applicable :</h3>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Droit applicable : selon pays d'incorporation</li>
              <li>Langue d'interprétation : français</li>
            </ul>
            <h3 className="text-lg font-semibold text-white mt-4 mb-2">12.2 Règlement des litiges :</h3>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Tentative de médiation obligatoire</li>
              <li>Recours aux tribunaux compétents en cas d'échec</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Article 13 : Dispositions Diverses</h2>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><strong>13.1 Indépendance des parties :</strong> Aucune relation de société ou de mandat</li>
              <li><strong>13.2 Divisibilité :</strong> Nullité partielle n'affectant pas le reste des dispositions</li>
              <li><strong>13.3 Non-renonciation :</strong> Absence de poursuite ne valant pas renonciation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Article 14 : Contact</h2>
            <p className="mb-2">Pour toute question concernant les CGU :</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Email : légal bonplaninfos@gmail.com</li>
              <li>Adresse postale : [bonplaninfos@gmail.com]</li>
              <li>Délai de réponse : 15 jours ouvrés</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">ANNEXES</h2>
            <h3 className="text-lg font-semibold text-white mt-4 mb-2">GRILLE TARIFAIRE - BONPLANINFOS</h3>
            <h4 className="text-md font-semibold text-white mt-2 mb-1">ANNEXE 1 - TARIFS ET ABONNEMENTS</h4>
            <p className="mb-1"><strong>1. PACKS DE PIÈCES POUR UTILISATEURS</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Pack Découverte : 50 pièces</li>
              <li>Pack Standard : 150 pièces</li>
              <li>Pack Booster : 350 pièces (300 + 50 bonus)</li>
              <li>Pack Premium : 800 pièces (650 + 150 bonus)</li>
              <li>Pack VIP : 1 500 pièces (1200 + 300 bonus)</li>
            </ul>
            <p className="mb-1 mt-2"><strong>2. UTILISATION DES PIÈCES</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Voir un contenu : 3 pièces</li>
              <li>Télécharger un contenu : 5 pièces</li>
              <li>Partager un contenu : 5 pièces</li>
            </ul>
            <p className="mb-1 mt-2"><strong>3. PUBLICATION DE CONTENU</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Publication événement basique : (durée 7 jours)</li>
              <li>Publication promotion basique : (durée 15 jours)</li>
            </ul>
            <p className="mb-1 mt-2"><strong>4. OPTIONS DE BOOST</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Boost Standard : pour 30 jours</li>
              <li>Boost Premium : pour 1 mois</li>
            </ul>
            <p className="mb-1 mt-2"><strong>5. PUBLICITÉ AVANCÉE</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Bannière publicitaire : par mois</li>
              <li>Notification Push : par mois</li>
              <li>Pack Combo Pro (Bannière + Notification) : par mois</li>
            </ul>
            <p className="mb-1 mt-2"><strong>6. LICENCES PAYS POUR INVESTISSEURS</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Licence Starter : 100 000 FCFA par mois - Droit à 20% du chiffre d'affaires du pays</li>
              <li>Licence Business : 300 000 FCFA par mois - Droit à 35% du chiffre d'affaires du pays</li>
              <li>Licence Premium : 500 000 FCFA par mois - Droit à 50% du chiffre d'affaires du pays</li>
            </ul>
            <p className="mb-1 mt-2"><strong>CONDITIONS GÉNÉRALES</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Les pièces achetées sont valables 12 mois à compter de la date d'achat</li>
              <li>Les packs promotionnels avec bonus peuvent être modifiés ou retirés sans préavis</li>
              <li>Les publications doivent respecter les guidelines de contenu de la plateforme</li>
              <li>Les licences pays sont soumises à contrat de partenariat séparé</li>
              <li>Tout abonnement ou achat est non remboursable</li>
              <li>BonPlanInfos se réserve le droit de modifier les tarifs avec un préavis de 30 jours</li>
            </ul>
            <p className="mt-2">Les prix sont indiqués en Francs CFA (FCFA) et peuvent être convertis dans la devise locale au taux du jour.</p>

            <h4 className="text-md font-semibold text-white mt-4 mb-1">Annexe 2 : Politique de Modération</h4>
            <p className="mb-2">Critères de modération détaillés et procédures de signalement.</p>

            <h4 className="text-md font-semibold text-white mt-4 mb-1">Annexe 3 : Politique de Confidentialité</h4>
            <p className="mb-2">Détails sur le traitement des données personnelles.</p>
          </section>
        </motion.div>
      </main>
    </div>
  );
};

export default TermsPage;