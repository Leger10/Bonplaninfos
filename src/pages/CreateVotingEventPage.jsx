import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/lib/customSupabaseClient";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Vote,
  Plus,
  Trash,
  Upload,
  X,
  ArrowRight,
  ArrowLeft,
  Image as ImageIcon,
  Layers,
  Users,
  Calendar,
  DollarSign,
  FileText,
  Clock,
  AlertTriangle,
  Globe,
  MapPin,
  Building,
  Map,
  CheckCircle,
  ChevronRight,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
// Import des données de pays depuis votre fichier
import { COUNTRIES, CITIES_BY_COUNTRY } from "@/constants/countries";
// Import du modal de contrat
import OrganizerContractModal from "@/components/organizer/OrganizerContractModal";

const CreateVotingEventPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [categoriesList, setCategoriesList] = useState([]); // Catégories depuis la base
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Contract Modal State (EXACTEMENT COMME DANS TICKETING)
  const [showContractModal, setShowContractModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [votePrice, setVotePrice] = useState(100); // FCFA default

  // Champs obligatoires pour events table - SAISIE LIBRE pour ville et lieu
  const [selectedCountry, setSelectedCountry] = useState("");
  const [city, setCity] = useState("");
  const [location, setLocation] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  // Dates (obligatoires: event_start_at, event_end_at)
  const [eventStartAt, setEventStartAt] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  });

  const [eventEndAt, setEventEndAt] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return new Date(nextWeek.getTime() - nextWeek.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  });

  // Période de vote (pour event_settings)
  const [votingStartDate, setVotingStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  });

  const [votingEndDate, setVotingEndDate] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return new Date(nextWeek.getTime() - nextWeek.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  });

  const [coverImage, setCoverImage] = useState(null);
  const [categories, setCategories] = useState(["Général"]);
  const [newCategory, setNewCategory] = useState("");

  // Candidates
  const [candidates, setCandidates] = useState([
    {
      id: uuidv4(),
      name: "",
      photo_url: "",
      description: "",
      category: "Général",
    },
  ]);

  // Suggestions de villes basées sur le pays sélectionné
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  // Contract handlers (EXACTEMENT COMME DANS TICKETING)
  const handleContractAccept = () => {
    setTermsAccepted(true);
    setShowContractModal(false);
    toast({
      title: "Contrat accepté",
      description: "Vous pouvez maintenant publier votre concours",
      className: "bg-green-600 text-white",
    });
  };

  const handleOpenContract = () => {
    setShowContractModal(true);
  };

  // Mettre à jour les suggestions de villes quand le pays change
  useEffect(() => {
    if (selectedCountry && CITIES_BY_COUNTRY[selectedCountry]) {
      setCitySuggestions(CITIES_BY_COUNTRY[selectedCountry]);
    } else {
      setCitySuggestions([]);
    }
  }, [selectedCountry]);

  // Filtrer les suggestions de villes basées sur la saisie
  const filteredCitySuggestions = citySuggestions.filter((cityName) =>
    cityName.toLowerCase().includes(city.toLowerCase()),
  );

  // Sélectionner une suggestion de ville
  const handleCitySelect = (selectedCity) => {
    setCity(selectedCity);
    setShowCitySuggestions(false);
  };

  // CHARGEMENT DES CATÉGORIES - ADAPTÉ DEPUIS CreateSimpleEventPage
  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        // Charger depuis event_categories comme dans CreateSimpleEventPage
        const { data, error } = await supabase
          .from("event_categories")
          .select("id, name")
          .eq("is_active", true)
          .order("name");

        if (error) throw error;

        if (data && data.length > 0) {
          setCategoriesList(data);
          // Sélectionner la première catégorie par défaut
          setSelectedCategoryId(data[0].id);
        } else {
          console.warn("Aucune catégorie disponible");
          toast({
            title: "Avertissement",
            description: "Aucune catégorie disponible",
            variant: "warning",
          });
        }
      } catch (error) {
        console.error("Erreur chargement catégories:", error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les catégories",
          variant: "destructive",
        });
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // Helper: Convert image to JPG (fixes WebP issues)
  const convertImageToJpg = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#FFFFFF"; // White background for transparency
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const newFile = new File(
                  [blob],
                  file.name.replace(/\.[^/.]+$/, "") + ".jpg",
                  { type: "image/jpeg" },
                );
                resolve(newFile);
              } else {
                reject(new Error("Conversion failed"));
              }
            },
            "image/jpeg",
            0.9,
          );
        };
        img.onerror = (err) => reject(err);
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (file, candidateId = null) => {
    if (!file) return;
    setUploadingImage(true);
    try {
      const convertedFile = await convertImageToJpg(file);
      const fileName = `${Date.now()}-${uuidv4()}.jpg`;
      const folder = candidateId ? "candidates" : "events";
      const filePath = `voting/${user.id}/${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(filePath, convertedFile);
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("media").getPublicUrl(filePath);

      if (candidateId) {
        setCandidates((prev) =>
          prev.map((c) =>
            c.id === candidateId ? { ...c, photo_url: publicUrl } : c,
          ),
        );
      } else {
        setCoverImage(publicUrl);
      }
      toast({
        title: "Image téléchargée",
        description: "Format converti et sauvegardé.",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Erreur upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      setCategories([...categories, newCategory.trim()]);
      setNewCategory("");
    }
  };

  const handleRemoveCategory = (catToRemove) => {
    if (catToRemove === "Général") return;
    setCategories(categories.filter((c) => c !== catToRemove));
    setCandidates((prev) =>
      prev.map((c) =>
        c.category === catToRemove ? { ...c, category: "Général" } : c,
      ),
    );
  };

  const validateForm = () => {
    // Validation des champs obligatoires
    const missingFields = [];

    if (!title.trim()) missingFields.push("Titre");
    if (!selectedCountry.trim()) missingFields.push("Pays");
    if (!city.trim()) missingFields.push("Ville");
    if (!eventStartAt) missingFields.push("Date de début");
    if (!eventEndAt) missingFields.push("Date de fin");
    if (!coverImage) missingFields.push("Image de couverture");
    if (!selectedCategoryId) missingFields.push("Catégorie principale");
    if (candidates.some((c) => !c.name.trim()))
      missingFields.push("Nom des candidats");

    if (missingFields.length > 0) {
      toast({
        title: "Champs obligatoires manquants",
        description: `Veuillez remplir: ${missingFields.join(", ")}`,
        variant: "destructive",
      });
      return false;
    }

    // Validation des dates
    const now = new Date();
    const start = new Date(eventStartAt);
    const end = new Date(eventEndAt);
    const voteStart = new Date(votingStartDate);
    const voteEnd = new Date(votingEndDate);

    if (end <= now) {
      toast({
        title: "Date invalide",
        description: "La fin de l'événement doit être dans le futur.",
        variant: "destructive",
      });
      return false;
    }

    if (end <= start) {
      toast({
        title: "Date invalide",
        description: "La fin de l'événement doit être après le début.",
        variant: "destructive",
      });
      return false;
    }

    if (voteEnd <= voteStart) {
      toast({
        title: "Date invalide",
        description: "La fin des votes ne peut pas être antérieure au début.",
        variant: "destructive",
      });
      return false;
    }

    // Vérifier que la période de vote est dans la période de l'événement
    if (voteStart < start || voteEnd > end) {
      toast({
        title: "Période de vote invalide",
        description:
          "Les votes doivent avoir lieu pendant la période de l'événement.",
        variant: "destructive",
      });
      return false;
    }

    if (!termsAccepted) {
      toast({
        title: "Contrat requis",
        description:
          "Veuillez lire et accepter le contrat organisateur avant de publier.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const performSubmission = async () => {
    // VALIDATIONS POUR ÉVITER L'ERREUR UUID
    if (!user) {
      toast({
        title: "Non connecté",
        description: "Veuillez vous connecter pour créer un événement.",
        variant: "destructive",
      });
      return;
    }

    // Vérifier que le contrat est accepté (COMME DANS TICKETING)
    if (!termsAccepted) {
      toast({
        title: "Contrat requis",
        description:
          "Veuillez lire et accepter le contrat organisateur avant de publier.",
        variant: "destructive",
      });
      setShowContractModal(true);
      return;
    }

    // Vérification CRITIQUE : Vérifier que user.id est un UUID valide
    if (!user.id || typeof user.id !== "string" || user.id.trim() === "") {
      console.error("User ID invalide:", user.id);
      toast({
        title: "Erreur utilisateur",
        description: "ID utilisateur invalide. Veuillez vous reconnecter.",
        variant: "destructive",
      });
      return;
    }

    // Vérifier que selectedCategoryId est valide
    if (!selectedCategoryId || selectedCategoryId.trim() === "") {
      console.error("Category ID invalide:", selectedCategoryId);
      toast({
        title: "Catégorie invalide",
        description: "Veuillez sélectionner une catégorie valide.",
        variant: "destructive",
      });
      return;
    }

    if (!validateForm()) return;

    setLoading(true);
    try {
      // Préparer les dates
      const eventStart = new Date(eventStartAt);
      const eventEnd = new Date(eventEndAt);
      const votingStart = new Date(votingStartDate);
      const votingEnd = new Date(votingEndDate);

      // Trouver le nom du pays à partir du code
      const countryObj = COUNTRIES.find((c) => c.code === selectedCountry);
      const countryName = countryObj ? countryObj.name : selectedCountry;

      // 1. Create Event Record (table events)
      const eventData = {
        // Champs obligatoires
        title,
        city,
        country: countryName,
        event_start_at: eventStart.toISOString(),
        event_end_at: eventEnd.toISOString(),

        // Champs optionnels mais importants
        description,
        organizer_id: user.id,
        event_type: "voting",
        status: "active",
        cover_image: coverImage,
        cover_image_url: coverImage,
        location: location || `${city}, ${countryName}`,

        // Catégorie - IMPORTANT: utiliser category_id pour correspondre à votre schéma
        category_id: selectedCategoryId,

        // Tags personnalisés
        tags: categories,

        // Paramètres par défaut
        is_active: true,
        is_online: !location,
        is_public: true,
        is_promoted: false,
        price_fcfa: votePrice,
        price_pi: Math.ceil(votePrice / 10),
        views_count: 0,
        interactions_count: 0,
        participants_count: 0,
        promotion_views_count: 0,
        requires_approval: false,
        max_attendees: 0,
        max_participants: 0,
        allows_reentry: false,
        is_sales_closed: false,

        // Contrat (COMME DANS TICKETING)
        contract_accepted_at: new Date().toISOString(),
        contract_version: "v1.0",

        // Géolocalisation
        latitude: null,
        longitude: null,
        full_address: location,
        google_maps_link: null,
        google_place_id: null,
        location_instructions: null,

        // Autres champs optionnels
        contact_phone: null,
        address: location,
        geocoding_status: null,
        geocoding_attempts: 0,
      };

      console.log("Création événement avec:", eventData);

      const { data: event, error: eventError } = await supabase
        .from("events")
        .insert(eventData)
        .select()
        .single();

      if (eventError) {
        console.error("Erreur création événement:", eventError);
        throw new Error(`Erreur création événement: ${eventError.message}`);
      }

      // Sauvegarder l'acceptation du contrat dans la table dédiée (COMME DANS TICKETING)
      await supabase.from("user_contract_acceptances").insert({
        user_id: user.id,
        event_id: event.id,
        contract_type: "organizer",
        accepted_at: new Date().toISOString(),
        contract_version: "v1.0",
      });

      // 2. Create Event Settings (Specific Voting Logic)
      const { error: settingsError } = await supabase
        .from("event_settings")
        .insert({
          event_id: event.id,
          vote_price_fcfa: votePrice,
          vote_price_pi: Math.ceil(votePrice / 10),
          voting_enabled: true,
          start_date: votingStart.toISOString(),
          end_date: votingEnd.toISOString(),
          organizer_rate: 95,
          commission_rate: 5,
          max_votes_per_user: 0, // 0 = illimité
          allow_multiple_votes: true,
        });

      if (settingsError) {
        console.error("Erreur création settings:", settingsError);
        // Continuer quand même, l'événement est créé
      }

      // 3. Create Candidates
      const candidatesData = candidates.map((c) => ({
        event_id: event.id,
        name: c.name,
        description: c.description,
        photo_url: c.photo_url || null,
        vote_count: 0,
        category: c.category || "Général",
      }));

      const { error: candError } = await supabase
        .from("candidates")
        .insert(candidatesData);
      if (candError) {
        console.error("Erreur création candidats:", candError);
        // L'événement est créé mais pas les candidats
        toast({
          title: "Attention",
          description:
            "Événement créé mais erreur avec les candidats. Veuillez les ajouter manuellement.",
          variant: "warning",
        });
      }

      toast({
        title: "🎉 Concours créé avec succès !",
        description: "Votre concours est maintenant en ligne.",
        className: "bg-gradient-to-r from-green-600 to-emerald-600 text-white",
      });

      // Rediriger vers la page de l'événement
      navigate(`/event/${event.id}`);
    } catch (error) {
      console.error("Erreur complète:", error);
      toast({
        title: "❌ Erreur",
        description:
          error.message ||
          "Impossible de créer l'événement. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 1, title: "Détails", icon: FileText },
    { id: 2, title: "Configuration", icon: Layers },
    { id: 3, title: "Candidats", icon: Users },
  ];

  const progress = (step / steps.length) * 100;

  return (
    <div className="min-h-screen bg-black text-white py-8 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Créer un vote - BonPlanInfos</title>
      </Helmet>

      {/* Contract Modal (EXACTEMENT COMME DANS TICKETING) */}
      <OrganizerContractModal
        open={showContractModal}
        onOpenChange={setShowContractModal}
        onAccept={handleContractAccept}
        eventTitle={title || "votre concours"}
        eventId="new-event"
      />

      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">
            Créer un Concours
          </h1>
          <p className="text-gray-400">
            Configurez votre événement, définissez des catégories et ajoutez vos
            candidats.
          </p>
        </div>

        <div className="mb-8">
          <div className="flex justify-between mb-4">
            {steps.map((s) => (
              <div
                key={s.id}
                className={`flex flex-col items-center ${step >= s.id ? "text-emerald-500" : "text-gray-600"}`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 mb-2 transition-colors ${step >= s.id ? "border-emerald-500 bg-emerald-950" : "border-gray-700 bg-gray-900"}`}
                >
                  <s.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium uppercase tracking-wider">
                  {s.title}
                </span>
              </div>
            ))}
          </div>
          <Progress
            value={progress}
            className="h-1 bg-gray-800"
            indicatorClassName="bg-emerald-500"
          />
        </div>

        <Card className="border-0 bg-gray-900 shadow-xl ring-1 ring-white/10">
          <CardContent className="p-6 sm:p-8">
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-gray-300">
                        Titre de l'événement{" "}
                        <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="title"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Ex: Awards de la Musique 2025"
                          className="pl-10 bg-gray-950 border-gray-800 text-white placeholder:text-gray-600 focus:ring-emerald-500 focus:border-emerald-500 h-12"
                          required
                        />
                        <Vote className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="desc" className="text-gray-300">
                        Description
                      </Label>
                      <Textarea
                        id="desc"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Décrivez le but du concours..."
                        className="min-h-[120px] bg-gray-950 border-gray-800 text-white placeholder:text-gray-600 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="price" className="text-gray-300">
                        Prix du vote (FCFA)
                      </Label>
                      <div className="relative">
                        <Input
                          id="price"
                          type="number"
                          value={votePrice}
                          onChange={(e) => setVotePrice(Number(e.target.value))}
                          min="100"
                          step="50"
                          className="pl-10 bg-gray-950 border-gray-800 text-white placeholder:text-gray-600 focus:ring-emerald-500"
                        />
                        <DollarSign className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                      </div>
                      <p className="text-xs text-emerald-400 font-mono">
                        ≈ {Math.ceil(votePrice / 10)} pièces
                      </p>
                    </div>

                    {/* Catégorie principale - ADAPTÉ */}
                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-gray-300">
                        Catégorie <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={selectedCategoryId || ""}
                        onValueChange={setSelectedCategoryId}
                        disabled={loadingCategories}
                      >
                        <SelectTrigger className="bg-gray-950 border-gray-800 text-white">
                          <SelectValue
                            placeholder={
                              loadingCategories
                                ? "Chargement des catégories..."
                                : "Sélectionner une catégorie"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-800 text-white max-h-60">
                          {categoriesList.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {loadingCategories && (
                        <p className="text-xs text-gray-500 flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin" />{" "}
                          Chargement des catégories...
                        </p>
                      )}
                      {!loadingCategories && categoriesList.length === 0 && (
                        <p className="text-xs text-yellow-500">
                          Aucune catégorie disponible. Contactez
                          l'administrateur.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-gray-300">
                        Image de couverture{" "}
                        <span className="text-red-500">*</span>
                      </Label>
                      <div
                        className={`border-2 border-dashed rounded-xl h-48 flex flex-col items-center justify-center p-4 transition-all ${coverImage ? "border-emerald-500/50 bg-emerald-950/10" : "border-gray-800 hover:border-gray-600 bg-gray-950"}`}
                      >
                        {coverImage ? (
                          <div className="relative w-full h-full group">
                            <img
                              src={coverImage}
                              alt="Cover"
                              className="w-full h-full object-cover rounded-lg shadow-sm"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                              <Button
                                variant="secondary"
                                size="sm"
                                className="pointer-events-none"
                              >
                                Changer l'image
                              </Button>
                            </div>
                            <Input
                              type="file"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              accept="image/*"
                              onChange={(e) =>
                                e.target.files[0] &&
                                handleImageUpload(e.target.files[0])
                              }
                              disabled={uploadingImage}
                            />
                          </div>
                        ) : (
                          <div className="text-center relative w-full h-full flex flex-col items-center justify-center">
                            {uploadingImage ? (
                              <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-2" />
                            ) : (
                              <>
                                <ImageIcon className="w-10 h-10 text-gray-600 mb-2" />
                                <p className="text-sm font-medium text-gray-400">
                                  Cliquez pour ajouter une image
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                  JPG, PNG (Max 5MB)
                                </p>
                              </>
                            )}
                            <Input
                              type="file"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              accept="image/*"
                              onChange={(e) =>
                                e.target.files[0] &&
                                handleImageUpload(e.target.files[0])
                              }
                              disabled={uploadingImage}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Localisation */}
                    <div className="space-y-4 pt-4 border-t border-gray-800">
                      <h4 className="font-semibold text-emerald-400 flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> Localisation
                      </h4>

                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="country" className="text-gray-300">
                            Pays <span className="text-red-500">*</span>
                          </Label>
                          <Select
                            value={selectedCountry}
                            onValueChange={(value) => {
                              setSelectedCountry(value);
                              setCity(""); // Réinitialiser la ville quand le pays change
                            }}
                          >
                            <SelectTrigger className="bg-gray-950 border-gray-800 text-white">
                              <SelectValue placeholder="Sélectionner un pays" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-gray-800 text-white max-h-60">
                              {COUNTRIES.map((country) => (
                                <SelectItem
                                  key={country.code}
                                  value={country.code}
                                >
                                  {country.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2 relative">
                          <Label htmlFor="city" className="text-gray-300">
                            Ville <span className="text-red-500">*</span>
                          </Label>
                          <div className="relative">
                            <Input
                              id="city"
                              value={city}
                              onChange={(e) => {
                                setCity(e.target.value);
                                setShowCitySuggestions(true);
                              }}
                              onFocus={() => setShowCitySuggestions(true)}
                              placeholder={
                                selectedCountry
                                  ? `Saisissez la ville (ex: ${CITIES_BY_COUNTRY[selectedCountry]?.[0] || "Abidjan"})`
                                  : "Sélectionnez d'abord un pays"
                              }
                              className="bg-gray-950 border-gray-800 text-white pl-10"
                              disabled={!selectedCountry}
                              required
                            />
                            <Building className="absolute left-3 top-3 w-4 h-4 text-gray-500" />

                            {/* Suggestions de villes */}
                            {showCitySuggestions &&
                              city &&
                              filteredCitySuggestions.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                  {filteredCitySuggestions
                                    .slice(0, 10)
                                    .map((cityName, index) => (
                                      <button
                                        key={index}
                                        type="button"
                                        className="w-full text-left px-4 py-2 hover:bg-gray-800 text-white text-sm flex items-center gap-2"
                                        onClick={() =>
                                          handleCitySelect(cityName)
                                        }
                                      >
                                        <MapPin className="w-3 h-3 text-gray-400" />
                                        {cityName}
                                      </button>
                                    ))}
                                </div>
                              )}
                          </div>
                          {selectedCountry &&
                            CITIES_BY_COUNTRY[selectedCountry] && (
                              <p className="text-xs text-gray-500 mt-1">
                                Suggestions:{" "}
                                {CITIES_BY_COUNTRY[selectedCountry]
                                  .slice(0, 3)
                                  .join(", ")}
                                ...
                              </p>
                            )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="location" className="text-gray-300">
                            Lieu de la cérémonie (Optionnel)
                          </Label>
                          <div className="relative">
                            <Input
                              id="location"
                              value={location}
                              onChange={(e) => setLocation(e.target.value)}
                              placeholder="Ex: Palais de la Culture, Salle des Fêtes, Terrain de..."
                              className="bg-gray-950 border-gray-800 text-white pl-10"
                            />
                            <Map className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                          </div>
                          <p className="text-xs text-gray-500">
                            Précisez l'adresse ou le nom exact du lieu. Laissez
                            vide pour un événement en ligne.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 max-w-2xl mx-auto">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-white">
                    Configuration des dates
                  </h3>
                  <p className="text-sm text-gray-400">
                    Définissez les périodes de votre événement
                  </p>
                </div>

                {/* Période de l'événement (obligatoire) */}
                <div className="space-y-4">
                  <div className="bg-gray-950/50 p-4 rounded-lg border border-gray-800">
                    <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-400" />
                      Période de l'événement{" "}
                      <span className="text-red-500">*</span>
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="eventStartAt" className="text-gray-300">
                          Date de début
                        </Label>
                        <Input
                          id="eventStartAt"
                          type="datetime-local"
                          value={eventStartAt}
                          onChange={(e) => setEventStartAt(e.target.value)}
                          className="bg-gray-900 border-gray-700 text-white [&::-webkit-calendar-picker-indicator]:invert"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="eventEndAt" className="text-gray-300">
                          Date de fin
                        </Label>
                        <Input
                          id="eventEndAt"
                          type="datetime-local"
                          value={eventEndAt}
                          onChange={(e) => setEventEndAt(e.target.value)}
                          className="bg-gray-900 border-gray-700 text-white [&::-webkit-calendar-picker-indicator]:invert"
                          required
                        />
                      </div>
                    </div>

                    {new Date(eventEndAt) <= new Date(eventStartAt) && (
                      <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/20 p-2 rounded border border-red-900/50 mt-3">
                        <AlertTriangle className="w-4 h-4" /> La date de fin
                        doit être après la date de début
                      </div>
                    )}
                  </div>

                  {/* Période de vote */}
                  <div className="bg-gray-950/50 p-4 rounded-lg border border-gray-800">
                    <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-purple-400" />
                      Période de vote
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="votingStart" className="text-gray-300">
                          Début des votes
                        </Label>
                        <Input
                          id="votingStart"
                          type="datetime-local"
                          value={votingStartDate}
                          onChange={(e) => setVotingStartDate(e.target.value)}
                          className="bg-gray-900 border-gray-700 text-white [&::-webkit-calendar-picker-indicator]:invert"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="votingEnd" className="text-gray-300">
                          Fin des votes
                        </Label>
                        <Input
                          id="votingEnd"
                          type="datetime-local"
                          value={votingEndDate}
                          onChange={(e) => setVotingEndDate(e.target.value)}
                          className="bg-gray-900 border-gray-700 text-white [&::-webkit-calendar-picker-indicator]:invert"
                        />
                      </div>
                    </div>

                    {new Date(votingEndDate) <= new Date(votingStartDate) && (
                      <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/20 p-2 rounded border border-red-900/50 mt-3">
                        <AlertTriangle className="w-4 h-4" /> La fin des votes
                        doit être après le début
                      </div>
                    )}

                    <div className="mt-3 p-3 bg-blue-950/20 border border-blue-900/30 rounded text-sm text-blue-300">
                      <div className="flex items-center gap-2 mb-1">
                        <Globe className="w-4 h-4" />
                        <span className="font-medium">Information</span>
                      </div>
                      <p className="text-xs">
                        La période de vote doit être incluse dans la période de
                        l'événement.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Catégories personnalisées */}
                <div className="space-y-4 pt-6">
                  <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    Catégories des candidats
                  </h4>

                  <div className="flex gap-2">
                    <Input
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="Nom de la catégorie (ex: Meilleur Acteur)"
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleAddCategory()
                      }
                      className="bg-gray-950 border-gray-800 text-white focus:ring-emerald-500"
                    />
                    <Button
                      onClick={handleAddCategory}
                      disabled={!newCategory.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Ajouter
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    {categories.map((cat, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-gray-950 border border-gray-800 rounded-lg shadow-sm group hover:border-gray-700 transition-colors"
                      >
                        <span className="font-medium text-gray-200">{cat}</span>
                        {cat !== "Général" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-500 hover:text-red-400 hover:bg-red-950/20"
                            onClick={() => handleRemoveCategory(cat)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  {categories.length === 1 && (
                    <div className="bg-blue-950/30 border border-blue-900/50 p-4 rounded-lg text-blue-300 text-sm flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      Si vous n'ajoutez pas de catégories, tous les candidats
                      seront dans "Général".
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-white">
                    Ajouter les Candidats
                  </h3>
                  <p className="text-sm text-gray-400">
                    Ajoutez tous les candidats qui participeront au concours
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {candidates.map((c, idx) => (
                    <Card
                      key={c.id}
                      className="overflow-hidden border-l-4 border-l-emerald-500 bg-gray-950 border-y-gray-800 border-r-gray-800 relative group hover:bg-gray-900 transition-colors"
                    >
                      <CardContent className="p-4">
                        <div className="flex gap-4 items-start">
                          <div className="w-24 h-24 bg-gray-900 rounded-lg flex-shrink-0 relative overflow-hidden border-2 border-dashed border-gray-700 group-hover:border-emerald-500/50 transition-all">
                            {c.photo_url ? (
                              <img
                                src={c.photo_url}
                                alt={c.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 bg-gray-800/50 group-hover:bg-gray-800 transition-colors">
                                <Upload className="w-6 h-6 mb-1 text-gray-500 group-hover:text-emerald-400 transition-colors" />
                                <span className="text-[10px] font-medium text-gray-500 group-hover:text-emerald-400 text-center px-1">
                                  Ajouter photo
                                </span>
                              </div>
                            )}
                            <Input
                              type="file"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                              accept="image/*"
                              onChange={(e) =>
                                e.target.files[0] &&
                                handleImageUpload(e.target.files[0], c.id)
                              }
                              disabled={uploadingImage}
                              title="Cliquez pour ajouter une photo"
                            />

                            {/* Indicateur visuel pour attirer l'attention */}
                            {!c.photo_url && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                            )}

                            {uploadingImage && (
                              <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20">
                                <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 space-y-3">
                            <Input
                              placeholder="Nom du candidat *"
                              value={c.name}
                              onChange={(e) =>
                                setCandidates((prev) =>
                                  prev.map((item) =>
                                    item.id === c.id
                                      ? { ...item, name: e.target.value }
                                      : item,
                                  ),
                                )
                              }
                              className="font-semibold bg-black/20 border-gray-800 text-white placeholder:text-gray-600 focus:ring-emerald-500"
                              required
                            />

                            <Select
                              value={c.category}
                              onValueChange={(val) =>
                                setCandidates((prev) =>
                                  prev.map((item) =>
                                    item.id === c.id
                                      ? { ...item, category: val }
                                      : item,
                                  ),
                                )
                              }
                            >
                              <SelectTrigger className="h-8 text-sm bg-black/20 border-gray-800 text-gray-300">
                                <SelectValue placeholder="Catégorie" />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-900 border-gray-800 text-white max-h-60">
                                {categories.map((cat) => (
                                  <SelectItem
                                    key={cat}
                                    value={cat}
                                    className="focus:bg-gray-800 focus:text-emerald-400"
                                  >
                                    {cat}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Textarea
                              placeholder="Courte biographie..."
                              value={c.description}
                              onChange={(e) =>
                                setCandidates((prev) =>
                                  prev.map((item) =>
                                    item.id === c.id
                                      ? { ...item, description: e.target.value }
                                      : item,
                                  ),
                                )
                              }
                              className="h-16 text-xs resize-none bg-black/20 border-gray-800 text-white placeholder:text-gray-600 focus:ring-emerald-500"
                            />
                          </div>
                        </div>
                      </CardContent>
                      {candidates.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 text-gray-600 hover:text-red-400 hover:bg-red-950/20"
                          onClick={() =>
                            setCandidates((prev) =>
                              prev.filter((item) => item.id !== c.id),
                            )
                          }
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      )}
                    </Card>
                  ))}

                  <Button
                    variant="outline"
                    className="h-full min-h-[200px] border-dashed border-2 border-gray-800 bg-transparent text-gray-500 flex flex-col gap-2 hover:border-emerald-500/50 hover:text-emerald-500 hover:bg-emerald-950/10 transition-all"
                    onClick={() =>
                      setCandidates((prev) => [
                        ...prev,
                        {
                          id: uuidv4(),
                          name: "",
                          photo_url: "",
                          description: "",
                          category: categories[0] || "Général",
                        },
                      ])
                    }
                  >
                    <Plus className="w-8 h-8" />
                    <span>Ajouter un candidat</span>
                  </Button>
                </div>

                {/* Message d'information pour les photos */}
                <div className="bg-blue-950/30 border border-blue-900/50 p-4 rounded-lg text-blue-300 text-sm flex items-center gap-3">
                  <div className="p-2 bg-blue-900/30 rounded-full">
                    <Upload className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium mb-1">📸 Photos des candidats</p>
                    <p className="text-xs text-blue-400/80">
                      Cliquez sur le cadre "
                      <span className="font-bold text-emerald-400">
                        Ajouter photo
                      </span>
                      " pour télécharger une photo. Un point vert clignotant
                      vous indique les photos manquantes.
                    </p>
                  </div>
                </div>

                {/* Contract Acceptance Section with Modal Trigger - EXACTEMENT COMME DANS TICKETING */}
                <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-lg mt-6">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="terms"
                      checked={termsAccepted}
                      onCheckedChange={(checked) => {
                        if (checked && !termsAccepted) {
                          // Si on veut cocher, on ouvre d'abord le modal
                          handleOpenContract();
                        } else {
                          // Si on veut décocher, on peut le faire directement
                          setTermsAccepted(checked);
                        }
                      }}
                      className="border-gray-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 mt-1"
                      required
                    />
                    <div className="grid gap-1.5 leading-none flex-1">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="terms"
                          className="text-sm font-medium leading-none text-gray-300 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          J'accepte le contrat Organisateur{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <Button
                          variant="link"
                          size="sm"
                          onClick={handleOpenContract}
                          className="text-emerald-400 h-auto p-0 text-xs font-medium hover:text-emerald-300"
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          Lire le contrat
                          <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">
                        En publiant ce concours, vous acceptez les conditions de
                        service et le règlement de la plateforme.
                      </p>

                      {/* Contract Status Indicator */}
                      {termsAccepted && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-green-400 bg-green-950/30 p-2 rounded border border-green-900/50">
                          <CheckCircle className="w-4 h-4 flex-shrink-0" />
                          <span>
                            <strong>Contrat accepté</strong> - Vous avez accepté
                            les conditions organisateur.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Validation finale */}
                <div className="bg-gray-900/30 border border-gray-700 rounded-lg p-4 mt-6">
                  <h4 className="font-semibold text-white mb-3">
                    Validation finale
                  </h4>
                  <div className="space-y-2 text-sm text-gray-300">
                    <div className="flex items-center justify-between">
                      <span>Titre de l'événement:</span>
                      <span
                        className={`font-medium ${title ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {title ? "✓ Rempli" : "✗ Requis"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Pays:</span>
                      <span
                        className={`font-medium ${selectedCountry ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {selectedCountry ? "✓ Sélectionné" : "✗ Requis"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Ville:</span>
                      <span
                        className={`font-medium ${city ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {city ? "✓ Rempli" : "✗ Requis"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Catégorie principale:</span>
                      <span
                        className={`font-medium ${selectedCategoryId ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {selectedCategoryId ? "✓ Sélectionnée" : "✗ Requis"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Dates de l'événement:</span>
                      <span
                        className={`font-medium ${eventStartAt && eventEndAt ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {eventStartAt && eventEndAt ? "✓ Rempli" : "✗ Requis"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Image de couverture:</span>
                      <span
                        className={`font-medium ${coverImage ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {coverImage ? "✓ Rempli" : "✗ Requis"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Candidats ({candidates.length}):</span>
                      <span
                        className={`font-medium ${candidates.length > 0 && !candidates.some((c) => !c.name.trim()) ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {candidates.length > 0 &&
                        !candidates.some((c) => !c.name.trim())
                          ? "✓ Valides"
                          : "✗ Vérifiez"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                      <span className="font-semibold">Contrat:</span>
                      <span
                        className={`font-medium ${termsAccepted ? "text-emerald-400" : "text-yellow-500"}`}
                      >
                        {termsAccepted ? "✓ Accepté" : "⏳ En attente"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between border-t border-gray-800 bg-gray-950 p-6 rounded-b-xl">
            <Button
              variant="outline"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1 || loading}
              className="border-gray-700 bg-transparent text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Retour
            </Button>

            {step < 3 ? (
              <Button
                onClick={() => setStep(Math.min(3, step + 1))}
                className="bg-gray-100 text-black hover:bg-white"
              >
                Suivant <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[150px] shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={performSubmission}
                disabled={
                  loading ||
                  uploadingImage ||
                  !termsAccepted ||
                  !selectedCategoryId
                }
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Publication...
                  </>
                ) : (
                  <>
                    <Vote className="w-4 h-4 mr-2" />
                    Publier le Concours
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default CreateVotingEventPage;
