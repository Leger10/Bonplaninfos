import React from 'react';
import { Helmet } from 'react-helmet';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const PlaceholderPage = ({ title, description }) => {
  return (
    <MainLayout>
      <Helmet>
        <title>{title} - BonPlaninfos</title>
      </Helmet>
      <div className="flex flex-col items-center justify-center text-center h-full py-20">
        <h1 className="text-4xl font-bold text-brand-gold mb-4">{title}</h1>
        <p className="text-lg text-gray-400 mb-8">{description}</p>
        <p className="text-2xl mb-8">🚧</p>
        <p className="mb-8">Cette page est en cours de construction.</p>
        <Button asChild>
          <Link to="/">Retour à l'accueil</Link>
        </Button>
      </div>
    </MainLayout>
  );
};

export default PlaceholderPage;