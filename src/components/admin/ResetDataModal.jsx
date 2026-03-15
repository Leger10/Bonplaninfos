// Champ de recherche refait pour accepter le texte libre et permettre la recherche temps réel
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { 
  AlertTriangle, 
  RotateCcw, 
  Loader2, 
  MapPin, 
  Users, 
  Coins,
  Gift,
  RefreshCw,
  Eraser,
  DollarSign,
  Trash2,
  User,
  Building,
  Check,
  Search,
  X
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn, formatCurrencySimple } from '@/lib/utils';

/**
 * Modal de réinitialisation individuelle avec vue détaillée du portefeuille
 */
const ResetDataModal = ({ open, onOpenChange, onSuccess }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingProfiles, setIsFetchingProfiles] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  const [resetType, setResetType] = useState('user');
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedOrganizerId, setSelectedOrganizerId] = useState("");
  
  const [profiles, setProfiles] = useState([]);
  const [detailedWallet, setDetailedWallet] = useState(null);

  // Nouveaux états pour la recherche en temps réel
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchContainerRef = useRef(null);

  const [resetOptions, setResetOptions] = useState({
    paid: true,
    free: true,
    earnings: true
  });

  // Gérer le clic à l'extérieur pour fermer le menu déroulant
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      fetchProfiles();
      setResetType('user');
      setSelectedUserId("");
      setSelectedOrganizerId("");
      setSearchQuery("");
      setDetailedWallet(null);
      setResetOptions({ paid: true, free: true, earnings: true });
    }
  }, [open]);

  // Réinitialiser la recherche lors du changement de type
  useEffect(() => {
    setSearchQuery("");
    setIsDropdownOpen(false);
    setSelectedUserId("");
    setSelectedOrganizerId("");
  }, [resetType]);

  // Fetch target user live details whenever selection changes
  useEffect(() => {
    const targetId = resetType === 'user' ? selectedUserId : (resetType === 'organizer' ? selectedOrganizerId : null);
    if (targetId && resetType !== 'all') {
      fetchDetailedWallet(targetId);
    } else {
      setDetailedWallet(null);
    }
  }, [selectedUserId, selectedOrganizerId, resetType]);

  const fetchProfiles = async () => {
    setIsFetchingProfiles(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, user_type, coin_balance, free_coin_balance, available_earnings, total_earnings')
        .in('user_type', ['user', 'organizer']);

      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      console.error("Erreur liste profils:", err);
      toast({ title: "Erreur", description: "Impossible de charger la liste.", variant: "destructive" });
    } finally {
      setIsFetchingProfiles(false);
    }
  };

  const fetchDetailedWallet = async (id) => {
    setIsLoadingDetails(true);
    setDetailedWallet(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, coin_balance, free_coin_balance, available_earnings, total_earnings')
        .eq('id', id)
        .single();
      if (error) throw error;
      setDetailedWallet(data);
    } catch (error) {
      console.error("Erreur détails portefeuille:", error);
      toast({ title: "Erreur", description: "Impossible de charger le portefeuille.", variant: "destructive" });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const usersList = useMemo(() => profiles.filter(p => p.user_type === 'user'), [profiles]);
  const organizersList = useMemo(() => profiles.filter(p => p.user_type === 'organizer'), [profiles]);
  
  const totalUserBalance = useMemo(() => usersList.reduce((acc, curr) => acc + (curr.coin_balance || 0) + (curr.free_coin_balance || 0), 0), [usersList]);
  const totalOrganizerEarnings = useMemo(() => organizersList.reduce((acc, curr) => acc + (curr.available_earnings || 0), 0), [organizersList]);

  // Filtrage en temps réel
  const filteredList = useMemo(() => {
    const list = resetType === 'user' ? usersList : organizersList;
    if (!searchQuery.trim()) return list;
    
    const query = searchQuery.toLowerCase();
    return list.filter(p => 
      (p.full_name && p.full_name.toLowerCase().includes(query)) ||
      (p.email && p.email.toLowerCase().includes(query))
    );
  }, [usersList, organizersList, resetType, searchQuery]);

  const handleSelectTarget = (usr) => {
    if (resetType === 'user') {
      setSelectedUserId(usr.id);
    } else {
      setSelectedOrganizerId(usr.id);
    }
    setSearchQuery(usr.full_name || usr.email || 'Utilisateur sélectionné');
    setIsDropdownOpen(false);
  };

  const clearSelection = () => {
    setSearchQuery('');
    setSelectedUserId('');
    setSelectedOrganizerId('');
    setDetailedWallet(null);
    setIsDropdownOpen(true); // Rouvrir la liste après effacement
  };

  const handleReset = async () => {
    if (!user) return;

    if (!resetOptions.paid && !resetOptions.free && !resetOptions.earnings) {
      toast({ title: "Sélection requise", description: "Veuillez cocher au moins une option à réinitialiser.", variant: "warning" });
      return;
    }
    
    let targetId = null;
    if (resetType === 'user') targetId = selectedUserId;
    else if (resetType === 'organizer') targetId = selectedOrganizerId;

    if (resetType !== 'all' && !targetId) {
        toast({ title: "Sélection requise", description: "Veuillez sélectionner une cible.", variant: "destructive" });
        return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.rpc('reset_granular_user_data', {
        p_admin_id: user.id,
        p_target_id: targetId,
        p_reset_type: resetType,
        p_reset_paid: resetOptions.paid,
        p_reset_free: resetOptions.free,
        p_reset_earnings: resetOptions.earnings
      });

      if (error) throw error;
      if (data && data.success === false) throw new Error(data.message);

      toast({
        title: "Réinitialisation réussie",
        description: data.message || "Les données ont été remises à jour.",
        variant: "success"
      });
      
      if (targetId) await fetchDetailedWallet(targetId);
      if (onSuccess) onSuccess();
      
      // Close modal on success for better flow
      setTimeout(() => onOpenChange(false), 1500);

    } catch (error) {
      console.error("Reset error:", error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur s'est produite lors de la réinitialisation.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !isLoading && onOpenChange(val)}>
      <DialogContent className="sm:max-w-[650px] rounded-2xl border-border/50 shadow-2xl overflow-hidden p-0">
        <DialogHeader className="p-6 pb-2 bg-gradient-to-r from-background to-muted border-b border-border/40">
          <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-foreground">
            <Trash2 className="w-6 h-6 text-destructive" />
            Réinitialisation ciblée
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            Recherchez une cible et définissez précisément quelles données effacer.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Target Type Selection */}
          <RadioGroup 
            value={resetType} 
            onValueChange={setResetType}
            className="grid grid-cols-3 gap-3"
          >
            <div className={cn("flex flex-col items-center justify-center text-center gap-2 border p-3 rounded-xl cursor-pointer transition-all", resetType === 'user' ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20" : "border-border hover:bg-muted/50")}>
              <RadioGroupItem value="user" id="r-user" className="sr-only" />
              <Label htmlFor="r-user" className="cursor-pointer w-full font-semibold flex flex-col items-center gap-1 text-sm">
                <User className={cn("w-5 h-5", resetType === 'user' ? "text-primary" : "text-muted-foreground")} />
                Utilisateur
              </Label>
            </div>
            
            <div className={cn("flex flex-col items-center justify-center text-center gap-2 border p-3 rounded-xl cursor-pointer transition-all", resetType === 'organizer' ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20" : "border-border hover:bg-muted/50")}>
              <RadioGroupItem value="organizer" id="r-organizer" className="sr-only" />
              <Label htmlFor="r-organizer" className="cursor-pointer w-full font-semibold flex flex-col items-center gap-1 text-sm">
                <Building className={cn("w-5 h-5", resetType === 'organizer' ? "text-primary" : "text-muted-foreground")} />
                Organisateur
              </Label>
            </div>

            <div className={cn("flex flex-col items-center justify-center text-center gap-2 border p-3 rounded-xl cursor-pointer transition-all", resetType === 'all' ? "border-destructive bg-destructive/5 shadow-sm ring-1 ring-destructive/20" : "border-border hover:bg-muted/50")}>
              <RadioGroupItem value="all" id="r-all" className="sr-only" />
              <Label htmlFor="r-all" className="cursor-pointer w-full font-semibold flex flex-col items-center gap-1 text-sm text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Global (Tous)
              </Label>
            </div>
          </RadioGroup>

          {/* Search Input Custom */}
          {resetType !== 'all' && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300" ref={searchContainerRef}>
              <Label className="text-sm font-semibold">Rechercher une cible :</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder={`Rechercher par nom ou email...`}
                  className="pl-10 pr-10 h-12 rounded-xl border-muted-foreground/30 shadow-sm focus-visible:ring-primary focus-visible:border-primary transition-all text-gray-900 dark:text-gray-100"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setIsDropdownOpen(false);
                  }}
                />
                
                {isFetchingProfiles ? (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                ) : searchQuery ? (
                  <button 
                    onClick={clearSelection}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                    aria-label="Effacer la recherche"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : null}

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-xl shadow-xl z-50 overflow-hidden max-h-[300px] flex flex-col animate-in fade-in slide-in-from-top-2">
                    <div className="overflow-y-auto p-2 space-y-1">
                      {filteredList.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          Aucun résultat trouvé pour "{searchQuery}".
                        </div>
                      ) : (
                        filteredList.map((usr) => {
                          const isSelected = resetType === 'user' ? selectedUserId === usr.id : selectedOrganizerId === usr.id;
                          return (
                            <button
                              key={usr.id}
                              type="button"
                              onClick={() => handleSelectTarget(usr)}
                              className={cn(
                                "w-full text-left flex flex-col gap-1.5 p-3 rounded-lg cursor-pointer transition-all border outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                isSelected 
                                  ? "bg-primary/10 border-primary/20" 
                                  : "border-transparent hover:bg-muted/50 hover:border-border/50"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-sm text-foreground">
                                    {usr.full_name || 'Utilisateur sans nom'}
                                  </span>
                                  <span className="text-xs text-muted-foreground">{usr.email}</span>
                                </div>
                                {isSelected && <Check className="w-4 h-4 text-primary" />}
                              </div>
                              
                              {/* Mini Wallet Info in Dropdown */}
                              <div className="flex items-center gap-2 text-xs mt-1">
                                <span className="flex items-center gap-1 font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-800">
                                  <Coins className="w-3 h-3"/> {formatCurrencySimple(usr.coin_balance)}
                                </span>
                                <span className="flex items-center gap-1 font-medium text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 px-1.5 py-0.5 rounded border border-green-100 dark:border-green-800">
                                  <Gift className="w-3 h-3"/> {formatCurrencySimple(usr.free_coin_balance)}
                                </span>
                                <span className="flex items-center gap-1 font-medium text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400 px-1.5 py-0.5 rounded border border-purple-100 dark:border-purple-800">
                                  <DollarSign className="w-3 h-3"/> {formatCurrencySimple(usr.available_earnings)}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Detailed Wallet Panel */}
          {resetType !== 'all' && (
            <div className="min-h-[160px] relative transition-all duration-300">
              {isLoadingDetails ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm rounded-2xl z-10">
                   <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                   <span className="text-sm text-muted-foreground font-medium">Chargement du portefeuille...</span>
                </div>
              ) : null}

              {detailedWallet ? (
                <div className="p-5 bg-gradient-to-br from-background to-muted/30 rounded-2xl border border-border/80 shadow-sm space-y-5 animate-in zoom-in-95 duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <Avatar className="h-14 w-14 border-2 border-primary/20 shadow-sm">
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                            {detailedWallet.full_name?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                       </Avatar>
                       <div className="flex flex-col">
                          <h4 className="font-bold text-lg leading-tight text-foreground">{detailedWallet.full_name || 'Sans nom'}</h4>
                          <p className="text-sm text-muted-foreground">{detailedWallet.email}</p>
                       </div>
                    </div>
                    <Badge variant="outline" className="bg-background">
                      Cible sélectionnée
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                     {/* Card Paid Coins */}
                     <div className="p-4 bg-blue-50/60 dark:bg-blue-900/10 border border-blue-200/60 dark:border-blue-800/60 rounded-xl flex flex-col gap-1.5 hover:shadow-md hover:border-blue-300 transition-all group">
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                           <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-md group-hover:scale-110 transition-transform"><Coins className="w-4 h-4" /></div>
                           <span className="font-semibold text-xs uppercase tracking-wide">Pièces Payantes</span>
                        </div>
                        <span className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">{formatCurrencySimple(detailedWallet.coin_balance)}</span>
                     </div>
                     {/* Card Free Coins */}
                     <div className="p-4 bg-green-50/60 dark:bg-green-900/10 border border-green-200/60 dark:border-green-800/60 rounded-xl flex flex-col gap-1.5 hover:shadow-md hover:border-green-300 transition-all group">
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                           <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-md group-hover:scale-110 transition-transform"><Gift className="w-4 h-4" /></div>
                           <span className="font-semibold text-xs uppercase tracking-wide">Pièces Gratuites</span>
                        </div>
                        <span className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">{formatCurrencySimple(detailedWallet.free_coin_balance)}</span>
                     </div>
                     {/* Card Earnings */}
                     <div className="p-4 bg-purple-50/60 dark:bg-purple-900/10 border border-purple-200/60 dark:border-purple-800/60 rounded-xl flex flex-col gap-1.5 hover:shadow-md hover:border-purple-300 transition-all group">
                        <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                           <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-md group-hover:scale-110 transition-transform"><DollarSign className="w-4 h-4" /></div>
                           <span className="font-semibold text-xs uppercase tracking-wide">Revenus</span>
                        </div>
                        <span className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-1">{formatCurrencySimple(detailedWallet.available_earnings)}</span>
                     </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 border border-dashed rounded-2xl bg-muted/10 text-muted-foreground transition-all">
                   <Search className="w-10 h-10 mb-3 opacity-20" />
                   <p className="font-medium">Aucun portefeuille sélectionné</p>
                   <p className="text-xs mt-1 text-center max-w-[250px]">Utilisez la barre de recherche ci-dessus pour trouver une cible.</p>
                </div>
              )}
            </div>
          )}

          {/* Warning for "All" */}
          {resetType === 'all' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Alert variant="destructive" className="bg-destructive/10 border-destructive/30 shadow-inner">
                  <AlertTriangle className="h-5 w-5" />
                  <AlertTitle className="text-lg">Danger Critique</AlertTitle>
                  <AlertDescription className="mt-2 text-sm leading-relaxed font-medium">
                      Cette action est <strong>IRRÉVERSIBLE</strong> et affectera <strong>TOUS</strong> les utilisateurs et organisateurs de la plateforme selon les cases cochées ci-dessous.
                  </AlertDescription>
              </Alert>
              <div className="grid grid-cols-2 gap-4 mt-5">
                <div className="p-4 bg-background rounded-xl border border-border shadow-sm text-center">
                  <p className="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wider">Total Soldes Utilisateurs</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrencySimple(totalUserBalance)} π</p>
                </div>
                <div className="p-4 bg-background rounded-xl border border-border shadow-sm text-center">
                  <p className="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wider">Total Gains Organisateurs</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrencySimple(totalOrganizerEarnings)} π</p>
                </div>
              </div>
            </div>
          )}

          {/* Reset Toggles */}
          <div className="space-y-3 pt-2">
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wide">Éléments à réinitialiser :</h4>
            <div className="grid gap-3 sm:grid-cols-1">
               <label className={cn("flex items-start gap-4 p-4 border rounded-xl cursor-pointer transition-all", resetOptions.paid ? "bg-blue-50/40 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800" : "hover:bg-muted/30")}>
                  <Checkbox checked={resetOptions.paid} onCheckedChange={c => setResetOptions(p => ({...p, paid: c}))} className="mt-1 border-blue-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" />
                  <div className="flex flex-col">
                     <span className="font-bold text-sm flex items-center gap-2">
                       <Coins className="w-4 h-4 text-blue-500" /> Pièces Payantes
                     </span>
                     <span className="text-xs text-muted-foreground mt-1 leading-snug">Remet le solde des pièces achetées (coin_balance) à <strong>0</strong>.</span>
                  </div>
               </label>

               <label className={cn("flex items-start gap-4 p-4 border rounded-xl cursor-pointer transition-all", resetOptions.free ? "bg-green-50/40 border-green-200 dark:bg-green-900/10 dark:border-green-800" : "hover:bg-muted/30")}>
                  <Checkbox checked={resetOptions.free} onCheckedChange={c => setResetOptions(p => ({...p, free: c}))} className="mt-1 border-green-500 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600" />
                  <div className="flex flex-col">
                     <span className="font-bold text-sm flex items-center gap-2">
                       <Gift className="w-4 h-4 text-green-500" /> Pièces Gratuites
                     </span>
                     <span className="text-xs text-muted-foreground mt-1 leading-snug">Remet le solde des pièces offertes (free_coin_balance) à la valeur par défaut <strong>(10)</strong>.</span>
                  </div>
               </label>

               <label className={cn("flex items-start gap-4 p-4 border rounded-xl cursor-pointer transition-all", resetOptions.earnings ? "bg-purple-50/40 border-purple-200 dark:bg-purple-900/10 dark:border-purple-800" : "hover:bg-muted/30")}>
                  <Checkbox checked={resetOptions.earnings} onCheckedChange={c => setResetOptions(p => ({...p, earnings: c}))} className="mt-1 border-purple-500 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600" />
                  <div className="flex flex-col">
                     <span className="font-bold text-sm flex items-center gap-2">
                       <DollarSign className="w-4 h-4 text-purple-500" /> Revenus (Gains)
                     </span>
                     <span className="text-xs text-muted-foreground mt-1 leading-snug">Remet les gains disponibles et l'historique complet des revenus à <strong>0</strong>.</span>
                  </div>
               </label>
            </div>
          </div>

        </div>

        <DialogFooter className="p-4 px-6 bg-muted/40 border-t border-border/50 flex flex-row justify-end gap-3 sm:gap-3">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={isLoading}
            className="w-full sm:w-auto h-11 font-medium bg-background"
          >
            Annuler
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleReset}
            disabled={isLoading || isFetchingProfiles || (resetType !== 'all' && !detailedWallet) || (!resetOptions.paid && !resetOptions.free && !resetOptions.earnings)}
            className="w-full sm:w-auto h-11 font-bold shadow-md hover:shadow-xl transition-all"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            {isLoading ? 'Traitement...' : 'Appliquer Réinitialisation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Composant principal ZoneResetManager
const ZoneResetManager = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  
  // Dialog State pour les zones
  const [targetZone, setTargetZone] = useState(null);
  const [resetOptions, setResetOptions] = useState({
    credits: false,
    revenue: false
  });

  const fetchZoneStats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_zones_stats');
      if (error) throw error;
      setZones(data || []);
    } catch (error) {
      console.error("Error fetching zone stats:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les statistiques des zones.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZoneStats();
  }, []);

  const openResetDialog = (zone = null) => {
    setTargetZone(zone);
    setResetOptions({ credits: false, revenue: false });
    setDialogOpen(true);
  };

  const handleZoneResetConfirm = async () => {
    if (!resetOptions.credits && !resetOptions.revenue) {
      toast({
        title: "Sélection requise",
        description: "Veuillez choisir au moins une donnée à réinitialiser.",
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);
    setDialogOpen(false);

    try {
      let result;
      
      if (targetZone) {
        const { data, error } = await supabase.rpc('reset_zone_data', {
          p_admin_id: user.id,
          p_country: targetZone.country,
          p_reset_credits: resetOptions.credits,
          p_reset_revenue: resetOptions.revenue
        });

        if (error) throw error;
        result = data;
        
        toast({
          title: "✅ Réinitialisation réussie",
          description: `Les données ont été réinitialisées pour ${targetZone.country}.`,
          variant: "success"
        });

        window.dispatchEvent(new CustomEvent('zone-reset-completed', {
          detail: {
            country: targetZone.country,
            resetCredits: resetOptions.credits,
            resetRevenue: resetOptions.revenue,
            timestamp: new Date().toISOString()
          }
        }));

      } else {
        const { data, error } = await supabase.rpc('reset_all_zones', {
          p_admin_id: user.id,
          p_reset_credits: resetOptions.credits,
          p_reset_revenue: resetOptions.revenue
        });

        if (error) throw error;
        result = data;

        toast({
          title: "✅ Réinitialisation globale terminée",
          description: `${result.success_count || 0} zone(s) sur ${result.total_zones || 0} ont été réinitialisées.`,
          variant: "success"
        });

        window.dispatchEvent(new CustomEvent('zone-reset-completed', {
          detail: {
            country: 'ALL',
            resetCredits: resetOptions.credits,
            resetRevenue: resetOptions.revenue,
            stats: result,
            timestamp: new Date().toISOString()
          }
        }));
      }

      await fetchZoneStats();

    } catch (error) {
      console.error("Reset error:", error);
      toast({
        title: "❌ Erreur critique",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* En-tête de la section */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Réinitialisation des Données</h2>
        <p className="text-muted-foreground">
          Outils avancés pour la gestion de base de données.
        </p>
      </div>

      {/* Alerte de zone dangereuse */}
      <Alert variant="destructive" className="border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle className="font-bold">Zone Dangereuse</AlertTitle>
        <AlertDescription className="mt-2 text-sm">
          Les actions effectuées ici sont irréversibles. Elles modifieront de façon permanente les soldes financiers des utilisateurs par zone géographique. Une confirmation stricte sera demandée.
        </AlertDescription>
      </Alert>

      {/* Cartes d'outils */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Carte de réinitialisation par zone */}
        <Card className="border-destructive/30 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-destructive" />
              <CardTitle>Réinitialisation par Zone</CardTitle>
            </div>
            <CardDescription>
              Remettre à zéro les pièces et revenus pour une zone géographique spécifique.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full gap-2 border-destructive/50 hover:bg-destructive/10"
              onClick={() => openResetDialog(null)}
              disabled={loading || processing || zones.length === 0}
            >
              <Eraser className="w-4 h-4" />
              Gérer les zones
            </Button>
          </CardContent>
        </Card>

        {/* Carte de réinitialisation individuelle */}
        <Card className="border-destructive/30 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-destructive" />
              <CardTitle>Réinitialisation Individuelle</CardTitle>
            </div>
            <CardDescription>
              Réinitialiser les soldes d'un utilisateur ou les gains d'un organisateur spécifique.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="destructive" 
              className="w-full gap-2 font-bold"
              onClick={() => setResetModalOpen(true)}
            >
              <Trash2 className="w-4 h-4" />
              Ouvrir l'outil individuel
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Tableau des zones */}
      <Card className="border-orange-500/20 shadow-lg">
        <CardHeader className="bg-orange-500/5 rounded-t-xl">
          <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl text-orange-700 dark:text-orange-400">
                <RotateCcw className="h-6 w-6" />
                Statistiques par Zone
              </CardTitle>
              <CardDescription>
                Aperçu des données financières par pays.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchZoneStats} disabled={loading || processing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => openResetDialog(null)} 
                disabled={loading || processing || zones.length === 0}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Eraser className="h-4 w-4 mr-2" />
                Tout Réinitialiser
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-bold">Pays / Zone</TableHead>
                  <TableHead className="text-center">Utilisateurs</TableHead>
                  <TableHead className="text-right">Pièces Distribuées</TableHead>
                  <TableHead className="text-right">Revenus (Achats)</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p>Chargement des données...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : zones.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      Aucune donnée de zone trouvée.
                    </TableCell>
                  </TableRow>
                ) : (
                  zones.map((zone) => (
                    <TableRow key={zone.country} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary/70" />
                          {zone.country}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {zone.user_count?.toLocaleString() || 0}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="font-mono bg-blue-50 text-blue-700 border-blue-200">
                          <Coins className="h-3 w-3 mr-1" />
                          {zone.total_credits?.toLocaleString() || 0} pièces
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="font-mono bg-green-50 text-green-700 border-green-200">
                          <DollarSign className="h-3 w-3 mr-1" />
                          {formatCurrency(zone.total_revenue || 0)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                          onClick={() => openResetDialog(zone)}
                          disabled={processing}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Réinitialiser
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de confirmation pour les zones */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent className="sm:max-w-[500px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmation de Réinitialisation
            </AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de réinitialiser les données pour : 
              <span className="font-bold text-foreground block mt-1 text-lg">
                {targetZone ? targetZone.country : "TOUTES LES ZONES"}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4 space-y-4 border-y border-border/50">
            <p className="text-sm font-medium mb-3">Sélectionnez les données à supprimer :</p>
            
            <div 
              className="flex items-start space-x-3 p-3 rounded-md hover:bg-muted/50 border border-transparent hover:border-border transition-all cursor-pointer" 
              onClick={() => setResetOptions(p => ({...p, credits: !p.credits}))}
            >
              <Checkbox 
                id="reset-credits" 
                checked={resetOptions.credits} 
                onCheckedChange={(c) => setResetOptions(p => ({...p, credits: c}))} 
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="reset-credits" className="font-semibold cursor-pointer">
                  Pièces Distribuées (Coins)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Supprime l'historique des pièces créditées manuellement par les administrateurs.
                </p>
              </div>
            </div>

            <div 
              className="flex items-start space-x-3 p-3 rounded-md hover:bg-muted/50 border border-transparent hover:border-border transition-all cursor-pointer" 
              onClick={() => setResetOptions(p => ({...p, revenue: !p.revenue}))}
            >
              <Checkbox 
                id="reset-revenue" 
                checked={resetOptions.revenue} 
                onCheckedChange={(c) => setResetOptions(p => ({...p, revenue: c}))} 
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="reset-revenue" className="font-semibold cursor-pointer">
                  Revenus (Achats FCFA)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Supprime l'historique des achats de packs et licences effectués par les utilisateurs.
                </p>
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleZoneResetConfirm}
              className="bg-destructive hover:bg-destructive/90"
              disabled={(!resetOptions.credits && !resetOptions.revenue) || processing}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              {processing ? 'Traitement...' : 'Confirmer la Suppression'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de réinitialisation individuelle */}
      <ResetDataModal 
        open={resetModalOpen}
        onOpenChange={setResetModalOpen}
        onSuccess={() => {
          fetchZoneStats();
        }}
      />

      {/* Note d'information */}
      <Card className="bg-blue-50/50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-800">Comment ça fonctionne ?</h4>
              <p className="text-sm text-blue-700">
                Les réinitialisations effectuées ici sont automatiquement répercutées sur le tableau de bord principal 
                (AnalyticsDashboard) grâce à un système d'événements. Les statistiques seront mises à jour en temps réel 
                sans nécessiter de rechargement manuel de la page.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ZoneResetManager;