// Pages/CreateRaffleEventPage.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useData } from '@/contexts/DataContext';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  Loader2,
  Ticket,
  Gift,
  Plus,
  Trash2,
  Coins,
  Target,
  Upload,
  X,
  ArrowLeft,
  ArrowRight,
  FileText,
  CheckCircle,
  Save,
  ChevronRight,
  MessageSquare,
  Sparkles,
  MapPin,
  Globe,
  Calendar,
  Clock,
  DollarSign,
  Award,
  Users,
  Eye,
  Bell,
  Zap,
  Edit3,
  Image as ImageIcon,
  CheckCheck
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Checkbox } from '@/components/ui/checkbox';
import { checkAuthentication } from '@/lib/authUtils';
import OrganizerContractModal from '@/components/organizer/OrganizerContractModal';

// Composant d'input animé
const AnimatedInput = ({ icon: Icon, label, error, touched, ...props }) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  return (
    <motion.div 
      className="space-y-2 relative"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Label 
        htmlFor={props.id} 
        className={`text-sm font-medium transition-colors duration-200 flex items-center gap-1
          ${isFocused ? 'text-primary' : 'text-muted-foreground'}`}
      >
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label} {props.required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative">
        <Input
          ref={inputRef}
          {...props}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          className={`transition-all duration-200 bg-background/50 backdrop-blur-sm
            ${isFocused ? 'ring-2 ring-primary/20 border-primary scale-[1.02] shadow-lg' : 'hover:bg-background/80'}
            ${error && touched ? 'border-red-500 focus-visible:ring-red-500' : ''}
            ${props.className || ''}`}
        />
        {isFocused && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute -right-2 -top-2"
          >
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          </motion.div>
        )}
      </div>
      {error && touched && (
        <motion.p 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-red-500 mt-1 flex items-center gap-1"
        >
          <X className="w-3 h-3" />
          {error}
        </motion.p>
      )}
    </motion.div>
  );
};

