import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus, Search, Trash2, Shield, Check, User, Mail, DollarSign } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrencySimple } from '@/lib/utils';

const PartnerSecretaryManager = ({ country }) => {
  const { user } = useAuth();
  const [secretaries, setSecretaries] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loadingSecretaries, setLoadingSecretaries] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [processing, setProcessing] = useState(false);
  
  // Permissions state
  const [permissions, setPermissions] = useState({
    moderate_users: false,
    moderate_events: false,
    moderate_venues: false
  });

  useEffect(() => {
    if (country) {
      fetchSecretaries();
    }
  }, [country]);

  // Fetch candidates when dialog opens or search changes
  useEffect(() => {
    if (isDialogOpen && country) {
      const delayDebounceFn = setTimeout(() => {
        fetchCandidates();
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [searchQuery, isDialogOpen, country]);

  const fetchSecretaries = async () => {
    setLoadingSecretaries(true);
    try {
      // Fetch users appointed by this partner. 
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_type', 'secretary')
        .eq('appointed_by', user.id);

      if (usersError) throw usersError;

      // Calculate stats for each secretary
      const enrichedData = await Promise.all(usersData.map(async (sec) => {
          // Get Estimated Earnings
          const { data: salaryData } = await supabase
            .rpc('get_secretary_salary_stats', { p_secretary_id: sec.id });
            
          // Get Permissions
          const { data: permData } = await supabase
            .from('admin_users')
            .select('permissions')
            .eq('user_id', sec.id)
            .maybeSingle();

          return {
              ...sec,
              estimated_salary: salaryData?.estimated_earnings_fcfa || 0,
              permissions: permData?.permissions || {}
          };
      }));

      setSecretaries(enrichedData);
    } catch (error) {
      console.error("Error fetching secretaries:", error);
      toast({ title: "Erreur", description: "Impossible de charger les secrétaires.", variant: "destructive" });
    } finally {
      setLoadingSecretaries(false);
    }
  };

  const fetchCandidates = async () => {
    setLoadingCandidates(true);
    try {
      let query = supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, user_type')
        .eq('country', country)
        .in('user_type', ['user', 'organizer']) // Can promote standard users or organizers
        .neq('id', user.id) // Exclude self
        .limit(20);

      if (searchQuery.trim()) {
        query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCandidates(data || []);
    } catch (error) {
      console.error("Error searching candidates:", error);
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleAppointSecretary = async () => {
    if (!selectedCandidate) return;
    setProcessing(true);
    try {
      // 1. Update Profile Role
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          user_type: 'secretary',
          appointed_by: user.id
        })
        .eq('id', selectedCandidate.id);

      if (profileError) throw profileError;

      // 2. Insert/Update Admin Permissions
      const { error: adminError } = await supabase
        .from('admin_users')
        .upsert({
          user_id: selectedCandidate.id,
          role: 'secretary',
          permissions: permissions,
          is_active: true
        });

      if (adminError) throw adminError;

      toast({ title: "Succès", description: `${selectedCandidate.full_name || selectedCandidate.email} a été nommé secrétaire avec succès.` });
      
      // Reset state
      setIsDialogOpen(false);
      setSearchQuery('');
      setCandidates([]);
      setPermissions({ moderate_users: false, moderate_events: false, moderate_venues: false });
      setSelectedCandidate(null);
      
      // Refresh list
      fetchSecretaries();
    } catch (error) {
      console.error("Error appointing secretary:", error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleRevokeSecretary = async (secretaryId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir révoquer ce secrétaire ? Cette action retirera tous ses droits d'administration.")) return;
    setProcessing(true);
    try {
      // Demote in profiles
      const { error } = await supabase
        .from('profiles')
        .update({ 
          user_type: 'user', 
          appointed_by: null 
        })
        .eq('id', secretaryId);

      if (error) throw error;

      // Deactivate in admin_users
      await supabase
        .from('admin_users')
        .update({ is_active: false })
        .eq('user_id', secretaryId);

      toast({ title: "Succès", description: "Accès secrétaire révoqué." });
      fetchSecretaries();
    } catch (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const openAddDialog = () => {
    setSelectedCandidate(null); 
    setPermissions({ moderate_users: false, moderate_events: false, moderate_venues: false });
    setSearchQuery('');
    setCandidates([]);
    setIsDialogOpen(true); 
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Gestion des Secrétaires</h3>
          <p className="text-sm text-muted-foreground">Gérez votre équipe locale pour la zone {country}</p>
        </div>
        <Button onClick={openAddDialog} size="sm" className="bg-primary hover:bg-primary/90">
          <UserPlus className="w-4 h-4 mr-2" /> Ajouter un secrétaire
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loadingSecretaries ? (
          <div className="col-span-full flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : secretaries.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/20">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">Aucun secrétaire nommé.</p>
            <p className="text-sm mt-1">Ajoutez des collaborateurs pour vous aider à gérer les événements et utilisateurs de la zone.</p>
            <Button variant="outline" onClick={openAddDialog} className="mt-4">
              Nommer un secrétaire
            </Button>
          </div>
        ) : (
          secretaries.map(sec => (
            <Card key={sec.id} className="relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
              <CardContent className="p-4 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border-2 border-indigo-100">
                    <AvatarImage src={sec.avatar_url} />
                    <AvatarFallback className="bg-indigo-50 text-indigo-700 font-bold">{sec.full_name?.charAt(0) || 'S'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate text-sm">{sec.full_name || 'Utilisateur'}</p>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {sec.email}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground hover:text-red-500 hover:bg-red-50 -mr-2"
                    onClick={() => handleRevokeSecretary(sec.id)}
                    disabled={processing}
                    title="Révoquer les accès"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="space-y-2 pt-2 border-t border-dashed">
                  <div className="flex justify-between items-center bg-green-50 p-2 rounded text-xs text-green-800 font-medium">
                     <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> Salaire Estimé:</span>
                     <span>{formatCurrencySimple(sec.estimated_salary)}</span>
                  </div>

                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Droits d'accès:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {sec.permissions?.moderate_users && (
                      <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
                        Utilisateurs
                      </Badge>
                    )}
                    {sec.permissions?.moderate_events && (
                      <Badge variant="secondary" className="text-[10px] bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200">
                        Événements
                      </Badge>
                    )}
                    {sec.permissions?.moderate_venues && (
                      <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
                        Lieux
                      </Badge>
                    )}
                    {!sec.permissions?.moderate_users && !sec.permissions?.moderate_events && !sec.permissions?.moderate_venues && (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">Aucun droit</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nommer un Secrétaire</DialogTitle>
            <DialogDescription>
              Recherchez un utilisateur existant dans <strong>{country}</strong> et attribuez-lui des droits de modération.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-2">
            {/* Search Section */}
            <div className="space-y-3">
              <Label>Rechercher un utilisateur</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Nom ou email..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="border rounded-md bg-muted/10 overflow-hidden">
                {loadingCandidates ? (
                  <div className="p-4 text-center">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
                  </div>
                ) : candidates.length > 0 ? (
                  <ScrollArea className="h-[180px]">
                    <div className="divide-y">
                      {candidates.map(candidate => (
                        <div 
                          key={candidate.id} 
                          className={`flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors ${selectedCandidate?.id === candidate.id ? 'bg-primary/5 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}
                          onClick={() => setSelectedCandidate(candidate)}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={candidate.avatar_url} />
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {candidate.full_name?.charAt(0) || <User className="w-4 h-4" />}
                              </AvatarFallback>
                            </Avatar>
                            <div className="truncate">
                              <p className="text-sm font-medium leading-none">{candidate.full_name || 'Utilisateur'}</p>
                              <p className="text-xs text-muted-foreground mt-1">{candidate.email}</p>
                            </div>
                          </div>
                          {selectedCandidate?.id === candidate.id && (
                            <Check className="w-4 h-4 text-primary shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    {searchQuery ? "Aucun utilisateur trouvé" : "Commencez à taper pour rechercher"}
                  </div>
                )}
              </div>
            </div>

            {/* Permissions Section - Only shown when user selected */}
            {selectedCandidate && (
              <div className="space-y-3 bg-primary/5 p-4 rounded-lg border border-primary/10 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-primary/10">
                  <User className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">Droits pour {selectedCandidate.full_name}</span>
                </div>
                <div className="grid gap-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="perm_users" 
                      checked={permissions.moderate_users}
                      onCheckedChange={(c) => setPermissions(p => ({ ...p, moderate_users: c }))}
                    />
                    <label htmlFor="perm_users" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                      Modérer les Utilisateurs
                      <span className="block text-xs text-muted-foreground font-normal mt-0.5">Peut bloquer/activer les comptes utilisateurs</span>
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="perm_events" 
                      checked={permissions.moderate_events}
                      onCheckedChange={(c) => setPermissions(p => ({ ...p, moderate_events: c }))}
                    />
                    <label htmlFor="perm_events" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                      Modérer les Événements
                      <span className="block text-xs text-muted-foreground font-normal mt-0.5">Peut valider ou suspendre les événements</span>
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="perm_venues" 
                      checked={permissions.moderate_venues}
                      onCheckedChange={(c) => setPermissions(p => ({ ...p, moderate_venues: c }))}
                    />
                    <label htmlFor="perm_venues" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                      Modérer les Lieux
                      <span className="block text-xs text-muted-foreground font-normal mt-0.5">Peut gérer les établissements référencés</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleAppointSecretary} disabled={!selectedCandidate || processing} className="bg-primary">
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmer la nomination
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartnerSecretaryManager;