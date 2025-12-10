import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const ADMIN_EMAILS = ['digihouse10@gmail.com', 'bonplaninfos@gmail.com'];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('bonplaninfos_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser.user_type === 'admin' && !ADMIN_EMAILS.includes(parsedUser.email)) {
          console.warn(`Security Alert: Non-admin email ${parsedUser.email} has admin user_type. Downgrading.`);
          parsedUser.user_type = 'user';
        }
        setUser(parsedUser);
      } catch (error) {
        console.error('Erreur lors du chargement de l\'utilisateur:', error);
        localStorage.removeItem('bonplaninfos_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const users = JSON.parse(localStorage.getItem('bonplaninfos_users') || '[]');
      let foundUser = users.find(u => u.email === email && u.password === password);

      if (!foundUser) {
        throw new Error('Email ou mot de passe incorrect');
      }

      if (foundUser.user_type === 'admin' && !ADMIN_EMAILS.includes(foundUser.email)) {
        console.warn(`Security Alert: Non-admin email ${foundUser.email} has admin user_type. Downgrading on login.`);
        foundUser.user_type = 'user';
      }

      foundUser.lastLoginAt = new Date().toISOString();
      const updatedUsers = users.map(u => u.id === foundUser.id ? foundUser : u);
      localStorage.setItem('bonplaninfos_users', JSON.stringify(updatedUsers));

      setUser(foundUser);
      localStorage.setItem('bonplaninfos_user', JSON.stringify(foundUser));

      toast({
        title: "Connexion réussie !",
        description: `Bienvenue ${foundUser.full_name} !`,
      });

      return foundUser;
    } catch (error) {
      toast({
        title: "Erreur de connexion",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      if (userData.user_type === 'admin') {
        throw new Error('La création de compte administrateur est interdite.');
      }

      const users = JSON.parse(localStorage.getItem('bonplaninfos_users') || '[]');

      if (users.find(u => u.email === userData.email)) {
        throw new Error('Cet email est déjà utilisé');
      }

      const referralCode = `BP${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

      const newUser = {
        id: Date.now().toString(),
        ...userData,
        user_type: userData.user_type || 'user',
        status: 'active',
        free_coin_balance: 10,
        referralCode,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      users.push(newUser);
      localStorage.setItem('bonplaninfos_users', JSON.stringify(users));

      setUser(newUser);
      localStorage.setItem('bonplaninfos_user', JSON.stringify(newUser));

      toast({
        title: "Inscription réussie !",
        description: `Bienvenue ${newUser.full_name} ! Vous avez reçu 10 pièces de bienvenue.`,
      });

      return newUser;
    } catch (error) {
      toast({
        title: "Erreur d'inscription",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('bonplaninfos_user');
    toast({
      title: "Déconnexion",
      description: "À bientôt !",
    });
  };

  const updateUser = (updatedData) => {
    if (updatedData.user_type === 'admin' && !ADMIN_EMAILS.includes(user.email)) {
      toast({
        title: "Action non autorisée",
        description: "Vous ne pouvez pas vous assigner le rôle d'administrateur.",
        variant: "destructive",
      });
      return;
    }

    const updatedUser = { ...user, ...updatedData };
    setUser(updatedUser);
    localStorage.setItem('bonplaninfos_user', JSON.stringify(updatedUser));

    const users = JSON.parse(localStorage.getItem('bonplaninfos_users') || '[]');
    const updatedUsers = users.map(u => {
      if (u.id === updatedUser.id) {
        if (updatedData.user_type === 'admin' && !ADMIN_EMAILS.includes(u.email)) {
          console.warn(`Security Alert: Attempt to grant admin user_type to non-admin email ${u.email}. Reverting.`);
          return { ...updatedUser, user_type: user.user_type };
        }
        return updatedUser;
      }
      return u;
    });
    localStorage.setItem('bonplaninfos_users', JSON.stringify(updatedUsers));
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    isAdmin: user?.user_type === 'admin' && ADMIN_EMAILS.includes(user?.email),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};