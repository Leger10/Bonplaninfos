import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useData } from '@/contexts/DataContext';

const FloatingActionButton = () => {
  const navigate = useNavigate();
  const { userProfile } = useData();

  const canCreate = userProfile && ['organizer', 'admin', 'super_admin'].includes(userProfile.user_type);

  if (!canCreate) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 md:hidden">
      <Button
        size="icon"
        className="rounded-full w-14 h-14 shadow-lg bg-primary text-primary-foreground flex items-center justify-center"
        onClick={() => navigate('/create-event')}
      >
        <Plus className="w-8 h-8" />
      </Button>
    </div>
  );
};

export default FloatingActionButton;