import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAndroidBackButton } from '@/hooks/useAndroidBackButton';

export const PrivacyPolicyPage = () => {
  const navigate = useNavigate();

  useAndroidBackButton(true, () => {
    navigate('/profile');
  });

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto max-w-4xl px-4 py-6">
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 mb-6 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>

        <div className="prose prose-sm max-w-none">
          <h1 className="text-2xl font-bold mb-6">Politique de Confidentialité</h1>
          
          <p className="text-gray-600 mb-6">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-3">1. Informations collectées</h2>
            <p>Idle Grow collecte les informations suivantes :</p>
            <ul className="list-disc pl-6 mt-2">
              <li>Données de profil utilisateur (pseudonyme, statistiques de jeu)</li>
              <li>Progression du jeu (niveau, plantes, upgrades)</li>
              <li>Données d'utilisation pour améliorer l'expérience</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-3">2. Utilisation des données</h2>
            <p>Vos données sont utilisées pour :</p>
            <ul className="list-disc pl-6 mt-2">
              <li>Sauvegarder votre progression de jeu</li>
              <li>Afficher les classements</li>
              <li>Améliorer l'expérience utilisateur</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-3">3. Stockage des données</h2>
            <p>Les données sont stockées de manière sécurisée via Supabase et ne sont pas partagées avec des tiers sans votre consentement.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-3">4. Publicités</h2>
            <p>Cette application utilise AdMob pour afficher des publicités. Google peut collecter certaines données à des fins publicitaires selon sa propre politique de confidentialité.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-3">5. Vos droits</h2>
            <p>Vous pouvez demander la suppression de vos données en nous contactant à l'adresse indiquée ci-dessous.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-3">6. Contact</h2>
            <p>Pour toute question concernant cette politique : contact@idlegrow.com</p>
          </section>
        </div>
      </div>
    </div>
  );
};