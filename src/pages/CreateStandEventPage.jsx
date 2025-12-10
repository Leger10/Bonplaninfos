import React, { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Store, Plus, Trash, Coins, Calendar, MapPin, CheckCircle2, ArrowRight, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import ImageUpload from '@/components/ImageUpload';

// --- Utility Functions ---
const convertToCoins = (amount, currency) => {
  let rate = 10;
  if (currency === 'XOF' || currency === 'XAF') rate = 10;
  else if (currency === 'EUR') rate = 655 / 10;
  else if (currency === 'USD') rate = 600 / 10;
  
  const safeAmount = parseFloat(amount) || 0;
  return Math.ceil(safeAmount / rate);
};

const formatCurrency = (amount, currency) => {
  const safeAmount = parseFloat(amount) || 0;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency === 'XOF' ? 'XOF' : currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(safeAmount);
};

// --- Sub-components for Optimization ---

// Memoized Stand Type Row to prevent full list re-render on single input change
const StandTypeItem = memo(({ st, index, onChange, onRemove, canRemove }) => {
  return (
    <Card className="relative border-2 border-muted hover:border-primary/30 transition-all group mb-4">
      <CardContent className="p-6">
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <Badge variant="outline" className="bg-background">Type #{index + 1}</Badge>
          {canRemove && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onRemove(st.id)} 
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <div className="space-y-2">
            <Label>Nom du stand *</Label>
            <Input 
              value={st.name} 
              onChange={e => onChange(st.id, 'name', e.target.value)} 
              placeholder="Ex: Stand Premium" 
              className="font-semibold" 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Dimensions</Label>
              <Input 
                value={st.size} 
                onChange={e => onChange(st.id, 'size', e.target.value)} 
                placeholder="Ex: 9m²" 
              />
            </div>
            <div className="space-y-2">
              <Label>Quantité *</Label>
              <Input 
                type="number" 
                min="1" 
                value={st.quantity_available} 
                onChange={e => onChange(st.id, 'quantity_available', e.target.value)} 
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
          <div className="space-y-2">
            <Label>Prix unitaire *</Label>
            <Input 
              type="number" 
              min="0" 
              value={st.base_price} 
              onChange={e => onChange(st.id, 'base_price', e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label>Devise</Label>
            <Select 
              value={st.base_currency} 
              onValueChange={val => onChange(st.id, 'base_currency', val)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="XOF">FCFA (XOF)</SelectItem>
                <SelectItem value="USD">Dollar (USD)</SelectItem>
                <SelectItem value="EUR">Euro (EUR)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-primary font-bold">Prix en Pièces (Auto)</Label>
            <div className="h-10 flex items-center px-3 rounded-md bg-primary/10 text-primary font-bold border border-primary/20">
              <Coins className="w-4 h-4 mr-2" />
              {convertToCoins(st.base_price, st.base_currency)} π
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Inclus / Description</Label>
          <Textarea 
            value={st.description} 
            onChange={e => onChange(st.id, 'description', e.target.value)} 
            placeholder="Électricité, Wifi, Mobilier..." 
            rows={2} 
            className="bg-muted/20" 
          />
        </div>
      </CardContent>
    </Card>
  );
});

const CreateStandEventPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [step, setStep] = useState(1);

  // --- Step 1: Event Details ---
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState(null);
  const [eventDate, setEventDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [address, setAddress] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(500);
  const [isPublic, setIsPublic] = useState(true);

  // --- Step 2: Stand Configurations ---
  const [standTypes, setStandTypes] = useState([{
    id: uuidv4(),
    name: 'Stand Standard',
    base_price: 50000,
    base_currency: 'XOF',
    quantity_available: 10,
    description: 'Espace 3x3m avec table et chaises',
    size: '3x3m'
  }]);

  // Load Categories
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from('event_categories').select('*').eq('is_active', true).order('name');
      if (error) console.error('Error fetching categories:', error);
      else setCategories(data || []);
    };
    fetchCategories();
  }, []);

  // Optimized change handler
  const handleStandTypeChange = useCallback((id, field, value) => {
    setStandTypes(prev => prev.map(st => st.id === id ? { ...st, [field]: value } : st));
  }, []);

  const addStandType = () => {
    setStandTypes(prev => [...prev, {
      id: uuidv4(),
      name: '',
      base_price: 0,
      base_currency: 'XOF',
      quantity_available: 5,
      description: '',
      size: '3x3m'
    }]);
  };

  const removeStandType = useCallback((id) => {
    setStandTypes(prev => {
        if (prev.length > 1) {
            return prev.filter(st => st.id !== id);
        } else {
            toast({ title: "Action impossible", description: "Vous devez proposer au moins un type de stand.", variant: "destructive" });
            return prev;
        }
    });
  }, []);

  // --- Validation ---
  const validateStep1 = () => {
    const requiredFields = { title, categoryId, eventDate, city, country };
    const missing = Object.keys(requiredFields).filter(k => !requiredFields[k]);
    
    if (missing.length > 0) {
      toast({ title: "Champs manquants", description: "Veuillez remplir tous les champs obligatoires (*)", variant: "destructive" });
      return false;
    }

    const start = new Date(eventDate);
    if (start < new Date()) {
        toast({ title: "Date invalide", description: "La date de début doit être dans le futur", variant: "destructive" });
        return false;
    }
    
    if (endDate && new Date(endDate) <= start) {
        toast({ title: "Date invalide", description: "La date de fin doit être après la date de début", variant: "destructive" });
        return false;
    }

    if (!coverImage) {
        toast({ title: "Image manquante", description: "Une image de couverture est recommandée pour attirer les exposants.", variant: "default" });
    }
    return true;
  };

  const validateStep2 = () => {
    for (const stand of standTypes) {
      if (!stand.name.trim() || stand.base_price <= 0 || stand.quantity_available < 1) {
        toast({ title: "Configuration invalide", description: "Vérifiez que tous les stands ont un nom, un prix valide et une quantité positive.", variant: "destructive" });
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  // --- Submission ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast({ title: 'Erreur', description: 'Session expirée. Veuillez vous reconnecter.', variant: 'destructive' });
      navigate('/auth');
      return;
    }
    if (!validateStep1() || !validateStep2()) return;

    setLoading(true);

    try {
      // 1. Create Main Event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .insert({
          title,
          description,
          event_date: eventDate,
          end_date: endDate ? endDate : null,
          city,
          country,
          address,
          organizer_id: user.id,
          event_type: 'stand_rental',
          category_id: categoryId,
          status: 'active',
          max_participants: maxParticipants,
          is_public: isPublic,
          cover_image: coverImage, 
          created_at: new Date().toISOString()
        }).select().single();

      if (eventError) throw eventError;
      const newEventId = eventData.id;

      // 2. Create Stand Event Metadata
      const { data: standEventData, error: standEventError } = await supabase
        .from('stand_events').insert({ 
            event_id: newEventId,
            base_currency: standTypes[0].base_currency || 'XOF' 
        }).select().single();
        
      if (standEventError) throw standEventError;
      const standEventId = standEventData.id;

      // 3. Create Stand Types
      const standTypesToInsert = standTypes.map(st => ({
        stand_event_id: standEventId,
        event_id: newEventId,
        name: st.name,
        description: st.description,
        size: st.size,
        base_price: parseFloat(st.base_price),
        base_currency: st.base_currency,
        calculated_price_pi: convertToCoins(st.base_price, st.base_currency),
        quantity_available: parseInt(st.quantity_available),
        quantity_rented: 0,
        is_active: true
      }));
      
      const { error: standTypesError } = await supabase.from('stand_types').insert(standTypesToInsert);
      if (standTypesError) throw standTypesError;

      // 4. Update Settings
      await supabase.from('event_settings').insert({
          event_id: newEventId,
          stands_enabled: true,
          total_stands: standTypes.reduce((acc, st) => acc + parseInt(st.quantity_available), 0),
          stands_rented: 0,
          created_at: new Date().toISOString()
      });

      toast({ 
          title: 'Félicitations !', 
          description: 'Votre espace de location de stands a été créé avec succès.',
          className: "bg-green-600 text-white border-none"
      });
      
      navigate(`/event/${newEventId}`);

    } catch (error) {
      console.error('Error creating stand event:', error);
      toast({ title: 'Erreur technique', description: error.message || 'Impossible de créer l\'événement.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // --- Step Content Components ---

  const Step1Details = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="space-y-4">
        <Label className="text-lg font-semibold flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-primary" /> Image de couverture
        </Label>
        <div className="bg-muted/30 p-6 rounded-xl border border-dashed border-2 hover:border-primary/50 transition-colors">
          <ImageUpload 
            onImageUploaded={setCoverImage} 
            existingImage={coverImage}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground mt-2 text-center">Recommandé: 1200x630px. Max 5MB.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="title" className="font-semibold">Titre du salon/foire *</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Salon de l'Habitat 2025" required className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category" className="font-semibold">Catégorie *</Label>
          <Select onValueChange={setCategoryId} value={categoryId}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger>
            <SelectContent>{categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="font-semibold">Description complète</Label>
        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Décrivez votre événement, les opportunités pour les exposants, le public attendu..." className="min-h-[120px]" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="eventDate" className="font-semibold">Date de début *</Label>
          <Input id="eventDate" type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate" className="font-semibold">Date de fin</Label>
          <Input id="endDate" type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-11" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label htmlFor="country" className="font-semibold">Pays *</Label>
          <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Pays" required className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city" className="font-semibold">Ville *</Label>
          <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ville" required className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address" className="font-semibold">Lieu / Adresse</Label>
          <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Palais des Congrès..." className="h-11" />
        </div>
      </div>
    </div>
  );

  const Step2Stands = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-200 dark:border-blue-800 mb-6 flex gap-3">
        <Store className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-1 shrink-0" />
        <div>
          <h4 className="font-bold text-blue-700 dark:text-blue-300">Gagnez 95% des revenus</h4>
          <p className="text-sm text-blue-600/80 dark:text-blue-400/80">Configurez vos types de stands (Standard, Premium, Corner...). La plateforme prélève 5% de commission.</p>
        </div>
      </div>

      <div className="space-y-4">
        {standTypes.map((st, index) => (
          <StandTypeItem 
            key={st.id} 
            st={st} 
            index={index} 
            onChange={handleStandTypeChange} 
            onRemove={removeStandType}
            canRemove={standTypes.length > 1}
          />
        ))}
      </div>

      <Button onClick={addStandType} variant="outline" className="w-full py-8 border-dashed border-2 hover:border-primary hover:bg-primary/5 hover:text-primary transition-all">
        <Plus className="w-5 h-5 mr-2" /> Ajouter un autre type de stand
      </Button>
    </div>
  );

  const Step3Confirmation = () => {
    const totalPotentialStands = standTypes.reduce((acc, st) => acc + (parseInt(st.quantity_available) || 0), 0);
    const totalPotentialRevenuePi = standTypes.reduce((acc, st) => acc + (convertToCoins(st.base_price, st.base_currency) * (parseInt(st.quantity_available) || 0)), 0);

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="bg-card p-6 rounded-xl border shadow-sm flex flex-col md:flex-row gap-6">
          {coverImage && (
            <div className="w-full md:w-1/3 aspect-video rounded-lg overflow-hidden border">
              <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-2xl font-bold">{title}</h3>
              <p className="text-muted-foreground flex items-center gap-2 mt-1">
                <MapPin className="w-4 h-4" /> {city}, {country}
              </p>
              <p className="text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" /> {new Date(eventDate).toLocaleDateString()}
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-sm">
              {description || <span className="italic text-muted-foreground">Aucune description</span>}
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Store className="w-5 h-5 text-primary" />
            Configuration des Stands
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {standTypes.map((st, i) => (
              <div key={i} className="flex justify-between items-center p-4 bg-background border rounded-lg hover:border-primary/30 transition-colors">
                <div>
                  <p className="font-bold">{st.name}</p>
                  <p className="text-xs text-muted-foreground">{st.quantity_available} unités • {st.size}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary text-lg">{convertToCoins(st.base_price, st.base_currency)} π</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(st.base_price, st.base_currency)}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800 rounded-xl flex justify-between items-center">
            <div>
              <p className="font-medium text-green-800 dark:text-green-300">Revenu Potentiel Max (brut)</p>
              <p className="text-xs text-green-600/80 dark:text-green-400/80">Si les {totalPotentialStands} stands sont loués</p>
            </div>
            <p className="text-3xl font-extrabold text-green-600 dark:text-green-400">{totalPotentialRevenuePi} π</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <Helmet>
        <title>Créer un Espace Stands - BonPlanInfos</title>
      </Helmet>
      
      <main className="container mx-auto max-w-4xl px-4 py-8">
        <Card className="shadow-xl border-primary/10">
          <CardHeader className="text-center pb-6 bg-muted/20 border-b">
            <CardTitle className="text-3xl font-bold font-heading">
              Créer un Espace Stands
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Organisez votre salon professionnel en 3 étapes simples
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-8 px-6 md:px-10">
            {/* Simple Step Indicator */}
            <div className="flex items-center justify-center mb-10 w-full max-w-2xl mx-auto">
              {[1, 2, 3].map((i) => (
                <React.Fragment key={i}>
                  <div className="flex flex-col items-center">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 font-bold
                      ${step >= i ? 'bg-primary text-white border-primary shadow-lg scale-110' : 'bg-background text-muted-foreground border-muted'}
                    `}>
                      {i}
                    </div>
                    <span className={`text-xs mt-2 font-medium ${step >= i ? 'text-primary' : 'text-muted-foreground'}`}>
                      {i === 1 ? 'Détails' : i === 2 ? 'Stands' : 'Confirmer'}
                    </span>
                  </div>
                  {i < 3 && (
                    <div className={`flex-1 h-1 mx-4 w-12 transition-all duration-500 rounded-full ${step > i ? 'bg-primary' : 'bg-muted'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
            
            <div className="mt-8">
              {step === 1 && <Step1Details />}
              {step === 2 && <Step2Stands />}
              {step === 3 && <Step3Confirmation />}
            </div>
          </CardContent>

          <CardFooter className="flex justify-between border-t bg-muted/20 p-6 md:px-10">
            {step > 1 ? (
              <Button onClick={prevStep} variant="outline" size="lg" className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Précédent
              </Button>
            ) : (
              <div></div>
            )}

            {step < 3 ? (
              <Button onClick={nextStep} size="lg" className="gap-2 shadow-md">
                Suivant <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading} size="lg" className="bg-green-600 hover:bg-green-700 text-white gap-2 shadow-lg min-w-[200px]">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                Publier l'événement
              </Button>
            )}
          </CardFooter>
        </Card>
      </main>
    </div>
  );
};

export default CreateStandEventPage;