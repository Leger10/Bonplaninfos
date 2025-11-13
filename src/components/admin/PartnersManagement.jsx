import React, { useState, useEffect, useCallback, useMemo } from 'react';
    import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { Label } from '@/components/ui/label';
    import { supabase } from '@/lib/customSupabaseClient';
    import { toast } from '@/components/ui/use-toast';
    import { Globe, Mail, Phone, Edit, Eye, UserPlus, Loader2, Wallet, Calendar, CheckCircle, History, Upload, FileText, Info, Search, Download, ShieldCheck } from 'lucide-react';
    import { COUNTRIES, CITIES_BY_COUNTRY } from '@/constants/countries';
    import { useAuth } from '@/contexts/SupabaseAuthContext';

    const CreatePartnerForm = ({ users, licenseTypes, onCancel, onRefresh, partnerToEdit }) => {
      const { user } = useAuth();
      const [formData, setFormData] = useState({
        partner_id: '',
        license_id: '',
        country: '',
        cities: [],
      });
      const [loading, setLoading] = useState(false);
      const [availableCities, setAvailableCities] = useState([]);
      const [userSearch, setUserSearch] = useState('');

      useEffect(() => {
        if (partnerToEdit) {
          setFormData({
            partner_id: partnerToEdit.user_id,
            license_id: partnerToEdit.license_id,
            country: partnerToEdit.coverage_zone?.country || '',
            cities: partnerToEdit.coverage_zone?.cities || [],
          });
        }
      }, [partnerToEdit]);

      const filteredUsers = useMemo(() => {
        if (!userSearch) return users.filter(u => u.user_type !== 'admin' && u.user_type !== 'super_admin');
        const searchLower = userSearch.toLowerCase();
        return users.filter(u =>
          (u.user_type !== 'admin' && u.user_type !== 'super_admin') &&
          ((u.full_name && u.full_name.toLowerCase().includes(searchLower)) ||
           (u.email && u.email.toLowerCase().includes(searchLower)))
        );
      }, [users, userSearch]);

      useEffect(() => {
        if (formData.country) {
          setAvailableCities(CITIES_BY_COUNTRY[formData.country] || []);
        } else {
          setAvailableCities([]);
        }
      }, [formData.country]);

      const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.partner_id || !formData.country || !formData.license_id) {
          toast({ title: 'Champs manquants', description: 'Veuillez sélectionner un utilisateur, un pays et un type de licence.', variant: 'destructive' });
          return;
        }
        setLoading(true);
        try {
          const coverage_zone = { country: formData.country, cities: formData.cities };
          
          if (partnerToEdit) {
            const { error } = await supabase
              .from('partners')
              .update({
                license_id: formData.license_id,
                coverage_zone: coverage_zone,
                updated_at: new Date()
              })
              .eq('id', partnerToEdit.id);
            if (error) throw error;
            toast({ title: 'Partenaire mis à jour avec succès' });
          } else {
            const { error } = await supabase
              .from('partners')
              .insert({
                user_id: formData.partner_id,
                license_id: formData.license_id,
                coverage_zone: coverage_zone,
                status: 'pending' // En attente d'approbation
              });
            if (error) throw error;
            
            await supabase.from('profiles').update({ user_type: 'admin' }).eq('id', formData.partner_id);

            toast({ title: 'Partenaire créé', description: "Le nouveau partenaire est en attente d'approbation." });
          }
          onRefresh();
          onCancel();
        } catch (error) {
          console.error('Error saving partner:', error);
          toast({ title: 'Erreur lors de l\'enregistrement', description: error.message, variant: 'destructive' });
        } finally {
          setLoading(false);
        }
      };

      return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-xl bg-card text-foreground shadow-lg rounded-xl">
            <CardHeader><CardTitle>{partnerToEdit ? 'Modifier le partenaire' : 'Créer un nouveau partenaire'}</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto p-2">
                {!partnerToEdit && (
                  <div className="space-y-2">
                    <Label>Rechercher un utilisateur</Label>
                    <Input placeholder="Rechercher par nom ou email..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
                    <Select onValueChange={(v) => setFormData({...formData, partner_id: v})} value={formData.partner_id}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner un utilisateur" /></SelectTrigger>
                      <SelectContent>
                        {filteredUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name} ({u.email})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Type de licence</Label>
                  <Select onValueChange={(v) => setFormData({...formData, license_id: v})} value={formData.license_id}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner un type de licence" /></SelectTrigger>
                    <SelectContent>
                      {licenseTypes.map(lt => <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Pays</Label>
                  <Select onValueChange={(v) => setFormData({...formData, country: v, cities: []})} value={formData.country}>
                    <SelectTrigger><SelectValue placeholder="Pays de la licence" /></SelectTrigger>
                    <SelectContent>{COUNTRIES.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Villes couvertes</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-2 border rounded-md max-h-40 overflow-y-auto">
                    {availableCities.map(city => (
                      <div key={city} className="flex items-center gap-2">
                        <input type="checkbox" id={`city-${city}`} value={city} checked={formData.cities.includes(city)} onChange={(e) => {
                          const newCities = e.target.checked ? [...formData.cities, city] : formData.cities.filter(c => c !== city);
                          setFormData({...formData, cities: newCities});
                        }} />
                        <Label htmlFor={`city-${city}`}>{city}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={loading}>{loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enregistrement...</> : 'Enregistrer'}</Button>
                  <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      );
    };


    const PartnersManagement = ({ onRefresh }) => {
      const [partners, setPartners] = useState([]);
      const [users, setUsers] = useState([]);
      const [licenseTypes, setLicenseTypes] = useState([]);
      const [showCreateForm, setShowCreateForm] = useState(false);
      const [editingPartner, setEditingPartner] = useState(null);
      const [searchTerm, setSearchTerm] = useState('');
      const [loading, setLoading] = useState(true);

      const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: partnersData, error: partnersError } = await supabase
                .from('partners')
                .select('*, user:user_id(full_name, email), license:license_id(name, commission_rate)');
            if (partnersError) throw partnersError;

            const { data: usersData, error: usersError } = await supabase.from('profiles').select('*');
            if (usersError) throw usersError;

            const { data: licensesData, error: licensesError } = await supabase.from('partner_licenses').select('*');
            if (licensesError) throw licensesError;

            setPartners(partnersData || []);
            setUsers(usersData || []);
            setLicenseTypes(licensesData || []);
        } catch (error) {
            toast({ title: 'Erreur', description: 'Impossible de charger les données des partenaires.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
      }, []);

      useEffect(() => {
        fetchData();
      }, [fetchData]);

      const filteredPartners = useMemo(() => {
        if (!searchTerm) return partners;
        const lowerSearch = searchTerm.toLowerCase();
        return partners.filter(p =>
          p.user?.full_name?.toLowerCase().includes(lowerSearch) ||
          p.user?.email?.toLowerCase().includes(lowerSearch) ||
          p.license?.name?.toLowerCase().includes(lowerSearch)
        );
      }, [partners, searchTerm]);
      
      const handleUpdateStatus = async (partnerId, status) => {
        try {
          let updateObject = { status, updated_at: new Date() };
          if (status === 'active') {
            const expiration_date = new Date();
            const { data: license } = await supabase.from('partners').select('license:license_id(duration_days)').eq('id', partnerId).single();
            const duration = license?.license?.duration_days || 30;
            expiration_date.setDate(expiration_date.getDate() + duration);
            updateObject.expiration_date = expiration_date.toISOString();
            updateObject.activation_date = new Date().toISOString();
          }

          const { error } = await supabase.from('partners').update(updateObject).eq('id', partnerId);
          if (error) throw error;
          toast({ title: 'Statut mis à jour' });
          fetchData();
        } catch (error) {
           toast({ title: 'Erreur', description: 'Impossible de mettre à jour le statut.', variant: 'destructive' });
        }
      };
      
      const getStatusForPartner = (partner) => {
        const now = new Date();
        const expirationDate = partner.expiration_date ? new Date(partner.expiration_date) : null;
        if (expirationDate && expirationDate < now) return 'expired';
        return partner.status;
      }

      if (loading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>;
      }

      return (
        <>
          <Card className="glass-effect shadow-lg rounded-xl border-primary/20">
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <CardTitle className="text-white">🌍 Gestion des Partenaires</CardTitle>
              <Button onClick={() => setShowCreateForm(true)}><UserPlus className="mr-2 h-4 w-4" /> Créer un partenaire</Button>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Rechercher un partenaire..."
                    className="pl-10 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-400 uppercase bg-background/50">
                    <tr>
                      <th scope="col" className="px-6 py-3">Partenaire</th>
                      <th scope="col" className="px-6 py-3">Licence</th>
                      <th scope="col" className="px-6 py-3">Contact</th>
                      <th scope="col" className="px-6 py-3">Validité</th>
                      <th scope="col" className="px-6 py-3">Statut</th>
                      <th scope="col" className="px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPartners.map((partner) => {
                      const currentStatus = getStatusForPartner(partner);
                      return (
                        <tr key={partner.id} className="border-b border-gray-700 hover:bg-gray-800/50">
                          <td className="px-6 py-4">
                            <p className="font-semibold text-white">{partner.user?.full_name || 'N/A'}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-white capitalize">{partner.license?.name}</p>
                            <p className="text-sm text-gray-400">{partner.coverage_zone.country}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /><span>{partner.user?.email}</span></div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-white">{partner.expiration_date ? `Expire le: ${new Date(partner.expiration_date).toLocaleDateString()}` : 'N/A'}</p>
                          </td>
                          <td className="px-6 py-4">
                            <select
                              className={`bg-gray-800 text-sm p-1 rounded-md border border-gray-700`}
                              value={currentStatus || 'pending'}
                              onChange={(e) => handleUpdateStatus(partner.id, e.target.value)}
                            >
                              <option value="pending">En attente d'approbation</option>
                              <option value="active">Actif</option>
                              <option value="suspended">Suspendu</option>
                              <option value="expired">Expiré</option>
                            </select>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                               <Button size="sm" variant="outline" onClick={() => { setEditingPartner(partner); setShowCreateForm(true); }} title="Modifier"><Edit className="w-4 h-4" /></Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          {(showCreateForm || editingPartner) && <CreatePartnerForm users={users} licenseTypes={licenseTypes} partnerToEdit={editingPartner} onCancel={() => {setShowCreateForm(false); setEditingPartner(null);}} onRefresh={fetchData} />}
        </>
      );
    };

    export default PartnersManagement;