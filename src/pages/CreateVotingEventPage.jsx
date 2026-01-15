import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Vote, Plus, Trash, Upload, X, ArrowRight, ArrowLeft, Image as ImageIcon, Layers, Users, Calendar, DollarSign, FileText, Clock, AlertTriangle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';

const CreateVotingEventPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Terms Acceptance State
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Form State - Dates
  // Date de l'événement physique (Cérémonie, Gala, etc.)
  const [eventDate, setEventDate] = useState(''); 
  
  // Période de vote
  const [votingStartDate, setVotingStartDate] = useState(() => {
    const now = new Date();
    // Format local datetime-local: YYYY-MM-DDTHH:mm
    return new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
  });
  
  const [votingEndDate, setVotingEndDate] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return new Date(nextWeek.getTime() - (nextWeek.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
  });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [votePrice, setVotePrice] = useState(100); // FCFA default
  const [coverImage, setCoverImage] = useState(null);
  const [categories, setCategories] = useState(['Général']);
  const [newCategory, setNewCategory] = useState('');

  // Candidates
  const [candidates, setCandidates] = useState([
    { id: uuidv4(), name: '', photo_url: '', description: '', category: 'Général' }
  ]);

  // Helper: Convert image to JPG (fixes WebP issues)
  const convertImageToJpg = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#FFFFFF'; // White background for transparency
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) {
              const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: "image/jpeg" });
              resolve(newFile);
            } else {
              reject(new Error("Conversion failed"));
            }
          }, 'image/jpeg', 0.9);
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
      const folder = candidateId ? 'candidates' : 'events';
      const filePath = `voting/${user.id}/${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('media').upload(filePath, convertedFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);

      if (candidateId) {
        setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, photo_url: publicUrl } : c));
      } else {
        setCoverImage(publicUrl);
      }
      toast({ title: "Image téléchargée", description: "Format converti et sauvegardé." });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Erreur upload", description: error.message, variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      setCategories([...categories, newCategory.trim()]);
      setNewCategory('');
    }
  };

  const handleRemoveCategory = (catToRemove) => {
    if (catToRemove === 'Général') return;
    setCategories(categories.filter(c => c !== catToRemove));
    setCandidates(prev => prev.map(c => c.category === catToRemove ? { ...c, category: 'Général' } : c));
  };

  const validateDates = () => {
    const now = new Date();
    const start = new Date(votingStartDate);
    const end = new Date(votingEndDate);
    const event = eventDate ? new Date(eventDate) : null;

    if (end <= now) {
      toast({ title: "Date invalide", description: "La fin des votes doit être dans le futur.", variant: "destructive" });
      return false;
    }

    if (end < start) {
      toast({ title: "Date invalide", description: "La fin des votes ne peut pas être antérieure au début.", variant: "destructive" });
      return false;
    }

    return true;
  };

  const performSubmission = async () => {
    if (!user) return;
    if (!title || !coverImage || candidates.some(c => !c.name)) {
      toast({ title: "Champs manquants", description: "Veuillez remplir tous les champs obligatoires (*)", variant: "destructive" });
      return;
    }
    
    if (!termsAccepted) {
        toast({ title: "Conditions non acceptées", description: "Veuillez accepter les conditions pour continuer.", variant: "destructive" });
        return;
    }

    if (!validateDates()) return;

    setLoading(true);
    try {
      // 1. Create Event Record
      const { data: event, error: eventError } = await supabase.from('events').insert({
        title,
        description,
        organizer_id: user.id,
        event_type: 'voting',
        status: 'active',
        cover_image: coverImage,
        cover_image_url: coverImage,
        // Main event date (Ceremony) or fallback to voting end
        event_date: eventDate ? new Date(eventDate).toISOString() : new Date(votingEndDate).toISOString(),
        // End date governs the global "Active/Finished" status
        end_date: new Date(votingEndDate).toISOString(), 
        city: 'Online',
        country: 'Global',
        tags: categories,
        contract_accepted_at: new Date().toISOString(),
        contract_version: 'v1.0'
      }).select().single();

      if (eventError) throw eventError;

      const pricePi = Math.ceil(votePrice / 10);
      
      // 2. Create Event Settings (Specific Voting Logic)
      const { error: settingsError } = await supabase.from('event_settings').insert({
        event_id: event.id,
        vote_price_fcfa: votePrice,
        vote_price_pi: pricePi,
        voting_enabled: true,
        // Specific voting period
        start_date: new Date(votingStartDate).toISOString(),
        end_date: new Date(votingEndDate).toISOString(),
        organizer_rate: 95,
        commission_rate: 5
      });

      if (settingsError) throw settingsError;

      const candidatesData = candidates.map(c => ({
        event_id: event.id,
        name: c.name,
        description: c.description,
        photo_url: c.photo_url || null,
        vote_count: 0,
        category: c.category || 'Général'
      }));

      const { error: candError } = await supabase.from('candidates').insert(candidatesData);
      if (candError) throw candError;

      toast({ title: "Concours créé avec succès !", className: "bg-green-600 text-white" });
      navigate(`/event/${event.id}`);

    } catch (error) {
      console.error(error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 1, title: "Détails", icon: FileText },
    { id: 2, title: "Catégories", icon: Layers },
    { id: 3, title: "Candidats", icon: Users }
  ];

  const progress = (step / steps.length) * 100;

  return (
    <div className="min-h-screen bg-black text-white py-8 px-4 sm:px-6 lg:px-8">
      <Helmet><title>Créer un vote - BonPlanInfos</title></Helmet>

      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Créer un Concours</h1>
          <p className="text-gray-400">Configurez votre événement, définissez des catégories et ajoutez vos candidats.</p>
        </div>

        <div className="mb-8">
          <div className="flex justify-between mb-4">
            {steps.map((s) => (
              <div key={s.id} className={`flex flex-col items-center ${step >= s.id ? 'text-emerald-500' : 'text-gray-600'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 mb-2 transition-colors ${step >= s.id ? 'border-emerald-500 bg-emerald-950' : 'border-gray-700 bg-gray-900'}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium uppercase tracking-wider">{s.title}</span>
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-1 bg-gray-800" indicatorClassName="bg-emerald-500" />
        </div>

        <Card className="border-0 bg-gray-900 shadow-xl ring-1 ring-white/10">
          <CardContent className="p-6 sm:p-8">
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-gray-300">Titre de l'événement <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <Input
                          id="title"
                          value={title}
                          onChange={e => setTitle(e.target.value)}
                          placeholder="Ex: Awards de la Musique 2024"
                          className="pl-10 bg-gray-950 border-gray-800 text-white placeholder:text-gray-600 focus:ring-emerald-500 focus:border-emerald-500 h-12"
                        />
                        <Vote className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="desc" className="text-gray-300">Description</Label>
                      <Textarea
                        id="desc"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Décrivez le but du concours..."
                        className="min-h-[120px] bg-gray-950 border-gray-800 text-white placeholder:text-gray-600 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="price" className="text-gray-300">Prix du vote (FCFA)</Label>
                      <div className="relative">
                        <Input
                          id="price"
                          type="number"
                          value={votePrice}
                          onChange={e => setVotePrice(Number(e.target.value))}
                          min="0"
                          className="pl-10 bg-gray-950 border-gray-800 text-white placeholder:text-gray-600 focus:ring-emerald-500"
                        />
                        <DollarSign className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                      </div>
                      <p className="text-xs text-emerald-400 font-mono">≈ {Math.ceil(votePrice / 10)} pièces</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-gray-300">Image de couverture <span className="text-red-500">*</span></Label>
                      <div className={`border-2 border-dashed rounded-xl h-48 flex flex-col items-center justify-center p-4 transition-all ${coverImage ? 'border-emerald-500/50 bg-emerald-950/10' : 'border-gray-800 hover:border-gray-600 bg-gray-950'}`}>
                        {coverImage ? (
                          <div className="relative w-full h-full group">
                            <img src={coverImage} alt="Cover" className="w-full h-full object-cover rounded-lg shadow-sm" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                              <Button variant="secondary" size="sm" className="pointer-events-none">Changer l'image</Button>
                            </div>
                            <Input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" onChange={e => e.target.files[0] && handleImageUpload(e.target.files[0])} disabled={uploadingImage} />
                          </div>
                        ) : (
                          <div className="text-center relative w-full h-full flex flex-col items-center justify-center">
                            {uploadingImage ? <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-2" /> : <ImageIcon className="w-10 h-10 text-gray-600 mb-2" />}
                            <p className="text-sm font-medium text-gray-400">Cliquez pour ajouter une image</p>
                            <p className="text-xs text-gray-600 mt-1">JPG, PNG (Max 5MB)</p>
                            <Input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" onChange={e => e.target.files[0] && handleImageUpload(e.target.files[0])} disabled={uploadingImage} />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-gray-800">
                        <h4 className="font-semibold text-emerald-400 flex items-center gap-2">
                            <Clock className="w-4 h-4" /> Configuration des dates
                        </h4>
                        
                        <div className="space-y-2">
                            <Label htmlFor="eventDate" className="text-gray-300">Date de la cérémonie (Optionnel)</Label>
                            <Input
                                id="eventDate"
                                type="datetime-local"
                                value={eventDate}
                                onChange={e => setEventDate(e.target.value)}
                                className="bg-gray-950 border-gray-800 text-white [&::-webkit-calendar-picker-indicator]:invert"
                            />
                            <p className="text-xs text-gray-500">La date de l'événement final (Gala, Remise des prix...)</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="votingStart" className="text-gray-300">Début des votes</Label>
                                <Input
                                    id="votingStart"
                                    type="datetime-local"
                                    value={votingStartDate}
                                    onChange={e => setVotingStartDate(e.target.value)}
                                    className="bg-gray-950 border-gray-800 text-white [&::-webkit-calendar-picker-indicator]:invert"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="votingEnd" className="text-gray-300">Fin des votes <span className="text-red-500">*</span></Label>
                                <Input
                                    id="votingEnd"
                                    type="datetime-local"
                                    value={votingEndDate}
                                    onChange={e => setVotingEndDate(e.target.value)}
                                    className="bg-gray-950 border-gray-800 text-white [&::-webkit-calendar-picker-indicator]:invert"
                                />
                            </div>
                        </div>
                        {new Date(votingEndDate) <= new Date() && (
                            <div className="flex items-center gap-2 text-red-400 text-xs bg-red-950/20 p-2 rounded border border-red-900/50">
                                <AlertTriangle className="w-3 h-3" /> La date de fin doit être dans le futur
                            </div>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 max-w-2xl mx-auto">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-white">Définir les Catégories</h3>
                  <p className="text-sm text-gray-400">Créez des catégories pour classer vos candidats (ex: Meilleur Acteur, Révélation, etc.)</p>
                </div>

                <div className="flex gap-2">
                  <Input
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    placeholder="Nom de la catégorie..."
                    onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                    className="bg-gray-950 border-gray-800 text-white focus:ring-emerald-500"
                  />
                  <Button onClick={handleAddCategory} disabled={!newCategory.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="w-4 h-4 mr-2" /> Ajouter</Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {categories.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-950 border border-gray-800 rounded-lg shadow-sm group hover:border-gray-700 transition-colors">
                      <span className="font-medium text-gray-200">{cat}</span>
                      {cat !== 'Général' && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-red-400 hover:bg-red-950/20" onClick={() => handleRemoveCategory(cat)}>
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {categories.length === 1 && (
                  <div className="bg-blue-950/30 border border-blue-900/50 p-4 rounded-lg text-blue-300 text-sm flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Si vous n'ajoutez pas de catégories, tous les candidats seront dans "Général".
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {candidates.map((c, idx) => (
                    <Card key={c.id} className="overflow-hidden border-l-4 border-l-emerald-500 bg-gray-950 border-y-gray-800 border-r-gray-800 relative group hover:bg-gray-900 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex gap-4 items-start">
                          <div className="w-24 h-24 bg-gray-900 rounded-lg flex-shrink-0 relative overflow-hidden border border-gray-800 group-hover:border-gray-700">
                            {c.photo_url ? (
                              <img src={c.photo_url} alt={c.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-600">
                                <Upload className="w-8 h-8" />
                              </div>
                            )}
                            <Input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" onChange={e => e.target.files[0] && handleImageUpload(e.target.files[0], c.id)} disabled={uploadingImage} />
                            {uploadingImage && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="w-6 h-6 text-white animate-spin" /></div>}
                          </div>

                          <div className="flex-1 space-y-3">
                            <Input
                              placeholder="Nom du candidat *"
                              value={c.name}
                              onChange={e => setCandidates(prev => prev.map(item => item.id === c.id ? { ...item, name: e.target.value } : item))}
                              className="font-semibold bg-black/20 border-gray-800 text-white placeholder:text-gray-600 focus:ring-emerald-500"
                            />

                            <Select
                              value={c.category}
                              onValueChange={(val) => setCandidates(prev => prev.map(item => item.id === c.id ? { ...item, category: val } : item))}
                            >
                              <SelectTrigger className="h-8 text-sm bg-black/20 border-gray-800 text-gray-300">
                                <SelectValue placeholder="Catégorie" />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-900 border-gray-800 text-white">
                                {categories.map(cat => (
                                  <SelectItem key={cat} value={cat} className="focus:bg-gray-800 focus:text-emerald-400">{cat}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Textarea
                              placeholder="Courte bio..."
                              value={c.description}
                              onChange={e => setCandidates(prev => prev.map(item => item.id === c.id ? { ...item, description: e.target.value } : item))}
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
                          onClick={() => setCandidates(prev => prev.filter(item => item.id !== c.id))}
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      )}
                    </Card>
                  ))}

                  <Button
                    variant="outline"
                    className="h-full min-h-[200px] border-dashed border-2 border-gray-800 bg-transparent text-gray-500 flex flex-col gap-2 hover:border-emerald-500/50 hover:text-emerald-500 hover:bg-emerald-950/10 transition-all"
                    onClick={() => setCandidates(prev => [...prev, { id: uuidv4(), name: '', photo_url: '', category: categories[0] || 'Général' }])}
                  >
                    <Plus className="w-8 h-8" />
                    <span>Ajouter un candidat</span>
                  </Button>
                </div>
                
                {/* Checkbox d'acceptation du contrat */}
                <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-lg mt-6">
                    <div className="flex items-center space-x-3">
                        <Checkbox 
                            id="terms" 
                            checked={termsAccepted} 
                            onCheckedChange={setTermsAccepted}
                            className="border-gray-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                        />
                        <div className="grid gap-1.5 leading-none">
                            <label
                                htmlFor="terms"
                                className="text-sm font-medium leading-none text-gray-300 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                J'ai lu et j'accepte le contrat Organisateur
                            </label>
                            <p className="text-xs text-gray-500">
                                En publiant ce concours, vous acceptez les conditions de service et le règlement de la plateforme.
                            </p>
                        </div>
                    </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between border-t border-gray-800 bg-gray-950 p-6 rounded-b-xl">
            <Button variant="outline" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1 || loading} className="border-gray-700 bg-transparent text-gray-300 hover:bg-gray-800 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" /> Retour
            </Button>

            {step < 3 ? (
              <Button onClick={() => setStep(Math.min(3, step + 1))} className="bg-gray-100 text-black hover:bg-white">
                Suivant <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[150px] shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed" 
                onClick={performSubmission} 
                disabled={loading || uploadingImage || !termsAccepted}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Vote className="w-4 h-4 mr-2" />}
                Publier le Concours
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default CreateVotingEventPage;