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
import { Checkbox } from '@/components/ui/checkbox';

// Couleurs pour les stands - Ajustées pour le thème sombre
const STAND_COLORS = [
  { border: 'border-l-blue-400', bg: 'bg-blue-900/20', text: 'text-blue-300', badge: 'bg-blue-800 text-blue-100' },
  { border: 'border-l-green-400', bg: 'bg-green-900/20', text: 'text-green-300', badge: 'bg-green-800 text-green-100' },
  { border: 'border-l-purple-400', bg: 'bg-purple-900/20', text: 'text-purple-300', badge: 'bg-purple-800 text-purple-100' },
  { border: 'border-l-orange-400', bg: 'bg-orange-900/20', text: 'text-orange-300', badge: 'bg-orange-800 text-orange-100' },
  { border: 'border-l-pink-400', bg: 'bg-pink-900/20', text: 'text-pink-300', badge: 'bg-pink-800 text-pink-100' },
  { border: 'border-l-indigo-400', bg: 'bg-indigo-900/20', text: 'text-indigo-300', badge: 'bg-indigo-800 text-indigo-100' },
  { border: 'border-l-teal-400', bg: 'bg-teal-900/20', text: 'text-teal-300', badge: 'bg-teal-800 text-teal-100' },
  { border: 'border-l-amber-400', bg: 'bg-amber-900/20', text: 'text-amber-300', badge: 'bg-amber-800 text-amber-100' },
  { border: 'border-l-rose-400', bg: 'bg-rose-900/20', text: 'text-rose-300', badge: 'bg-rose-800 text-rose-100' },
  { border: 'border-l-cyan-400', bg: 'bg-cyan-900/20', text: 'text-cyan-300', badge: 'bg-cyan-800 text-cyan-100' }
];

// Utility Functions (inchangées)
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

// Memoized Stand Type Row - Couleurs ajustées pour thème sombre
const StandTypeItem = memo(({ st, index, onChange, onRemove, canRemove }) => {
  const colors = STAND_COLORS[index % STAND_COLORS.length];
  
  // Gestionnaires d'événements locaux
  const handleNameChange = useCallback((e) => {
    onChange(st.id, 'name', e.target.value);
  }, [st.id, onChange]);

  const handleSizeChange = useCallback((e) => {
    onChange(st.id, 'size', e.target.value);
  }, [st.id, onChange]);

  const handleQuantityChange = useCallback((e) => {
    onChange(st.id, 'quantity_available', e.target.value);
  }, [st.id, onChange]);

  const handlePriceChange = useCallback((e) => {
    onChange(st.id, 'base_price', e.target.value);
  }, [st.id, onChange]);

  const handleCurrencyChange = useCallback((value) => {
    onChange(st.id, 'base_currency', value);
  }, [st.id, onChange]);

  const handleDescriptionChange = useCallback((e) => {
    onChange(st.id, 'description', e.target.value);
  }, [st.id, onChange]);

  return (
    <Card className={`relative ${colors.border} ${colors.bg} hover:shadow-lg transition-all group mb-4 border-gray-700`}>
      <CardContent className="p-6">
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <Badge className={`${colors.badge} font-medium border-0`}>Type #{index + 1}</Badge>
          {canRemove && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemove(st.id)}
              className="h-8 w-8 text-gray-400 hover:text-red-400 hover:bg-red-900/30"
            >
              <Trash className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <div className="space-y-2">
            <Label className={`font-bold text-base ${colors.text}`}>Nom du stand *</Label>
            <Input
              value={st.name}
              onChange={handleNameChange}
              placeholder="Ex: Stand Premium"
              className="font-semibold h-11 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className={`font-bold text-base ${colors.text}`}>Dimensions</Label>
              <Input
                value={st.size}
                onChange={handleSizeChange}
                placeholder="Ex: 9m²"
                className="h-11 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>
            <div className="space-y-2">
              <Label className={`font-bold text-base ${colors.text}`}>Quantité *</Label>
              <Input
                type="number"
                min="1"
                value={st.quantity_available}
                onChange={handleQuantityChange}
                className="h-11 bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
          <div className="space-y-2">
            <Label className={`font-bold text-base ${colors.text}`}>Prix unitaire *</Label>
            <Input
              type="number"
              min="0"
              value={st.base_price}
              onChange={handlePriceChange}
              className="h-11 bg-gray-800 border-gray-700 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className={`font-bold text-base ${colors.text}`}>Devise</Label>
            <Select
              value={st.base_currency}
              onValueChange={handleCurrencyChange}
            >
              <SelectTrigger className="h-11 bg-gray-800 border-gray-700 text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700 text-white">
                <SelectItem value="XOF" className="text-white hover:bg-gray-800">FCFA (XOF)</SelectItem>
                <SelectItem value="USD" className="text-white hover:bg-gray-800">Dollar (USD)</SelectItem>
                <SelectItem value="EUR" className="text-white hover:bg-gray-800">Euro (EUR)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-base text-primary-300">Prix en Pièces (Auto)</Label>
            <div className="h-11 flex items-center px-3 rounded-md bg-primary-900/30 text-primary-300 font-bold border border-primary-800">
              <Coins className="w-4 h-4 mr-2" />
              <span className="text-lg">{convertToCoins(st.base_price, st.base_currency)} pièces</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className={`font-bold text-base ${colors.text}`}>Inclus / Description</Label>
          <Textarea
            value={st.description}
            onChange={handleDescriptionChange}
            placeholder="Électricité, Wifi, Mobilier..."
            rows={3}
            className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
          />
        </div>
      </CardContent>
    </Card>
  );
});

