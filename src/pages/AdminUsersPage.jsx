import React from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import UserManagement from '@/components/admin/UserManagement';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';

const AdminUsersPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userProfile } = useData();

  // Basic access check
  if (!user || !userProfile || !['super_admin', 'admin', 'secretary'].includes(userProfile.user_type)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-500">Accès Refusé</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-muted-foreground">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
            <Button onClick={() => navigate('/')} className="w-full">Retour à l'accueil</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Helmet>
        <title>Gestion des Utilisateurs - Admin</title>
      </Helmet>

      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => navigate('/admin')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au Tableau de bord
          </Button>

          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-full bg-primary/10">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Gestion des Utilisateurs</h1>
              <p className="text-muted-foreground">
                Gérez les utilisateurs, leurs rôles et leurs statuts.
                {userProfile.user_type !== 'super_admin' && (
                  <span className="block text-xs mt-1 text-orange-500">
                    * Vue restreinte à votre zone ({userProfile.country} {userProfile.city ? `- ${userProfile.city}` : ''})
                  </span>
                )}
              </p>
            </div>
          </div>

          <Card className="glass-effect shadow-lg border-primary/10">
            <CardContent className="p-6">
              <UserManagement />
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default AdminUsersPage;