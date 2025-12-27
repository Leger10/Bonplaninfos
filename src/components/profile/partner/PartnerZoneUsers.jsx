import React, { useState, useEffect } from 'react';
import SecretaryUserManagementTab from '@/components/secretary/SecretaryUserManagementTab';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2 } from 'lucide-react';

// Reusing the Secretary User Management which is scoped by country
const PartnerZoneUsers = () => {
  // We need to pass the list of users, or let the component fetch if it handles it.
  // The existing SecretaryUserManagementTab takes 'users' as prop.
  // We'll wrap it to fetch users first for the specific country.
  
  // Actually, let's create a wrapper that uses the existing component logic but ensure data context
  // The SecretaryUserManagementTab expects a list of users.
  
  // NOTE: Ideally we should refactor SecretaryUserManagementTab to fetch its own data if not provided,
  // but for now let's assume we pass the global users list filtered by country here, or fetch them.
  
  return (
    <div className="space-y-4">
       <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg mb-4 text-sm">
         En tant que Partenaire, vous avez une vue complète sur les utilisateurs de votre zone.
         Vous pouvez gérer les statuts et créditer des comptes si nécessaire.
       </div>
       {/* Leveraging the existing robust component */}
       <ConnectedUserManagement />
    </div>
  );
};

const ConnectedUserManagement = () => {
    const { userProfile } = useData();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            if (!userProfile?.country) return;
            setLoading(true);
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('country', userProfile.country)
                .order('created_at', { ascending: false })
                .limit(100); // Pagination handled inside or limited here for perf
            
            setUsers(data || []);
            setLoading(false);
        };
        fetchUsers();
    }, [userProfile?.country]);

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return <SecretaryUserManagementTab users={users} onRefresh={() => window.location.reload()} />;
}

export default PartnerZoneUsers;