// Composants de pas (Step Components) - Couleurs ajustées
const Step1Details = ({ 
  coverImage, setCoverImage, 
  title, setTitle, 
  description, setDescription, 
  eventDate, setEventDate, 
  endDate, setEndDate, 
  city, setCity, 
  country, setCountry, 
  address, setAddress, 
  categoryId, setCategoryId, 
  categories 
}) => {
  // Gestionnaires d'événements locaux
  const handleTitleChange = useCallback((e) => setTitle(e.target.value), [setTitle]);
  const handleDescriptionChange = useCallback((e) => setDescription(e.target.value), [setDescription]);
  const handleEventDateChange = useCallback((e) => setEventDate(e.target.value), [setEventDate]);
  const handleEndDateChange = useCallback((e) => setEndDate(e.target.value), [setEndDate]);
  const handleCityChange = useCallback((e) => setCity(e.target.value), [setCity]);
  const handleCountryChange = useCallback((e) => setCountry(e.target.value), [setCountry]);
  const handleAddressChange = useCallback((e) => setAddress(e.target.value), [setAddress]);
  const handleCategoryChange = useCallback((value) => setCategoryId(value), [setCategoryId]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="space-y-4">
        <Label className="text-lg font-bold flex items-center gap-2 text-gray-200">
          <ImageIcon className="w-5 h-5 text-primary-400" /> Image de couverture
        </Label>
        <div className="bg-gray-800/50 p-6 rounded-xl border-2 border-dashed border-gray-700 hover:border-primary-500/50 transition-colors">
          <ImageUpload
            onImageUploaded={setCoverImage}
            existingImage={coverImage}
            className="w-full"
          />
          <p className="text-sm text-gray-400 mt-2 text-center">Recommandé: 1200x630px. Max 5MB.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="title" className="font-bold text-base text-gray-200">Titre du salon/foire *</Label>
          <Input 
            id="title" 
            value={title} 
            onChange={handleTitleChange}
            placeholder="Ex: Salon de l'Habitat 2025" 
            required 
            className="h-11 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category" className="font-bold text-base text-gray-200">Catégorie *</Label>
          <Select onValueChange={handleCategoryChange} value={categoryId}>
            <SelectTrigger className="h-11 bg-gray-800 border-gray-700 text-white"><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700 text-white">
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id} className="text-white hover:bg-gray-800">{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="font-bold text-base text-gray-200">Description complète</Label>
        <Textarea 
          id="description" 
          value={description} 
          onChange={handleDescriptionChange}
          placeholder="Décrivez votre événement, les opportunités pour les exposants, le public attendu..." 
          className="min-h-[120px] bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="eventDate" className="font-bold text-base text-gray-200">Date de début *</Label>
          <Input 
            id="eventDate" 
            type="datetime-local" 
            value={eventDate} 
            onChange={handleEventDateChange}
            required 
            className="h-11 bg-gray-800 border-gray-700 text-white" 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate" className="font-bold text-base text-gray-200">Date de fin</Label>
          <Input 
            id="endDate" 
            type="datetime-local" 
            value={endDate} 
            onChange={handleEndDateChange}
            className="h-11 bg-gray-800 border-gray-700 text-white" 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label htmlFor="country" className="font-bold text-base text-gray-200">Pays *</Label>
          <Input 
            id="country" 
            value={country} 
            onChange={handleCountryChange}
            placeholder="Pays" 
            required 
            className="h-11 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city" className="font-bold text-base text-gray-200">Ville *</Label>
          <Input 
            id="city" 
            value={city} 
            onChange={handleCityChange}
            placeholder="Ville" 
            required 
            className="h-11 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address" className="font-bold text-base text-gray-200">Lieu / Adresse</Label>
          <Input 
            id="address" 
            value={address} 
            onChange={handleAddressChange}
            placeholder="Palais des Congrès..." 
            className="h-11 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" 
          />
        </div>
      </div>
    </div>
  );
};

