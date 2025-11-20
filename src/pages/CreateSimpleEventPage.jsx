import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, Coins, Shield } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { CoinService } from '@/services/CoinService';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { v4 as uuidv4 } from 'uuid';

const CreateSimpleEventPage = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: null,
    event_date: '',
    location: '',
    city: '',
    country: '',
    price_fcfa: 0,
    is_protected: false,
    cover_image_file: null,
  });
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [imagePreview, setImagePreview] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userProfile } = useData();

  useEffect(() => {
    if (userProfile) {
      setFormData(prev => ({
        ...prev,
        country: userProfile.country || '',
        city: userProfile.city || '',
      }));
    }
    const fetchCategories = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('event_categories').select('id, name').eq('is_active', true).order('name');
        if (error) {
            toast({ title: "Erreur", description: "Impossible de charger les catégories.", variant: "destructive" });
        } else {
            setCategories(data);
        }
        setLoading(false);
    };
    fetchCategories();
  }, [userProfile]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({ title: "Fichier trop volumineux", description: "L'image ne doit pas dépasser 2MB.", variant: "destructive" });
        return;
      }
      handleInputChange('cover_image_file', file);
      setImagePreview(URL.createObjectURL(file));
    }
  };
  
  const pricePi = CoinService.convertFcfaToCoins(formData.price_fcfa);
  
  const canSubmit = formData.title && formData.event_date && formData.location && formData.city && formData.country && formData.category_id;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) {
      toast({ title: 'Champs requis', description: 'Veuillez remplir tous les champs obligatoires.', variant: 'destructive' });
      return;
    }
    setLoading(true);

    try {
      let cover_image_url = null;
      if (formData.cover_image_file) {
        const cleanFileName = formData.cover_image_file.name.replace(/[^a-zA-Z0-9-_\.]/g, '_');
        const filePath = `events/${user.id}/${uuidv4()}-${cleanFileName}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('media')
          .upload(filePath, formData.cover_image_file);

        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage.from('media').getPublicUrl(uploadData.path);
        cover_image_url = urlData.publicUrl;
      }
      
      const eventPayload = {
        title: formData.title,
        description: formData.description,
        category_id: formData.category_id,
        event_type: formData.is_protected ? 'protected' : 'standard',
        event_date: formData.event_date,
        location: formData.location,
        address: formData.location,
        city: formData.city,
        country: formData.country,
        price_fcfa: formData.is_protected ? 0 : formData.price_fcfa,
        price_pi: formData.is_protected ? 2 : pricePi,
        organizer_id: user.id,
        status: 'active',
        cover_image: cover_image_url,
      };

      const { data, error } = await supabase.from('events').insert(eventPayload).select().single();
      if (error) throw error;
      
      toast({ title: 'Événement créé!', description: 'Votre événement a été publié avec succès.' });
      navigate(`/event/${data.id}`);

    } catch (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>Créer un Événement Standard</title></Helmet>
      <main className="container mx-auto max-w-2xl px-4 py-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour
          </Button>
          <Card>
            <CardHeader>
              <CardTitle>Créer un Événement Standard</CardTitle>
              <CardDescription>Remplissez les informations de base de votre événement.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Titre de l'événement *</Label>
                  <Input 
                    id="title" 
                    value={formData.title} 
                    onChange={e => handleInputChange('title', e.target.value)} 
                    required 
                    className="text-lg font-bold p-4 bg-transparent border-0 border-b-2 border-input focus:ring-0 focus:border-primary transition-all duration-300 ease-in-out placeholder-muted-foreground/50 bg-gradient-to-r from-primary/5 to-accent/5"
                    placeholder="Un titre qui claque !"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={formData.description} onChange={e => handleInputChange('description', e.target.value)} />
                </div>
                 <div className="space-y-2">
                  <Label>Image de couverture</Label>
                  {imagePreview && <img className="w-full h-auto rounded-lg max-h-60 object-cover" alt="Aperçu de l'événement"  src={imagePreview} />}
                  <Input type="file" accept="image/*" onChange={handleFileChange} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="category">Catégorie *</Label>
                        <Select value={formData.category_id || ''} onValueChange={value => handleInputChange('category_id', value)}>
                            <SelectTrigger><SelectValue placeholder="Choisir une catégorie..." /></SelectTrigger>
                            <SelectContent>
                                {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="event_date">Date et Heure *</Label>
                        <Input id="event_date" type="datetime-local" value={formData.event_date} onChange={e => handleInputChange('event_date', e.target.value)} required />
                    </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Lieu (Adresse) *</Label>
                  <Input id="location" value={formData.location} onChange={e => handleInputChange('location', e.target.value)} required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Ville *</Label>
                    <Input id="city" value={formData.city} onChange={e => handleInputChange('city', e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Pays *</Label>
                    <Input id="country" value={formData.country} onChange={e => handleInputChange('country', e.target.value)} disabled />
                  </div>
                </div>

                <div className="p-4 border rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label htmlFor="is_protected" className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary"/> Rendre l'événement "protégé"</Label>
                            <p className="text-xs text-muted-foreground">Les utilisateurs paieront 2π pour chaque interaction. Vous gagnez 1π par interaction payante.</p>
                        </div>
                        <Switch id="is_protected" checked={formData.is_protected} onCheckedChange={checked => handleInputChange('is_protected', checked)} />
                    </div>
                    {!formData.is_protected && (
                        <div className="space-y-2">
                            <Label htmlFor="price_fcfa">Prix d'entrée (FCFA)</Label>
                            <Input id="price_fcfa" type="number" value={formData.price_fcfa} onChange={e => handleInputChange('price_fcfa', parseInt(e.target.value) || 0)} />
                            <p className="text-xs text-muted-foreground flex items-center gap-1"><Coins className="w-3 h-3"/> {pricePi} Pièces</p>
                        </div>
                    )}
                </div>

                <Button type="submit" disabled={loading || !canSubmit} className="w-full">
                  {loading ? <Loader2 className="animate-spin mr-2" /> : 'Créer l\'événement'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default CreateSimpleEventPage;