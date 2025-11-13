import React from 'react';
import { Edit, Eye, Ban, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/components/ui/use-toast';

const UserManagementTab = ({ users }) => {
  const handleUserAction = (userId, action) => {
    toast({
      title: "🚧 Cette fonctionnalité n'est pas encore implémentée—mais ne vous inquiétez pas ! Vous pouvez la demander dans votre prochaine requête ! 🚀",
    });
  };

  const getRoleColor = (role) => {
    const colors = {
      user: 'bg-blue-500',
      organizer: 'bg-[#C9A227]',
      secretary: 'bg-purple-500',
      admin: 'bg-orange-500',
      super_admin: 'bg-[#E53935]'
    };
    return colors[role] || 'bg-blue-500';
  };

  const getRoleLabel = (role) => {
    const labels = {
      user: 'Utilisateur',
      organizer: 'Organisateur',
      secretary: 'Secrétaire',
      admin: 'Administrateur',
      super_admin: 'Super Admin'
    };
    return labels[role] || 'Utilisateur';
  };

  return (
    <Card className="glass-effect border-[#E53935]/20">
      <CardHeader>
        <CardTitle className="text-white">Gestion des utilisateurs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {users.map((userItem) => (
            <div
              key={userItem.id}
              className="flex items-center justify-between p-4 bg-[#111] rounded-lg"
            >
              <div className="flex items-center space-x-4">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={userItem.avatar_url} />
                  <AvatarFallback className="bg-[#C9A227] text-[#0B0B0D]">
                    {userItem.name?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-white">{userItem.name}</p>
                  <p className="text-sm text-gray-400">{userItem.email}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge className={`${getRoleColor(userItem.role)} text-white text-xs`}>
                      {getRoleLabel(userItem.role)}
                    </Badge>
                    <Badge className={`${userItem.is_active ? 'bg-green-500' : 'bg-red-500'} text-white text-xs`}>
                      {userItem.is_active ? 'Actif' : 'Bloqué'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-[#C9A227] font-medium">
                  {userItem.total_coins || 0} pièces
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleUserAction(userItem.id, 'view')}
                  className="text-gray-300 hover:text-blue-400"
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleUserAction(userItem.id, 'edit')}
                  className="text-gray-300 hover:text-[#C9A227]"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleUserAction(userItem.id, userItem.is_active ? 'block' : 'unblock')}
                  className={`text-gray-300 hover:${userItem.is_active ? 'text-red-400' : 'text-green-400'}`}
                >
                  {userItem.is_active ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserManagementTab;