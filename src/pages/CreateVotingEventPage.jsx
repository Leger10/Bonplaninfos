import React, { useState } from 'react';
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
import { Loader2, Vote, Plus, Trash, Upload, X, ArrowRight, ArrowLeft, Image as ImageIcon, Layers, Users, Calendar, DollarSign, FileText } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Progress } from '@/components/ui/progress';

const CreateVotingEventPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [votePrice, setVotePrice] = useState(100); // FCFA default
  const [endDate, setEndDate] = useState('');
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

  const handleSubmit = async () => {
    if (!user) return;
    if (!title || !coverImage || candidates.some(c => !c.name)) {
        toast({ title: "Champs manquants", description: "Veuillez remplir tous les champs obligatoires (*)", variant: "destructive" });
        return;
    }

    setLoading(true);
    try {
        const { data: event, error: eventError } = await supabase.from('events').insert({
            title,
            description,
            organizer_id: user.id,
            event_type: 'voting',
            status: 'active',
            cover_image: coverImage,
            cover_image_url: coverImage,
            event_date: new Date().toISOString(),
            city: 'Online',
            country: 'Global',
            tags: categories
        }).select().single();

        if (eventError) throw eventError;

        const pricePi = Math.ceil(votePrice / 10);
        const { error: settingsError } = await supabase.from('event_settings').insert({
            event_id: event.id,
            vote_price_fcfa: votePrice,
            vote_price_pi: pricePi,
            voting_enabled: true,
            end_date: endDate || new Date(Date.now() + 30*24*60*60*1000).toISOString(),
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

                                    <div className="grid grid-cols-2 gap-4">
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
                                            <p className="text-xs text-emerald-400 font-mono">≈ {Math.ceil(votePrice/10)} π</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="date" className="text-gray-300">Fin des votes</Label>
                                            <div className="relative">
                                                <Input 
                                                    id="date" 
                                                    type="datetime-local" 
                                                    value={endDate} 
                                                    onChange={e => setEndDate(e.target.value)} 
                                                    className="pl-10 bg-gray-950 border-gray-800 text-white placeholder:text-gray-600 focus:ring-emerald-500 [&::-webkit-calendar-picker-indicator]:invert" 
                                                />
                                                <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label className="text-gray-300">Image de couverture <span className="text-red-500">*</span></Label>
                                    <div className={`border-2 border-dashed rounded-xl h-64 md:h-full flex flex-col items-center justify-center p-4 transition-all ${coverImage ? 'border-emerald-500/50 bg-emerald-950/10' : 'border-gray-800 hover:border-gray-600 bg-gray-950'}`}>
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
                                <Button onClick={handleAddCategory} disabled={!newCategory.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="w-4 h-4 mr-2"/> Ajouter</Button>
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
                                                    {uploadingImage && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="w-6 h-6 text-white animate-spin"/></div>}
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
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[150px] shadow-lg shadow-emerald-900/20" onClick={handleSubmit} disabled={loading || uploadingImage}>
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