// Composant Textarea animé
const AnimatedTextarea = ({ icon: Icon, label, error, touched, ...props }) => {
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef(null);

  return (
    <motion.div 
      className="space-y-2 relative"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Label 
        htmlFor={props.id} 
        className={`text-sm font-medium transition-colors duration-200 flex items-center gap-1
          ${isFocused ? 'text-primary' : 'text-muted-foreground'}`}
      >
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </Label>
      <div className="relative">
        <Textarea
          ref={textareaRef}
          {...props}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          className={`transition-all duration-200 bg-background/50 backdrop-blur-sm
            ${isFocused ? 'ring-2 ring-primary/20 border-primary scale-[1.01] shadow-lg' : 'hover:bg-background/80'}
            ${error && touched ? 'border-red-500 focus-visible:ring-red-500' : ''}
            min-h-[120px] resize-y ${props.className || ''}`}
        />
        {isFocused && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute -right-2 -top-2"
          >
            <Edit3 className="w-4 h-4 text-primary animate-pulse" />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

// Composant Select animé
const AnimatedSelect = ({ icon: Icon, label, value, onValueChange, placeholder, options, required, error, touched }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div 
      className="space-y-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Label className={`text-sm font-medium transition-colors duration-200 flex items-center gap-1
        ${isOpen ? 'text-primary' : 'text-muted-foreground'}`}>
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Select 
        onValueChange={onValueChange} 
        value={value}
        onOpenChange={setIsOpen}
      >
        <SelectTrigger 
          className={`transition-all duration-200 bg-background/50 backdrop-blur-sm
            ${isOpen ? 'ring-2 ring-primary/20 border-primary scale-[1.02] shadow-lg' : 'hover:bg-background/80'}
            ${error && touched ? 'border-red-500' : ''}`}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem 
              key={option.id} 
              value={option.id}
              className="cursor-pointer hover:bg-primary/10 transition-colors"
            >
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </motion.div>
  );
};

// Composant Switch animé
const AnimatedSwitch = ({ label, description, checked, onCheckedChange, icon: Icon }) => {
  return (
    <motion.div 
      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-all cursor-pointer group"
      whileHover={{ scale: 1.01, x: 5 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onCheckedChange(!checked)}
    >
      <div className="flex items-start gap-3">
        {Icon && (
          <div className={`p-2 rounded-lg transition-colors duration-300 ${checked ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div>
          <Label className="font-semibold cursor-pointer">{label}</Label>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch 
        checked={checked} 
        onCheckedChange={onCheckedChange}
        className="data-[state=checked]:bg-primary transition-all duration-300"
      />
    </motion.div>
  );
};

// Composant pour les lots avec animations
const PrizeCard = ({ prize, index, onUpdate, onRemove, isLast, exchangeRate }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      whileHover={{ scale: 1.01, boxShadow: "0 10px 30px -15px rgba(0,0,0,0.3)" }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative"
    >
      <Card className="border-2 overflow-hidden transition-all duration-300">
        {/* Bande de couleur animée */}
        <motion.div 
          className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500"
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: isHovered ? [0, 10, -10, 0] : 0 }}
                transition={{ duration: 0.5 }}
              >
                <Badge className={`px-3 py-1 text-sm transition-all duration-300 ${isHovered ? 'scale-110' : ''}`}>
                  {prize.rank === 1 ? '🥇 GRAND LOT' :
                   prize.rank === 2 ? '🥈 SECOND LOT' :
                   prize.rank === 3 ? '🥉 TROISIÈME LOT' :
                   `Lot N°${prize.rank}`}
                </Badge>
              </motion.div>
              
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
              </motion.button>
            </div>
            
            {!isLast && (
              <motion.div
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => onRemove(prize.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </motion.div>
            )}
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-3 overflow-hidden"
              >
                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" />
                    Description du lot
                  </Label>
                  <Textarea
                    value={prize.description}
                    onChange={e => onUpdate(prize.id, 'description', e.target.value)}
                    placeholder="Décrivez le lot en détail..."
                    className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5" />
                      Valeur estimée (FCFA)
                    </Label>
                    <Input
                      type="number"
                      value={prize.value_fcfa}
                      onChange={e => onUpdate(prize.id, 'value_fcfa', e.target.value)}
                      placeholder="0"
                      className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  
                  <motion.div 
                    className="flex items-end"
                    animate={{ scale: prize.value_fcfa > 0 ? [1, 1.02, 1] : 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="p-2 bg-primary/5 rounded-lg text-sm w-full border border-primary/20">
                      <p className="font-semibold text-primary flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5" />
                        En pièces
                      </p>
                      <p className="text-lg font-bold text-primary">
                        {Math.ceil(prize.value_fcfa / exchangeRate)} π
                      </p>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Composant principal
const CreateRaffleEventPage = () => {
  const { user } = useAuth();
  const { adminConfig, userProfile } = useData();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [step, setStep] = useState(1);
  const [touchedFields, setTouchedFields] = useState({});

  // Contract Modal State
  const [showContractModal, setShowContractModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Taux de conversion
  const exchangeRates = {
    XOF: 1,
    EUR: 655.957,
    USD: 600,
    PI: adminConfig?.pi_conversion_rate || 10
  };

  // États du formulaire
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categoryId: '',
    eventStartDate: '',
    drawDate: '',
    coverImage: null,
    coverImageUrl: '',
    country: userProfile?.country || 'Côte d\'Ivoire',
    city: userProfile?.city || '',
    address: '',
    isOnline: false,
    ticketPrice: 500,
    ticketCurrency: 'XOF',
    totalTickets: 100,
    maxTicketsPerUser: 10,
    minTicketsRequired: 50,
    showRemainingTickets: true,
    prizes: [{ id: uuidv4(), rank: 1, description: '', value_fcfa: 0 }],
    autoDraw: true,
    notifyParticipants: true,
    showParticipants: true
  });

  // Validation des champs
  const validateField = (field, value) => {
    switch(field) {
      case 'title':
        return !value ? 'Le titre est requis' : 
               value.length < 3 ? 'Le titre doit faire au moins 3 caractères' : '';
      case 'categoryId':
        return !value ? 'La catégorie est requise' : '';
      case 'drawDate':
        return !value ? 'La date du tirage est requise' : 
               new Date(value) < new Date() ? 'La date doit être dans le futur' : '';
      case 'city':
        return !value && !formData.isOnline ? 'La ville est requise' : '';
      case 'country':
        return !value && !formData.isOnline ? 'Le pays est requis' : '';
      case 'ticketPrice':
        return value < 0 ? 'Le prix doit être positif' : '';
      case 'totalTickets':
        return value < 1 ? 'Le nombre de tickets doit être au moins 1' : '';
      case 'minTicketsRequired':
        return value < 1 ? 'L\'objectif minimum doit être au moins 1' : 
               value > formData.totalTickets ? 'L\'objectif ne peut pas dépasser le total' : '';
      default:
        return '';
    }
  };

  const getFieldError = (field) => {
    return validateField(field, formData[field]);
  };

  const isFieldValid = (field) => {
    return !getFieldError(field);
  };

  const handleBlur = (field) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
  };

  // Calculs dérivés
  const calculatedPricePi = useMemo(() => {
    const priceInXof = formData.ticketPrice * (exchangeRates[formData.ticketCurrency] || 1);
    return Math.ceil(priceInXof / exchangeRates.PI);
  }, [formData.ticketPrice, formData.ticketCurrency, exchangeRates]);

  const totalRevenuePi = useMemo(() => {
    return calculatedPricePi * formData.totalTickets;
  }, [calculatedPricePi, formData.totalTickets]);

  const totalPrizeValue = useMemo(() => {
    return formData.prizes.reduce((sum, prize) => sum + (prize.value_fcfa || 0), 0);
  }, [formData.prizes]);

  // Chargement des catégories
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

  // Restaurer le brouillon
  useEffect(() => {
    const restoreDraft = () => {
      const draft = localStorage.getItem("draftRaffleEvent");
      if (draft) {
        try {
          const draftData = JSON.parse(draft);
          setFormData(prev => ({
            ...prev,
            ...draftData
          }));
          toast({
            title: "Brouillon restauré",
            description: "Votre brouillon précédent a été restauré.",
            duration: 4000,
          });
        } catch (error) {
          console.error("Error restoring draft:", error);
        }
      }
    };

    if (user) {
      restoreDraft();
    }
  }, [user]);

  // Nettoyer les URLs
  useEffect(() => {
    return () => {
      if (formData.coverImageUrl) {
        URL.revokeObjectURL(formData.coverImageUrl);
      }
    };
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      localStorage.setItem("draftRaffleEvent", JSON.stringify(newData));
      return newData;
    });
  };

  const handlePrizeChange = (id, field, value) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        prizes: prev.prizes.map(p =>
          p.id === id ? { ...p, [field]: field === 'value_fcfa' ? Number(value) : value } : p
        )
      };
      localStorage.setItem("draftRaffleEvent", JSON.stringify(newData));
      return newData;
    });
  };

  const addPrize = () => {
    setFormData(prev => {
      const newData = {
        ...prev,
        prizes: [...prev.prizes, {
          id: uuidv4(),
          rank: prev.prizes.length + 1,
          description: '',
          value_fcfa: 0
        }]
      };
      localStorage.setItem("draftRaffleEvent", JSON.stringify(newData));
      return newData;
    });

    // Animation de scroll vers le nouveau lot
    setTimeout(() => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });
    }, 100);
  };

  const removePrize = (id) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        prizes: prev.prizes.filter(p => p.id !== id).map((p, index) => ({
          ...p,
          rank: index + 1
        }))
      };
      localStorage.setItem("draftRaffleEvent", JSON.stringify(newData));
      return newData;
    });
  };

  // Upload d'image
  const handleImageUpload = async (file) => {
    if (!file) return null;

    setUploading(true);
    try {
      if (file.size > 2 * 1024 * 1024) {
        toast({ 
          title: 'Fichier trop volumineux', 
          description: 'L\'image ne doit pas dépasser 2MB.', 
          variant: 'destructive' 
        });
        return null;
      }

      if (!file.type.startsWith('image/')) {
        toast({ 
          title: 'Type de fichier invalide', 
          description: 'Veuillez sélectionner une image', 
          variant: 'destructive' 
        });
        return null;
      }

      const cleanFileName = file.name.replace(/[^a-zA-Z0-9-_\.]/g, '_');
      const filePath = `events/${user.id}/${uuidv4()}-${cleanFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);
      
      return urlData.publicUrl;

    } catch (error) {
      console.error('Erreur upload image:', error);
      toast({ 
        title: 'Erreur d\'upload', 
        description: 'Impossible de télécharger l\'image', 
        variant: 'destructive' 
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    handleInputChange('coverImage', file);
    handleInputChange('coverImageUrl', previewUrl);
  };

  const handleRemoveImage = () => {
    if (formData.coverImageUrl) {
      URL.revokeObjectURL(formData.coverImageUrl);
    }
    handleInputChange('coverImage', null);
    handleInputChange('coverImageUrl', '');
  };

  // Handlers du contrat
  const handleContractAccept = () => {
    setTermsAccepted(true);
    setShowContractModal(false);
    toast({
      title: "Contrat accepté",
      description: "Vous pouvez maintenant publier votre tombola",
      className: "bg-green-600 text-white",
    });
  };

  const handleOpenContract = () => {
    setShowContractModal(true);
  };

  // Validation de l'étape courante
  const isStepValid = () => {
    switch(step) {
      case 1:
        return formData.title && formData.categoryId && formData.drawDate;
      case 2:
        return formData.isOnline || (formData.city && formData.country);
      case 3:
        return formData.ticketPrice > 0 && formData.totalTickets > 0 && 
               formData.minTicketsRequired > 0 && formData.minTicketsRequired <= formData.totalTickets;
      case 4:
        return formData.prizes.every(p => p.description && p.value_fcfa > 0);
      case 5:
        return termsAccepted;
      default:
        return true;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { isAuthenticated } = await checkAuthentication();
    if (!isAuthenticated) {
      toast({
        title: "Session expirée",
        description: "Votre session a expiré. Merci de vous reconnecter.",
        variant: "destructive",
      });
      localStorage.setItem("draftRaffleEvent", JSON.stringify(formData));
      localStorage.setItem("redirectAfterLogin", window.location.pathname);
      window.location.href = "/login";
      return;
    }

    if (!user) {
      toast({ 
        title: 'Erreur', 
        description: 'Vous devez être connecté.', 
        variant: 'destructive' 
      });
      return;
    }

    if (!termsAccepted) {
      toast({
        title: "Contrat requis",
        description: "Veuillez lire et accepter le contrat organisateur avant de publier.",
        variant: "destructive",
      });
      setShowContractModal(true);
      return;
    }

    if (!isStepValid()) {
      toast({ 
        title: 'Formulaire incomplet', 
        description: 'Veuillez remplir tous les champs obligatoires correctement.', 
        variant: 'destructive' 
      });
      return;
    }

    setLoading(true);

    try {
      let coverImageUrl = '';
      
      if (formData.coverImage) {
        const uploadedUrl = await handleImageUpload(formData.coverImage);
        if (uploadedUrl) {
          coverImageUrl = uploadedUrl;
        }
      }

      const eventStartDate = formData.eventStartDate || new Date().toISOString();

      // Création de l'événement
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .insert({
          title: formData.title,
          description: formData.description,
          event_start_at: eventStartDate,
          event_end_at: formData.drawDate,
          city: formData.city,
          country: formData.country,
          address: formData.isOnline ? 'En ligne' : formData.address,
          organizer_id: user.id,
          event_type: 'raffle',
          category_id: formData.categoryId,
          status: 'active',
          is_online: formData.isOnline,
          cover_image: coverImageUrl,
          contract_accepted_at: new Date().toISOString(),
          contract_version: 'v1.0'
        })
        .select()
        .single();

      if (eventError) {
        if (eventError.message?.includes("JWT") || eventError.message?.includes("session")) {
          throw new Error("Votre session a expiré. Merci de vous reconnecter.");
        }
        throw eventError;
      }
      
      const newEventId = eventData.id;

      // Sauvegarde de l'acceptation du contrat
      await supabase
        .from('user_contract_acceptances')
        .insert({
          user_id: user.id,
          event_id: newEventId,
          contract_type: 'organizer',
          accepted_at: new Date().toISOString(),
          contract_version: 'v1.0'
        });

      // Création du raffle event
      const { data: raffleEventData, error: raffleError } = await supabase
        .from('raffle_events')
        .insert({
          event_id: newEventId,
          draw_date: formData.drawDate,
          base_price: formData.ticketPrice,
          base_currency: formData.ticketCurrency,
          calculated_price_pi: calculatedPricePi,
          total_tickets: formData.totalTickets,
          max_tickets_per_user: formData.maxTicketsPerUser,
          min_tickets_required: formData.minTicketsRequired,
          auto_draw: formData.autoDraw
        })
        .select()
        .single();

      if (raffleError) throw raffleError;

      // Création des settings
      const { error: settingsError } = await supabase
        .from('event_settings')
        .insert({
          event_id: newEventId,
          raffle_enabled: true,
          show_remaining_tickets: formData.showRemainingTickets,
          show_participants: formData.showParticipants,
          notify_participants: formData.notifyParticipants
        });

      if (settingsError) throw settingsError;

      // Création des lots
      if (formData.prizes.length > 0) {
        const prizesToInsert = formData.prizes.map(p => ({
          event_id: newEventId,
          raffle_event_id: raffleEventData.id,
          rank: p.rank,
          description: p.description,
          value_fcfa: p.value_fcfa || 0
        }));

        const { error: prizesError } = await supabase
          .from('raffle_prizes')
          .insert(prizesToInsert);
          
        if (prizesError) throw prizesError;
      }

      localStorage.removeItem("draftRaffleEvent");

      toast({ 
        title: '🎉 Tombola créée !', 
        description: 'Votre tombola a été créée avec succès.' 
      });
      
      navigate(`/event/${newEventId}`);

    } catch (error) {
      console.error('Error creating raffle event:', error);

      if (error.message?.includes("session") || error.message?.includes("expiré") || error.message?.includes("JWT")) {
        toast({
          title: "Session expirée",
          description: "Votre session a expiré. Merci de vous reconnecter.",
          variant: "destructive",
          duration: 5000,
        });

        localStorage.setItem("draftRaffleEvent", JSON.stringify(formData));
        localStorage.setItem("redirectAfterLogin", window.location.pathname);
        window.location.href = "/login";
      } else {
        toast({ 
          title: 'Erreur de création', 
          description: error.message || 'Une erreur est survenue', 
          variant: 'destructive' 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Étape 1
  const Step1 = () => (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <AnimatedInput
        id="title"
        icon={Ticket}
        label="Titre de la tombola"
        value={formData.title}
        onChange={(e) => handleInputChange('title', e.target.value)}
        onBlur={() => handleBlur('title')}
        placeholder="Ex: Grande Tombola de Noël"
        required
        error={getFieldError('title')}
        touched={touchedFields.title}
      />

      <AnimatedTextarea
        id="description"
        icon={Edit3}
        label="Description"
        value={formData.description}
        onChange={(e) => handleInputChange('description', e.target.value)}
        placeholder="Décrivez votre tombola..."
      />

      {/* Upload d'image */}
      <motion.div 
        className="space-y-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
          <ImageIcon className="w-3.5 h-3.5" />
          Image de couverture
        </Label>
        {formData.coverImageUrl ? (
          <motion.div 
            className="relative"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring" }}
          >
            <div className="border-2 border-primary/20 rounded-lg overflow-hidden group">
              <img 
                src={formData.coverImageUrl} 
                alt="Aperçu" 
                className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-105" 
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <Button 
                  type="button" 
                  variant="destructive" 
                  size="icon"
                  onClick={handleRemoveImage}
                  className="transform scale-0 group-hover:scale-100 transition-transform duration-300"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-all group"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <input 
              type="file" 
              id="coverImage" 
              accept="image/*" 
              onChange={handleFileSelect} 
              className="hidden" 
              disabled={uploading}
            />
            <label htmlFor="coverImage" className="cursor-pointer">
              {uploading ? (
                <Loader2 className="w-8 h-8 mx-auto text-muted-foreground animate-spin" />
              ) : (
                <Upload className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
              )}
              <p className="font-semibold mt-2 group-hover:text-primary transition-colors">
                {uploading ? 'Upload en cours...' : 'Ajouter une affiche'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG - Max 2MB</p>
            </label>
          </motion.div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatedSelect
          icon={Award}
          label="Catégorie"
          value={formData.categoryId}
          onValueChange={(value) => handleInputChange('categoryId', value)}
          placeholder="Choisir une catégorie..."
          options={categories}
          required
          error={getFieldError('categoryId')}
          touched={touchedFields.categoryId}
        />

        <AnimatedInput
          id="eventStartDate"
          icon={Calendar}
          label="Date de début"
          type="datetime-local"
          value={formData.eventStartDate}
          onChange={(e) => handleInputChange('eventStartDate', e.target.value)}
        />

        <AnimatedInput
          id="drawDate"
          icon={Clock}
          label="Date du tirage"
          type="datetime-local"
          value={formData.drawDate}
          onChange={(e) => handleInputChange('drawDate', e.target.value)}
          onBlur={() => handleBlur('drawDate')}
          required
          error={getFieldError('drawDate')}
          touched={touchedFields.drawDate}
        />
      </div>

      <motion.div 
        className="flex justify-end"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Button 
          onClick={() => setStep(2)}
          disabled={!isStepValid()}
          className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
        >
          Suivant <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </motion.div>
    </motion.div>
  );

  // Étape 2
  const Step2 = () => (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <AnimatedSwitch
        icon={Globe}
        label="Événement en ligne"
        description="Cochez si votre tombola est 100% digitale"
        checked={formData.isOnline}
        onCheckedChange={(checked) => handleInputChange('isOnline', checked)}
      />

      <AnimatePresence>
        {!formData.isOnline && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4 overflow-hidden"
          >
            <AnimatedInput
              id="address"
              icon={MapPin}
              label="Adresse"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Nom du lieu, rue, numéro..."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatedInput
                id="city"
                icon={MapPin}
                label="Ville"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                onBlur={() => handleBlur('city')}
                required
                error={getFieldError('city')}
                touched={touchedFields.city}
              />

              <AnimatedInput
                id="country"
                icon={Globe}
                label="Pays"
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                onBlur={() => handleBlur('country')}
                required
                error={getFieldError('country')}
                touched={touchedFields.country}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button variant="outline" onClick={() => setStep(1)}>
            <ArrowLeft className="mr-2 w-4 h-4" /> Précédent
          </Button>
        </motion.div>
        
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button 
            onClick={() => setStep(3)}
            disabled={!isStepValid()}
            className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
          >
            Suivant <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );

  // Étape 3
  const Step3 = () => (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5" />
            Prix du ticket
          </Label>
          <div className="flex gap-2">
            <Input 
              type="number" 
              value={formData.ticketPrice} 
              onChange={(e) => handleInputChange('ticketPrice', e.target.value)}
              onBlur={() => handleBlur('ticketPrice')}
              className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
            />
            <Select 
              value={formData.ticketCurrency} 
              onValueChange={(value) => handleInputChange('ticketCurrency', value)}
            >
              <SelectTrigger className="w-24 transition-all duration-200 focus:ring-2 focus:ring-primary/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="XOF">XOF</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <AnimatedInput
          id="totalTickets"
          icon={Ticket}
          label="Total tickets"
          type="number"
          value={formData.totalTickets}
          onChange={(e) => handleInputChange('totalTickets', e.target.value)}
          onBlur={() => handleBlur('totalTickets')}
          required
          error={getFieldError('totalTickets')}
          touched={touchedFields.totalTickets}
        />

        <AnimatedInput
          id="maxTicketsPerUser"
          icon={Users}
          label="Max tickets/personne"
          type="number"
          value={formData.maxTicketsPerUser}
          onChange={(e) => handleInputChange('maxTicketsPerUser', e.target.value)}
        />

        <AnimatedInput
          id="minTicketsRequired"
          icon={Target}
          label="Objectif minimum"
          type="number"
          value={formData.minTicketsRequired}
          onChange={(e) => handleInputChange('minTicketsRequired', e.target.value)}
          onBlur={() => handleBlur('minTicketsRequired')}
          required
          error={getFieldError('minTicketsRequired')}
          touched={touchedFields.minTicketsRequired}
        />
      </div>

      <motion.div 
        className="p-4 border rounded-lg bg-gradient-to-r from-primary/5 to-purple-500/5"
        animate={{ scale: formData.ticketPrice > 0 ? [1, 1.02, 1] : 1 }}
        transition={{ duration: 0.3 }}
      >
        <p className="text-center text-sm text-muted-foreground">Prix en pièces</p>
        <p className="text-center text-3xl font-bold text-primary flex items-center justify-center gap-2">
          {calculatedPricePi} <Coins className="w-6 h-6" />
        </p>
        <p className="text-center text-xs text-muted-foreground">
          {formData.ticketPrice} {formData.ticketCurrency}
        </p>
      </motion.div>

      <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
        <CardContent className="p-4">
          <h4 className="font-bold text-center flex items-center justify-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Résumé Financier
          </h4>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{totalRevenuePi} π</p>
              <p className="text-xs text-muted-foreground">Revenu total</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-green-600">
                {(totalRevenuePi * exchangeRates.PI).toLocaleString()} F
              </p>
              <p className="text-xs text-muted-foreground">En FCFA</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <AnimatedSwitch
        icon={Eye}
        label="Afficher les tickets restants"
        description="Montrer le nombre de tickets disponibles aux participants"
        checked={formData.showRemainingTickets}
        onCheckedChange={(checked) => handleInputChange('showRemainingTickets', checked)}
      />

      <div className="flex justify-between">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button variant="outline" onClick={() => setStep(2)}>
            <ArrowLeft className="mr-2 w-4 h-4" /> Précédent
          </Button>
        </motion.div>
        
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button 
            onClick={() => setStep(4)}
            disabled={!isStepValid()}
            className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
          >
            Suivant <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );

  // Étape 4
  const Step4 = () => (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <AnimatePresence mode="popLayout">
        {formData.prizes.map((prize, index) => (
          <PrizeCard
            key={prize.id}
            prize={prize}
            index={index}
            onUpdate={handlePrizeChange}
            onRemove={removePrize}
            isLast={index === formData.prizes.length - 1}
            exchangeRate={exchangeRates.PI}
          />
        ))}
      </AnimatePresence>

      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Button 
          variant="outline" 
          onClick={addPrize} 
          className="w-full py-6 border-2 border-dashed hover:border-primary/50 hover:text-primary transition-all group"
        >
          <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
          Ajouter un lot
        </Button>
      </motion.div>

      {totalPrizeValue > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-4">
              <h4 className="font-bold text-lg mb-2 text-center flex items-center justify-center gap-2">
                <Award className="w-5 h-5 text-green-600" />
                Valeur Totale des Lots
              </h4>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">{totalPrizeValue.toLocaleString()} F</p>
                  <p className="text-xs text-muted-foreground">En FCFA</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{Math.ceil(totalPrizeValue / exchangeRates.PI)} π</p>
                  <p className="text-xs text-muted-foreground">En pièces</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="flex justify-between">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button variant="outline" onClick={() => setStep(3)}>
            <ArrowLeft className="mr-2 w-4 h-4" /> Précédent
          </Button>
        </motion.div>
        
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button 
            onClick={() => setStep(5)}
            disabled={!isStepValid()}
            className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
          >
            Suivant <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );

  // Étape 5
  const Step5 = () => (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="space-y-4">
        <AnimatedSwitch
          icon={Zap}
          label="Tirage automatique"
          description="Le gagnant est tiré automatiquement à la date prévue"
          checked={formData.autoDraw}
          onCheckedChange={(checked) => handleInputChange('autoDraw', checked)}
        />

        <AnimatedSwitch
          icon={Bell}
          label="Notifier les participants"
          description="Envoyer des notifications aux participants"
          checked={formData.notifyParticipants}
          onCheckedChange={(checked) => handleInputChange('notifyParticipants', checked)}
        />

        <AnimatedSwitch
          icon={Eye}
          label="Afficher les participants"
          description="Montrer la liste des participants"
          checked={formData.showParticipants}
          onCheckedChange={(checked) => handleInputChange('showParticipants', checked)}
        />
      </div>

      {/* Section Contrat */}
      <motion.div 
        className={`${termsAccepted ? "bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/50" : "bg-muted/20 border border-border"} p-4 rounded-lg transition-all duration-300`}
        whileHover={{ scale: 1.01 }}
      >
        <div className="flex items-start space-x-3">
          <motion.div
            animate={{ scale: termsAccepted ? [1, 1.2, 1] : 1 }}
            transition={{ duration: 0.3 }}
          >
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={(checked) => {
                if (checked && !termsAccepted) {
                  handleOpenContract();
                } else {
                  setTermsAccepted(checked);
                }
              }}
              className="border-primary/50 data-[state=checked]:bg-primary mt-1"
              required
            />
          </motion.div>
          
          <div className="grid gap-1.5 leading-none flex-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor="terms"
                className="text-sm font-medium leading-none text-foreground"
              >
                J'accepte le contrat Organisateur *
              </label>
              <Button
                variant="link"
                size="sm"
                onClick={handleOpenContract}
                className="text-primary h-auto p-0 text-xs font-medium hover:scale-105 transition-transform"
              >
                <FileText className="w-3 h-3 mr-1" />
                Lire le contrat
                <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              En publiant cette tombola, vous acceptez de respecter le
              règlement et les conditions générales d'utilisation.
            </p>
            
            {termsAccepted && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 mt-2 text-xs text-green-600 bg-green-50 dark:bg-green-950/30 p-2 rounded border border-green-200 dark:border-green-800"
              >
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>
                  <strong>Contrat accepté</strong> - Vous avez accepté les conditions organisateur.
                </span>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Résumé */}
      <Card className="border-2 border-primary/20 overflow-hidden">
        <CardContent className="p-6">
          <h4 className="font-bold text-xl mb-4 text-center flex items-center justify-center gap-2">
            <CheckCheck className="w-5 h-5 text-primary" />
            Récapitulatif
          </h4>
          <div className="space-y-2 text-sm">
            {[
              { label: 'Titre', value: formData.title || 'Non défini' },
              { label: 'Date tirage', value: formData.drawDate ? new Date(formData.drawDate).toLocaleDateString('fr-FR') : 'Non définie' },
              { label: 'Prix ticket', value: `${calculatedPricePi} π` },
              { label: 'Total tickets', value: formData.totalTickets },
              { label: 'Objectif', value: formData.minTicketsRequired, highlight: true },
              { label: 'Revenu estimé', value: `${totalRevenuePi} π`, primary: true },
              { label: 'Lots', value: formData.prizes.length }
            ].map((item, index) => (
              <motion.div 
                key={index}
                className="flex justify-between"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <span className="text-muted-foreground">{item.label}:</span>
                <span className={`font-bold ${
                  item.highlight ? 'text-orange-600' : 
                  item.primary ? 'text-primary' : ''
                }`}>
                  {item.value}
                </span>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-dashed border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-purple-500/5">
          <CardContent className="p-8 text-center space-y-4">
            <motion.div 
              className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <CheckCircle className="w-8 h-8 text-green-600" />
            </motion.div>
            
            <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Prêt à publier ?
            </h3>
            
            <p className="text-muted-foreground max-w-md mx-auto">
              Votre tombola <strong className="text-primary">{formData.title}</strong> est prête.
            </p>

            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto text-left bg-background/50 p-4 rounded-lg backdrop-blur-sm">
              <div>
                <span className="text-xs text-muted-foreground block">Date tirage</span>
                <span className="font-medium">
                  {formData.drawDate
                    ? new Date(formData.drawDate).toLocaleDateString("fr-FR")
                    : "Non définie"}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Lieu</span>
                <span className="font-medium">
                  {formData.city || formData.isOnline ? "En ligne" : "Non défini"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="flex justify-between pt-4">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button variant="outline" onClick={() => setStep(4)}>
            <ArrowLeft className="mr-2 w-4 h-4" /> Précédent
          </Button>
        </motion.div>
        
        <motion.div 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            onClick={handleSubmit}
            disabled={loading || !termsAccepted}
            size="lg"
            className="px-8 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin mr-2 w-5 h-5" />
                Publication en cours...
              </>
            ) : (
              <>
                <Save className="mr-2 w-4 h-4" />
                Confirmer et Publier
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );

  const steps = [Step1, Step2, Step3, Step4, Step5];
  const progress = (step / 5) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 pb-20">
      <Helmet>
        <title>Créer une Tombola - BonPlanInfos</title>
        <meta
          name="description"
          content="Créez votre tombola et configurez vos lots et tickets"
        />
      </Helmet>

      <OrganizerContractModal 
        open={showContractModal} 
        onOpenChange={setShowContractModal} 
        onAccept={handleContractAccept}
        eventTitle={formData.title || "votre tombola"}
        eventId="new-event"
      />

      <main className="container mx-auto max-w-4xl px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)} 
            className="mb-4 hover:scale-105 transition-transform"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour
          </Button>

          <Card className="shadow-2xl border-none overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500" />
            
            <CardHeader className="border-b border-border/50 pb-6 bg-gradient-to-r from-primary/5 to-purple-500/5">
              <div className="flex items-center gap-3">
                <motion.div 
                  className="p-3 rounded-full bg-primary/10"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Ticket className="w-8 h-8 text-primary" />
                </motion.div>
                <div>
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                    Créer une Tombola
                  </CardTitle>
                  <CardDescription>
                    Configurez votre tombola, vos lots et vos tickets.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              <Tabs value={String(step)} onValueChange={(v) => setStep(parseInt(v))}>
                <div className="relative mb-8">
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-muted rounded-full" />
                  <motion.div
                    className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-primary to-purple-600 rounded-full"
                    initial={{ width: `${progress}%` }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                  
                  <TabsList className="grid w-full grid-cols-5 bg-transparent p-0">
                    {['Infos', 'Lieu', 'Tickets', 'Lots', 'Final'].map((label, index) => (
                      <TabsTrigger
                        key={index + 1}
                        value={String(index + 1)}
                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary text-xs md:text-sm font-medium border-b-2 border-transparent rounded-none pb-2 transition-all duration-300 hover:scale-105"
                      >
                        {index + 1}. {label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                <AnimatePresence mode="wait">
                  <TabsContent key={step} value={String(step)}>
                    {steps[step - 1]()}
                  </TabsContent>
                </AnimatePresence>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default CreateRaffleEventPage;