const Step2Stands = ({ standTypes, handleStandTypeChange, removeStandType, addStandType }) => (
  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
    <div className="bg-blue-900/30 p-4 rounded-xl border border-blue-800 mb-6 flex gap-3">
      <Store className="w-6 h-6 text-blue-400 mt-1 shrink-0" />
      <div>
        <h4 className="font-bold text-blue-300 text-lg">Gagnez 95% des revenus</h4>
        <p className="text-sm text-blue-200">Configurez vos types de stands (Standard, Premium, Corner...). La plateforme prélève 5% de commission.</p>
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

    <Button onClick={addStandType} variant="outline" className="w-full py-8 border-2 border-dashed border-gray-700 hover:border-primary-500 hover:bg-primary-900/20 hover:text-primary-300 transition-all text-gray-300">
      <Plus className="w-5 h-5 mr-2" /> Ajouter un autre type de stand
    </Button>
  </div>
);

const Step3Confirmation = ({ 
  coverImage, title, description, eventDate, city, country, 
  standTypes, termsAccepted, setTermsAccepted 
}) => {
  const totalPotentialStands = standTypes.reduce((acc, st) => acc + (parseInt(st.quantity_available) || 0), 0);
  const totalPotentialRevenuePi = standTypes.reduce((acc, st) => acc + (convertToCoins(st.base_price, st.base_currency) * (parseInt(st.quantity_available) || 0)), 0);

  const handleTermsChange = useCallback((checked) => {
    if (typeof checked === 'boolean') {
      setTermsAccepted(checked);
    }
  }, [setTermsAccepted]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-sm flex flex-col md:flex-row gap-6">
        {coverImage && (
          <div className="w-full md:w-1/3 aspect-video rounded-lg overflow-hidden border border-gray-700">
            <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-2xl font-bold text-white">{title}</h3>
            <p className="text-gray-300 flex items-center gap-2 mt-1">
              <MapPin className="w-4 h-4" /> {city}, {country}
            </p>
            <p className="text-gray-300 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> {new Date(eventDate).toLocaleDateString('fr-FR')}
            </p>
          </div>
          <div className="p-4 bg-gray-900 rounded-lg text-sm text-gray-300">
            {description || <span className="italic text-gray-500">Aucune description</span>}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
          <Store className="w-5 h-5 text-primary-400" />
          Configuration des Stands
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {standTypes.map((st, i) => {
            const colors = STAND_COLORS[i % STAND_COLORS.length];
            return (
              <div key={i} className={`p-4 ${colors.border} ${colors.bg} border border-gray-700 rounded-lg hover:shadow-md transition-all`}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-white text-lg">{st.name}</p>
                    <p className="text-sm text-gray-400">{st.quantity_available} unités • {st.size}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary-300 text-xl">{convertToCoins(st.base_price, st.base_currency)} pièces</p>
                    <p className="text-sm text-gray-400">{formatCurrency(st.base_price, st.base_currency)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-6 bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-800 rounded-xl flex justify-between items-center">
          <div>
            <p className="font-bold text-green-300 text-lg">Revenu Potentiel Max (brut)</p>
            <p className="text-sm text-green-200">Si les {totalPotentialStands} stands sont loués</p>
          </div>
          <p className="text-3xl font-extrabold text-green-300">{totalPotentialRevenuePi} pièces</p>
        </div>
      </div>
      
      <div className="bg-gray-800/50 border border-gray-700 p-4 rounded-lg mt-4">
        <div className="flex items-center space-x-3">
          <Checkbox 
            id="terms" 
            checked={termsAccepted} 
            onCheckedChange={handleTermsChange}
            className="border-gray-600 data-[state=checked]:bg-primary-500 data-[state=checked]:border-primary-500"
          />
          <div className="grid gap-1.5 leading-none">
            <label
              htmlFor="terms"
              className="text-base font-bold leading-none text-white peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              J'ai lu et j'accepte le contrat Organisateur
            </label>
            <p className="text-sm text-gray-400">
              En publiant cet événement, vous acceptez les conditions générales de location de stands.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const CreateStandEventPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [step, setStep] = useState(1);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Step 1: Event Details
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

  // Step 2: Stand Configurations
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
      const { data, error } = await supabase
        .from('event_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) console.error('Error fetching categories:', error);
      else setCategories(data || []);
    };
    fetchCategories();
  }, []);

  const handleStandTypeChange = useCallback((id, field, value) => {
    setStandTypes(prev => prev.map(st => {
      if (st.id === id) {
        return { ...st, [field]: value };
      }
      return st;
    }));
  }, []);

  const addStandType = useCallback(() => {
    setStandTypes(prev => [...prev, {
      id: uuidv4(),
      name: '',
      base_price: 0,
      base_currency: 'XOF',
      quantity_available: 5,
      description: '',
      size: '3x3m'
    }]);
  }, []);

  const removeStandType = useCallback((id) => {
    setStandTypes(prev => {
      if (prev.length > 1) {
        return prev.filter(st => st.id !== id);
      } else {
        toast({ 
          title: "Action impossible", 
          description: "Vous devez proposer au moins un type de stand.", 
          variant: "destructive" 
        });
        return prev;
      }
    });
  }, []);

  const validateStep1 = () => {
    const requiredFields = { title, categoryId, eventDate, city, country };
    const missing = Object.keys(requiredFields).filter(k => !requiredFields[k]);

    if (missing.length > 0) {
      toast({ 
        title: "Champs manquants", 
        description: "Veuillez remplir tous les champs obligatoires (*)", 
        variant: "destructive" 
      });
      return false;
    }

    const start = new Date(eventDate);
    const end = endDate ? new Date(endDate) : null;
    const now = new Date();

    const startDay = start.toDateString();
    const todayDay = now.toDateString();
    
    if (startDay !== todayDay && start.getTime() < now.getTime()) {
      toast({
        title: "Date invalide",
        description: "La date de début ne peut pas être dans le passé.",
        variant: "destructive"
      });
      return false;
    }

    if (end && end.getTime() <= start.getTime()) {
      toast({
        title: "Date invalide",
        description: "La date de fin doit être après la date de début.",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const validateStep2 = () => {
    for (const stand of standTypes) {
      if (!stand.name.trim() || stand.base_price <= 0 || stand.quantity_available < 1) {
        toast({ 
          title: "Configuration invalide", 
          description: "Vérifiez que tous les stands ont un nom, un prix valide et une quantité positive.", 
          variant: "destructive" 
        });
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

  const performSubmission = async () => {
    if (!user) {
      toast({ 
        title: 'Erreur', 
        description: 'Session expirée. Veuillez vous reconnecter.', 
        variant: 'destructive' 
      });
      navigate('/auth');
      return;
    }
    
    if (!termsAccepted) {
      toast({ 
        title: 'Acceptation requise', 
        description: 'Veuillez accepter les conditions pour publier.', 
        variant: 'destructive' 
      });
      return;
    }

    setLoading(true);

    try {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .insert({
          title,
          description,
          event_start_at: eventDate,
          event_end_at: endDate ? endDate : null,
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
          created_at: new Date().toISOString(),
          contract_accepted_at: new Date().toISOString(),
          contract_version: 'v1.0'
        })
        .select()
        .single();

      if (eventError) throw eventError;
      const newEventId = eventData.id;

      const { data: standEventData, error: standEventError } = await supabase
        .from('stand_events')
        .insert({
          event_id: newEventId,
          base_currency: standTypes[0].base_currency || 'XOF'
        })
        .select()
        .single();

      if (standEventError) throw standEventError;
      const standEventId = standEventData.id;

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

      const { error: standTypesError } = await supabase
        .from('stand_types')
        .insert(standTypesToInsert);
      
      if (standTypesError) throw standTypesError;

      await supabase
        .from('event_settings')
        .insert({
          event_id: newEventId,
          stands_enabled: true,
          total_stands: standTypes.reduce((acc, st) => acc + parseInt(st.quantity_available), 0),
          stands_rented: 0,
          created_at: new Date().toISOString()
        });

      toast({
        title: 'Félicitations !',
        description: 'Votre espace de location de stands a été créé avec succès.',
        className: "bg-green-700 text-white border-none"
      });

      navigate(`/event/${newEventId}`);

    } catch (error) {
      console.error('Error creating stand event:', error);
      toast({ 
        title: 'Erreur technique', 
        description: error.message || 'Impossible de créer l\'événement.', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 pb-20">
      <Helmet>
        <title>Créer un Espace Stands - BonPlanInfos</title>
      </Helmet>

      <main className="container mx-auto max-w-4xl px-4 py-8">
        <Card className="shadow-2xl border-primary-800/30 bg-gray-800">
          <CardHeader className="text-center pb-6 bg-gray-900/50 border-b border-gray-700">
            <CardTitle className="text-3xl font-bold text-white">
              Créer un Espace Stands
            </CardTitle>
            <CardDescription className="text-base mt-2 text-gray-300">
              Mettre en location vos stands de façon simple et professionnelle
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-8 px-6 md:px-10">
            <div className="flex items-center justify-center mb-10 w-full max-w-2xl mx-auto">
              {[1, 2, 3].map((i) => (
                <React.Fragment key={i}>
                  <div className="flex flex-col items-center">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 font-bold
                      ${step >= i ? 'bg-primary-600 text-white border-primary-600 shadow-lg scale-110' : 'bg-gray-800 text-gray-400 border-gray-700'}
                    `}>
                      {i}
                    </div>
                    <span className={`text-sm mt-2 font-medium ${step >= i ? 'text-primary-400 font-bold' : 'text-gray-500'}`}>
                      {i === 1 ? 'Détails' : i === 2 ? 'Stands' : 'Confirmer'}
                    </span>
                  </div>
                  {i < 3 && (
                    <div className={`flex-1 h-1 mx-4 w-12 transition-all duration-500 rounded-full ${step > i ? 'bg-primary-600' : 'bg-gray-700'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>

            <div className="mt-8">
              {step === 1 && (
                <Step1Details 
                  coverImage={coverImage}
                  setCoverImage={setCoverImage}
                  title={title}
                  setTitle={setTitle}
                  description={description}
                  setDescription={setDescription}
                  eventDate={eventDate}
                  setEventDate={setEventDate}
                  endDate={endDate}
                  setEndDate={setEndDate}
                  city={city}
                  setCity={setCity}
                  country={country}
                  setCountry={setCountry}
                  address={address}
                  setAddress={setAddress}
                  categoryId={categoryId}
                  setCategoryId={setCategoryId}
                  categories={categories}
                />
              )}
              {step === 2 && (
                <Step2Stands 
                  standTypes={standTypes}
                  handleStandTypeChange={handleStandTypeChange}
                  removeStandType={removeStandType}
                  addStandType={addStandType}
                />
              )}
              {step === 3 && (
                <Step3Confirmation 
                  coverImage={coverImage}
                  title={title}
                  description={description}
                  eventDate={eventDate}
                  city={city}
                  country={country}
                  standTypes={standTypes}
                  termsAccepted={termsAccepted}
                  setTermsAccepted={setTermsAccepted}
                />
              )}
            </div>
          </CardContent>

          <CardFooter className="flex justify-between border-t border-gray-700 bg-gray-900/30 p-6 md:px-10">
            {step > 1 ? (
              <Button onClick={prevStep} variant="outline" size="lg" className="gap-2 text-gray-300 border-gray-700 hover:bg-gray-800 hover:text-white">
                <ArrowLeft className="w-4 h-4" /> Précédent
              </Button>
            ) : (
              <div></div>
            )}

            {step < 3 ? (
              <Button onClick={nextStep} size="lg" className="gap-2 shadow-md bg-primary-600 hover:bg-primary-700 text-white">
                Suivant <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button 
                onClick={performSubmission} 
                disabled={loading || !termsAccepted} 
                size="lg" 
                className="bg-green-700 hover:bg-green-800 text-white gap-2 shadow-lg min-w-[200px]"
              >
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