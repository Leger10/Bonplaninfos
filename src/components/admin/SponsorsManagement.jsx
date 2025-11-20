import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  PlusCircle, 
  Edit, 
  Trash2, 
  Loader2, 
  Upload, 
  ExternalLink,
  Eye,
  EyeOff,
  TrendingUp,
  Crown
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';

const SponsorsManagement = () => {
    const { user } = useAuth();
    const [sponsors, setSponsors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingSponsor, setEditingSponsor] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        website_url: '',
        category: 'general',
        display_order: 0,
        is_active: true,
        show_in_footer: true,
        level: 'bronze'
    });
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState('');

    const categories = [
        { value: 'general', label: '🌐 Général' },
        { value: 'technology', label: '💻 Technologie' },
        { value: 'entertainment', label: '🎭 Divertissement' },
        { value: 'education', label: '📚 Éducation' },
        { value: 'business', label: '💼 Business' },
        { value: 'lifestyle', label: '🌟 Lifestyle' }
    ];

    const levels = [
        { value: 'bronze', label: '🥉 Bronze' },
        { value: 'silver', label: '🥈 Argent' },
        { value: 'gold', label: '🥇 Or' }
    ];

    const fetchSponsors = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('sponsors')
                .select('*')
                .order('display_order', { ascending: true })
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSponsors(data || []);
        } catch (error) {
            toast({ 
                title: 'Erreur', 
                description: 'Impossible de charger les sponsors.', 
                variant: 'destructive' 
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSponsors();
    }, [fetchSponsors]);

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            website_url: '',
            category: 'general',
            display_order: 0,
            is_active: true,
            show_in_footer: true,
            level: 'bronze'
        });
        setLogoFile(null);
        setLogoPreview('');
        setEditingSponsor(null);
    };

    const handleOpenDialog = (sponsor = null) => {
        if (sponsor) {
            setEditingSponsor(sponsor);
            setFormData({
                name: sponsor.name,
                description: sponsor.description || '',
                website_url: sponsor.website_url || '',
                category: sponsor.category || 'general',
                display_order: sponsor.display_order || 0,
                is_active: sponsor.is_active ?? true,
                show_in_footer: sponsor.show_in_footer ?? true,
                level: sponsor.level || 'bronze'
            });
            setLogoPreview(sponsor.logo_url || '');
        } else {
            resetForm();
        }
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        resetForm();
        setIsDialogOpen(false);
    };

    const handleLogoChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const uploadLogo = async () => {
        if (!logoFile) return logoPreview;

        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `media/sponsors/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('media')
            .upload(filePath, logoFile);

        if (uploadError) {
            throw new Error(`Erreur d'upload du logo: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);
        return publicUrl;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            let finalLogoUrl = logoPreview;
            if (logoFile) {
                finalLogoUrl = await uploadLogo();
            }

            if (!finalLogoUrl) {
                throw new Error("Le logo est requis.");
            }

            const sponsorData = {
                ...formData,
                logo_url: finalLogoUrl,
                updated_at: new Date().toISOString(),
            };

            let error;
            if (editingSponsor) {
                ({ error } = await supabase
                    .from('sponsors')
                    .update(sponsorData)
                    .eq('id', editingSponsor.id));
            } else {
                ({ error } = await supabase
                    .from('sponsors')
                    .insert({ 
                        ...sponsorData, 
                        created_by: user.id 
                    }));
            }

            if (error) throw error;

            toast({ 
                title: '✅ Succès', 
                description: `Sponsor ${editingSponsor ? 'modifié' : 'ajouté'} avec succès.` 
            });
            handleCloseDialog();
            fetchSponsors();
        } catch (error) {
            toast({ 
                title: '❌ Erreur', 
                description: error.message, 
                variant: 'destructive' 
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (sponsorId) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce sponsor ?')) return;
        
        try {
            const { error } = await supabase
                .from('sponsors')
                .delete()
                .eq('id', sponsorId);
            
            if (error) throw error;
            toast({ 
                title: '✅ Succès', 
                description: 'Sponsor supprimé avec succès.' 
            });
            fetchSponsors();
        } catch (error) {
            toast({ 
                title: '❌ Erreur', 
                description: 'Impossible de supprimer le sponsor.', 
                variant: 'destructive' 
            });
        }
    };

    const toggleSponsorStatus = async (sponsorId, currentStatus) => {
        try {
            const { error } = await supabase
                .from('sponsors')
                .update({ is_active: !currentStatus })
                .eq('id', sponsorId);

            if (error) throw error;

            toast({
                title: '✅ Succès',
                description: `Sponsor ${!currentStatus ? 'activé' : 'désactivé'}`
            });
            fetchSponsors();
        } catch (error) {
            toast({
                title: '❌ Erreur',
                description: 'Impossible de modifier le statut',
                variant: 'destructive'
            });
        }
    };

    const toggleFooterVisibility = async (sponsorId, currentVisibility) => {
        try {
            const { error } = await supabase
                .from('sponsors')
                .update({ show_in_footer: !currentVisibility })
                .eq('id', sponsorId);

            if (error) throw error;

            toast({
                title: '✅ Succès',
                description: `Sponsor ${!currentVisibility ? 'affiché' : 'masqué'} dans le footer`
            });
            fetchSponsors();
        } catch (error) {
            toast({
                title: '❌ Erreur',
                description: 'Impossible de modifier la visibilité',
                variant: 'destructive'
            });
        }
    };

    const getCategoryBadge = (category) => {
        const categoryConfig = {
            general: { label: '🌐 Général', variant: 'default' },
            technology: { label: '💻 Techno', variant: 'secondary' },
            entertainment: { label: '🎭 Divertissement', variant: 'destructive' },
            education: { label: '📚 Éducation', variant: 'outline' },
            business: { label: '💼 Business', variant: 'default' },
            lifestyle: { label: '🌟 Lifestyle', variant: 'secondary' }
        };
        
        const config = categoryConfig[category] || categoryConfig.general;
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };
    
    const getLevelBadge = (level) => {
        const levelConfig = {
            gold: { label: '🥇 Or', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
            silver: { label: '🥈 Argent', className: 'bg-gray-200 text-gray-800 border-gray-400' },
            bronze: { label: '🥉 Bronze', className: 'bg-orange-100 text-orange-800 border-orange-300' }
        };
        
        const config = levelConfig[level] || levelConfig.bronze;
        return <Badge className={config.className}>{config.label}</Badge>;
    };

    return (
        <Card className="glass-effect shadow-lg rounded-xl border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Crown className="w-6 h-6" />
                        Gestion des Sponsors
                    </CardTitle>
                    <p className="text-gray-400 text-sm mt-1">
                        {sponsors.filter(s => s.is_active).length} sponsor(s) actif(s) • 
                        {sponsors.filter(s => s.show_in_footer).length} dans le footer
                    </p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => handleOpenDialog()}>
                            <PlusCircle className="mr-2 h-4 w-4" /> 
                            Nouveau Sponsor
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Crown className="w-5 h-5" />
                                {editingSponsor ? 'Modifier le Sponsor' : 'Ajouter un Sponsor'}
                            </DialogTitle>
                        </DialogHeader>
                        
                        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                            {/* Logo Upload */}
                            <div className="flex items-center gap-4">
                                {logoPreview && (
                                    <div className="relative">
                                        <img 
                                            src={logoPreview} 
                                            alt="Aperçu du logo" 
                                            className="w-20 h-20 object-contain rounded-lg border-2 border-dashed border-gray-300" 
                                        />
                                    </div>
                                )}
                                <label htmlFor="logo-upload" className="flex-1 cursor-pointer">
                                    <div className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary transition-colors">
                                        <Upload className="h-8 w-8 text-gray-400" />
                                        <span className="text-sm text-gray-500 text-center">
                                            {logoFile ? logoFile.name : 'Cliquez pour choisir un logo'}
                                        </span>
                                        <span className="text-xs text-gray-400">PNG, JPG, SVG (max 2MB)</span>
                                    </div>
                                    <Input 
                                        id="logo-upload" 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={handleLogoChange} 
                                        className="hidden" 
                                    />
                                </label>
                            </div>

                            {/* Informations de base */}
                            <div className="grid grid-cols-1 gap-4">
                                <Input 
                                    placeholder="Nom du sponsor *" 
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    required 
                                />
                                
                                <Textarea 
                                    placeholder="Description du sponsor..." 
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    rows={3}
                                />
                                
                                <Input 
                                    placeholder="URL du site web" 
                                    type="url"
                                    value={formData.website_url}
                                    onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
                                />
                            </div>

                            {/* Catégorie, Ordre et Niveau */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Catégorie</Label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                        className="w-full p-2 border border-gray-300 rounded-md bg-background"
                                    >
                                        {categories.map(cat => (
                                            <option key={cat.value} value={cat.value}>
                                                {cat.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label>Niveau</Label>
                                    <select
                                        value={formData.level}
                                        onChange={(e) => setFormData(prev => ({ ...prev, level: e.target.value }))}
                                        className="w-full p-2 border border-gray-300 rounded-md bg-background"
                                    >
                                        {levels.map(lvl => (
                                            <option key={lvl.value} value={lvl.value}>
                                                {lvl.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Ordre</Label>
                                    <Input 
                                        type="number" 
                                        min="0"
                                        value={formData.display_order}
                                        onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                                    />
                                </div>
                            </div>

                            {/* Options */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="is_active" className="cursor-pointer">
                                        Sponsor actif
                                    </Label>
                                    <Switch
                                        id="is_active"
                                        checked={formData.is_active}
                                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                                    />
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="show_in_footer" className="cursor-pointer">
                                        Afficher dans le footer
                                    </Label>
                                    <Switch
                                        id="show_in_footer"
                                        checked={formData.show_in_footer}
                                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_in_footer: checked }))}
                                    />
                                </div>
                            </div>

                            <DialogFooter className="gap-2">
                                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                                    Annuler
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {editingSponsor ? 'Enregistrer' : 'Créer le Sponsor'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            
            <CardContent>
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Logo</TableHead>
                                    <TableHead>Sponsor</TableHead>
                                    <TableHead>Catégorie</TableHead>
                                    <TableHead>Niveau</TableHead>
                                    <TableHead>Ordre</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead>Footer</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sponsors.map((sponsor) => (
                                    <TableRow key={sponsor.id} className="hover:bg-muted/50">
                                        <TableCell>
                                            <img 
                                                src={sponsor.logo_url} 
                                                alt={sponsor.name} 
                                                className="w-12 h-12 object-contain rounded-lg bg-white p-1" 
                                            />
                                        </TableCell>
                                        
                                        <TableCell>
                                            <div className="space-y-1">
                                                <div className="font-semibold">{sponsor.name}</div>
                                                {sponsor.website_url && (
                                                    <a 
                                                        href={sponsor.website_url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                        Site web
                                                    </a>
                                                )}
                                            </div>
                                        </TableCell>
                                        
                                        <TableCell>
                                            {getCategoryBadge(sponsor.category)}
                                        </TableCell>
                                        
                                        <TableCell>
                                            {getLevelBadge(sponsor.level)}
                                        </TableCell>

                                        <TableCell>
                                            <Badge variant="outline">
                                                {sponsor.display_order}
                                            </Badge>
                                        </TableCell>
                                        
                                        <TableCell>
                                            <Button
                                                size="sm"
                                                variant={sponsor.is_active ? "default" : "outline"}
                                                onClick={() => toggleSponsorStatus(sponsor.id, sponsor.is_active)}
                                                className="w-20"
                                            >
                                                {sponsor.is_active ? (
                                                    <><Eye className="w-3 h-3 mr-1" /> Actif</>
                                                ) : (
                                                    <><EyeOff className="w-3 h-3 mr-1" /> Inactif</>
                                                )}
                                            </Button>
                                        </TableCell>
                                        
                                        <TableCell>
                                            <Switch
                                                checked={sponsor.show_in_footer}
                                                onCheckedChange={() => toggleFooterVisibility(sponsor.id, sponsor.show_in_footer)}
                                            />
                                        </TableCell>
                                        
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => handleOpenDialog(sponsor)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="text-destructive hover:text-destructive" 
                                                    onClick={() => handleDelete(sponsor.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        
                        {sponsors.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground">
                                <Crown className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                <p className="text-lg">Aucun sponsor créé</p>
                                <p className="text-sm">Commencez par ajouter votre premier sponsor</p>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default SponsorsManagement;