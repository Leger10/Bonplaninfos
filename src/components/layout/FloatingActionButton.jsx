import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Ticket, Gift, Vote, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useData } from '@/contexts/DataContext';
import { motion } from 'framer-motion';

const FloatingActionButton = () => {
  const navigate = useNavigate();
  const { userProfile } = useData();

  // Roles allowed to see Simple Event
  const ALLOWED_ROLES_SIMPLE_EVENT = ['super_admin', 'admin', 'secretary'];
  const isAllowedToCreateSimpleEvent = userProfile && (
    ALLOWED_ROLES_SIMPLE_EVENT.includes(userProfile.user_type) ||
    userProfile.admin_type === 'secretary' ||
    userProfile.appointed_by_super_admin
  );

  const actions = [
    {
      label: 'Billetterie',
      icon: Ticket,
      color: 'bg-purple-500',
      route: '/create-ticketing-event',
      show: true
    },
    {
      label: 'Tombola',
      icon: Gift,
      color: 'bg-emerald-500',
      route: '/create-raffle-event',
      show: true
    },
    {
      label: 'Vote',
      icon: Vote,
      color: 'bg-orange-500',
      route: '/create-voting-event',
      show: true
    },
    {
      label: 'Annonce',
      icon: Megaphone,
      color: 'bg-blue-500',
      route: '/create-simple-event',
      show: isAllowedToCreateSimpleEvent // Only show if allowed
    },
  ];
  const canCreate = userProfile && ['organizer', 'admin', 'super_admin'].includes(userProfile.user_type);

  if (!canCreate) {
    return null;
  }

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.5 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="fixed bottom-24 right-4 z-50 md:hidden"
    >
      <Button
        size="icon"
        className="rounded-full w-14 h-14 shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center"
        onClick={() => navigate('/create-event')}
        aria-label="Créer un événement"
      >
        <Plus className="w-8 h-8" />
      </Button>
    </motion.div>
  );
};

export default FloatingActionButton;