import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useData } from '@/contexts/DataContext';
import { motion } from 'framer-motion';

const FloatingActionButton = () => {
  const navigate = useNavigate();
  const { userProfile } = useData();

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