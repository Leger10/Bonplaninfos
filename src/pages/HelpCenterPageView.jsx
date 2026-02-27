import React, { useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Search, Mail, Phone, MessageCircle, FileText, Send,
  HelpCircle, Upload, CheckCircle, AlertCircle, Wrench,
  ChevronLeft, X, Menu, ArrowLeft
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import AdminContractManagement from '@/components/admin/AdminContractManagement';
import { useMediaQuery } from '@/hooks/useMediaQuery';

/**
 * CONFIGURATION NOTE:
 * This component handles contract uploads to Supabase Storage.
 * Requirement: A bucket named 'contracts' must exist in your Supabase project.
 * Public access must be enabled on this bucket for admin preview links to work correctly.
 */

const HelpCenterPage = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [ticketReason, setTicketReason] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketAttachment, setTicketAttachment] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('support');
  const [viewMode, setViewMode] = useState('default');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const isMobile = useMediaQuery('(max-width: 768px)');

  const adminEmails = ["digihouse10@gmail.com", "bonplaninfos@gmail.com"];
  const isAdmin = user && adminEmails.includes(user.email);

  // Admin View Logic
  if (isAdmin && viewMode === 'default') {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-gray-900 via-[#0A0A0A] to-gray-900">
        <div className="bg-[#0A0A0A] border-b border-gray-800 p-2 sticky top-0 z-50">
          <div className="container mx-auto flex justify-between items-center">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowMobileMenu(!showMobileMenu)} 
              className="md:hidden text-gray-400 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setViewMode('user')} 
              className="text-xs text-gray-400 hover:text-white ml-auto"
            >
              <Wrench className="w-3 h-3 mr-1" />
              {isMobile ? 'Test' : 'Basculer en vue Utilisateur'}
            </Button>
          </div>
        </div>
        <AdminContractManagement />
      </div>
    );
  }

  const uploadSignedContract = async (contractData) => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour soumettre un contrat.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(10);

    try {
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .single();

      if (userError) console.warn("Profile fetch warning:", userError);
      
      setUploadProgress(30);

      const file = contractData.file;
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}_${contractData.contractType.replace(/[^a-z0-9]/gi, '_')}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        if (uploadError.message.includes('bucket')) {
          throw new Error("Le bucket 'contracts' est introuvable ou mal configuré.");
        }
        throw new Error("Échec de l'upload vers le stockage: " + uploadError.message);
      }

      setUploadProgress(60);

      const { data: urlData } = supabase.storage
        .from('contracts')
        .getPublicUrl(fileName);
        
      const publicUrl = urlData.publicUrl;
      console.log("File uploaded, public URL:", publicUrl);

      setUploadProgress(80);

      const { error: dbError } = await supabase
        .from('contract_submissions')
        .insert({
          user_id: user.id,
          contract_type: contractData.contractType,
          user_email: user.email,
          user_name: userData?.full_name || user.email.split('@')[0],
          user_phone: userData?.phone || '',
          message: contractData.message || 'Soumission de contrat signé',
          contract_file_url: publicUrl,
          status: 'pending',
          submitted_at: new Date().toISOString()
        });

      if (dbError) {
        console.error("Database insert error:", dbError);
        throw new Error("Erreur lors de l'enregistrement en base de données: " + dbError.message);
      }

      setUploadProgress(100);

      toast({
        title: "✅ Contrat envoyé avec succès",
        description: "Votre contrat signé a été enregistré et sera traité par notre équipe.",
        className: "bg-green-600 text-white"
      });

      setTicketReason('');
      setTicketDescription('');
      setTicketAttachment(null);
      setSelectedFile(null);
      const fileInput = document.getElementById('contract-upload');
      if (fileInput) fileInput.value = '';

    } catch (err) {
      console.error('Erreur complète:', err);
      let errorMessage = err.message || "Impossible d'envoyer le contrat.";
      
      toast({
        title: "❌ Erreur d'envoi",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleTestUpload = async () => {
    if (!user) return;
    
    const toastId = toast({ title: "Test en cours...", description: "Vérification du bucket 'contracts'..." });
    
    try {
      const testFile = new Blob(['Test content'], { type: 'text/plain' });
      const testFileName = `test_${Date.now()}.txt`;
      
      const { error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(`_test/${testFileName}`, testFile);
        
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage.from('contracts').getPublicUrl(`_test/${testFileName}`);
      
      const check = await fetch(data.publicUrl);
      if (!check.ok) throw new Error(`Fichier uploadé mais non accessible publiquement (${check.status}). Vérifiez les politiques RLS.`);
      
      toast({
        title: "✅ Test Réussi",
        description: `Bucket accessible. URL: ${data.publicUrl}`,
        className: "bg-green-600 text-white"
      });
    } catch (e) {
      toast({
        title: "❌ Test Échoué",
        description: e.message,
        variant: "destructive"
      });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Fichier trop volumineux",
          description: "La taille maximum est de 10MB",
          variant: "destructive"
        });
        return;
      }

      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      const fileType = file.type || file.name.split('.').pop().toLowerCase();
      
      if (!allowedTypes.includes(file.type) && !allowedTypes.some(type => type.includes(fileType))) {
        toast({
          title: "Format non supporté",
          description: "Formats acceptés : PDF, JPEG, PNG",
          variant: "destructive"
        });
        return;
      }

      setTicketAttachment(file);
      setSelectedFile(file);
    }
  };

  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour ouvrir un ticket.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let attachmentUrl = null;

      if (ticketAttachment) {
        const fileName = `${user.id}/${Date.now()}_${ticketAttachment.name.replace(/[^a-z0-9]/gi, '_')}`;
        
        const { error: uploadError } = await supabase.storage
          .from('tickets')
          .upload(fileName, ticketAttachment, { cacheControl: '3600', upsert: false });

        if (!uploadError) {
           const { data: { publicUrl } } = supabase.storage.from('tickets').getPublicUrl(fileName);
           attachmentUrl = publicUrl;
        }
      }

      const { error: dbError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          subject: ticketReason,
          description: ticketDescription,
          attachment_url: attachmentUrl,
          status: 'open'
        });

      if (dbError) throw dbError;

      toast({
        title: "✅ Ticket envoyé",
        description: "Votre ticket a été enregistré avec succès.",
        className: "bg-green-600 text-white"
      });

      setTicketReason('');
      setTicketDescription('');
      setTicketAttachment(null);
      setSelectedFile(null);

    } catch (err) {
      console.error('Erreur ticket:', err);
      toast({
        title: "❌ Erreur",
        description: "Impossible d'enregistrer le ticket. Veuillez réessayer.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const contractTypes = [
    { id: 'ville', label: 'Licence Ville (STARTER)', price: '1 000 000 FCFA', commission: '20%' },
    { id: 'region', label: 'Licence Région (BUSINESS)', price: '3 000 000 FCFA', commission: '30%' },
    { id: 'pays', label: 'Franchise Nationale (PREMIUM)', price: '5-10M FCFA', commission: '40%' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#0A0A0A] to-gray-900 text-gray-200">
      {/* Admin Switch Back Button - Mobile Optimized */}
      {isAdmin && viewMode === 'user' && (
        <div className="bg-blue-900/30 border-b border-blue-800 p-2 sticky top-0 z-50 backdrop-blur-lg">
          <div className="container mx-auto">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setViewMode('default')} 
              className="text-blue-300 hover:text-white flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Retour au Panneau Admin</span>
            </Button>
          </div>
        </div>
      )}

      {/* Hero Section - Mobile Optimized */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-purple-900 py-8 md:py-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <img 
            src="https://images.unsplash.com/photo-1643101448770-d508b0cfe8bf" 
            alt="Support" 
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="absolute top-0 right-0 w-32 md:w-64 h-32 md:h-64 bg-blue-500 rounded-full filter blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 left-0 w-32 md:w-64 h-32 md:h-64 bg-purple-500 rounded-full filter blur-3xl opacity-20"></div>
        
        <div className="container max-w-4xl mx-auto relative z-10 text-center text-white">
          <Badge className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-100 border-blue-400/50 mb-3 md:mb-4 text-xs md:text-sm">
            Centre d'Aide & Soumission Contrats
          </Badge>
          
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4 bg-gradient-to-r from-white via-blue-100 to-purple-100 text-transparent bg-clip-text px-2">
            {isMobile ? 'Comment vous aider ?' : 'Comment pouvons-nous vous aider ?'}
          </h1>
          
          <div className="relative max-w-xl mx-auto px-2">
            <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-gray-400" />
            <Input
              placeholder={isMobile ? "Rechercher..." : "Recherchez une réponse (ex: retrait, contrat, licence)..."}
              className="pl-10 h-10 md:h-12 bg-white/10 backdrop-blur-lg border-gray-600 text-white placeholder:text-gray-400 shadow-xl text-sm md:text-base"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main Content - Mobile Optimized */}
      <div className="container max-w-6xl mx-auto px-3 md:px-4 -mt-6 md:-mt-8 relative z-20 pb-10 md:pb-20">
       <Tabs
  defaultValue="support"
  className="w-full mb-6 md:mb-8"
  onValueChange={setActiveTab}
>
  <TabsList className="bg-[#111111] border border-gray-800 p-1 w-full grid grid-cols-2">

    {/* Support */}
    <TabsTrigger
      value="support"
      className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs md:text-sm py-2"
    >
      <HelpCircle className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />

      {/* Desktop */}
      <span className="hidden xs:inline">
        Support
      </span>

      {/* Mobile */}
      <span className="xs:hidden">
        Aide
      </span>
    </TabsTrigger>

    {/* Contrats */}
    <TabsTrigger
      value="contracts"
      className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs md:text-sm py-2"
    >
      <FileText className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />

      {/* Desktop */}
      <span className="hidden xs:inline">
        Contrats
      </span>

      {/* Mobile */}
      <span className="xs:hidden">
        Signer
      </span>
    </TabsTrigger>

  </TabsList>


          <TabsContent value="support" className="mt-4 md:mt-6 space-y-4 md:space-y-8">
            {/* Contact Cards - Mobile Grid */}
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
              {/* Phone Card */}
              <Card className="bg-[#111111] border-gray-800 hover:border-blue-500/50 transition-all">
                <CardContent className="p-3 md:p-6 flex flex-col items-center text-center">
                  <div className="bg-blue-500/20 p-2 md:p-3 rounded-full mb-2 md:mb-4 text-blue-400">
                    <Phone className="w-4 h-4 md:w-6 md:h-6" />
                  </div>
                  <h3 className="font-bold text-white text-sm md:text-base">Téléphone</h3>
                  <p className="text-xs text-gray-400 mb-1 md:mb-2">Lun-Ven: 9h-17h</p>
                  <a href="tel:+2250712275374" className="text-xs md:text-sm text-blue-400 font-medium hover:text-blue-300 break-all">
                    +225 07 12 27 53 74
                  </a>
                  <Button
                    variant="outline"
                    size={isMobile ? "sm" : "default"}
                    className="w-full mt-2 md:mt-4 bg-transparent border-blue-500/50 text-blue-400 hover:bg-blue-500/20 text-xs md:text-sm"
                    onClick={() => window.location.href = 'tel:+2250712275374'}
                  >
                    Appeler
                  </Button>
                </CardContent>
              </Card>

              {/* Chat Card */}
              <Card className="bg-[#111111] border-gray-800 hover:border-purple-500/50 transition-all">
                <CardContent className="p-3 md:p-6 flex flex-col items-center text-center">
                  <div className="bg-purple-500/20 p-2 md:p-3 rounded-full mb-2 md:mb-4 text-purple-400">
                    <MessageCircle className="w-4 h-4 md:w-6 md:h-6" />
                  </div>
                  <h3 className="font-bold text-white text-sm md:text-base">Chat</h3>
                  <p className="text-xs text-gray-400 mb-2 md:mb-4">Instantanné</p>
                  <Button
                    variant="outline"
                    size={isMobile ? "sm" : "default"}
                    className="w-full bg-transparent border-purple-500/50 text-purple-400 hover:bg-purple-500/20 text-xs md:text-sm"
                    onClick={() => window.open('https://chat.whatsapp.com/IcR0TttLYpU1lJXr3ifyvH', '_blank')}
                  >
                    Démarrer
                  </Button>
                </CardContent>
              </Card>

              {/* Email Card */}
              <Card className="bg-[#111111] border-gray-800 hover:border-green-500/50 transition-all xs:col-span-2 md:col-span-1">
                <CardContent className="p-3 md:p-6 flex flex-col items-center text-center">
                  <div className="bg-green-500/20 p-2 md:p-3 rounded-full mb-2 md:mb-4 text-green-400">
                    <Mail className="w-4 h-4 md:w-6 md:h-6" />
                  </div>
                  <h3 className="font-bold text-white text-sm md:text-base">Email</h3>
                  <p className="text-xs text-gray-400 mb-1">support@bonplaninfos.net</p>
                  <a href={`mailto:${adminEmails[0]}`} className="text-xs md:text-sm text-blue-400 font-medium hover:text-blue-300">
                    Nous écrire
                  </a>
                  <Button
                    variant="outline"
                    size={isMobile ? "sm" : "default"}
                    className="w-full mt-2 md:mt-4 bg-transparent border-green-500/50 text-green-400 hover:bg-green-500/20 text-xs md:text-sm"
                    onClick={() => window.location.href = `mailto:${adminEmails[0]}`}
                  >
                    Envoyer
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Support Ticket Form - Mobile Optimized */}
            <Card className="bg-[#111111] border-gray-800 border-t-4 border-t-blue-600">
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-white text-lg md:text-xl">Ouvrir un Ticket Support</CardTitle>
                <CardDescription className="text-xs md:text-sm text-gray-400">
                  Une question spécifique ? Notre équipe vous répond sous 24h.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
                <form onSubmit={handleTicketSubmit} className="space-y-3 md:space-y-4">
                  <div className="space-y-1 md:space-y-2">
                    <label className="text-xs md:text-sm font-medium text-white">Sujet</label>
                    <Input
                      placeholder="Ex: Problème de retrait..."
                      required
                      className="h-9 md:h-10 text-sm bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                      value={ticketReason}
                      onChange={e => setTicketReason(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1 md:space-y-2">
                    <label className="text-xs md:text-sm font-medium text-white">Description</label>
                    <Textarea
                      placeholder="Décrivez votre problème en détail..."
                      className="min-h-[80px] md:min-h-[120px] text-sm bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                      required
                      value={ticketDescription}
                      onChange={e => setTicketDescription(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1 md:space-y-2">
                    <label className="text-xs md:text-sm font-medium text-white">Pièce jointe</label>
                    <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2">
                      <Input
                        type="file"
                        className="text-xs w-full bg-gray-800/50 border-gray-700 text-white file:bg-blue-600 file:text-white file:border-0 file:rounded-md file:text-xs file:px-2 file:py-1"
                        onChange={handleFileChange}
                        accept=".pdf,.jpg,.jpeg,.png"
                      />
                      {selectedFile && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 h-8"
                          onClick={() => {
                            setTicketAttachment(null);
                            setSelectedFile(null);
                            const fileInput = document.getElementById('ticket-file');
                            if (fileInput) fileInput.value = '';
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">PDF, JPEG, PNG (max 10MB)</p>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm md:text-base h-9 md:h-10" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Envoi...
                      </>
                    ) : (
                      <>
                        <Send className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                        Envoyer
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contracts" className="mt-4 md:mt-6 space-y-4 md:space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              {/* Contract Submission Form - Mobile Optimized */}
              <div className="lg:col-span-2 space-y-4 md:space-y-6">
                <Card className="bg-[#111111] border-gray-800">
                  <CardHeader className="p-4 md:p-6">
                    <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-3">
                      <div>
                        <CardTitle className="text-white text-lg md:text-xl">📄 Soumettre un contrat signé</CardTitle>
                        <CardDescription className="text-xs md:text-sm text-gray-400 mt-1">
                          Déposez votre contrat signé pour validation
                        </CardDescription>
                      </div>
                      {isAdmin && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleTestUpload} 
                          className="text-xs border-dashed w-full xs:w-auto"
                        >
                          Test Upload
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
                    <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
                      <div className="flex items-start gap-2 md:gap-3">
                        <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs md:text-sm text-white font-medium">Processus de soumission</p>
                          <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                            1. Téléchargez le contrat depuis la page Documentation<br />
                            2. Imprimez, remplissez et signez<br />
                            3. Scannez ou prenez en photo<br />
                            4. Déposez le fichier ci-dessous<br />
                            5. Traitement sous 48h
                          </p>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={(e) => {
                      e.preventDefault();
                      if (!ticketAttachment) {
                        toast({ title: "Veuillez sélectionner un fichier", variant: "destructive" });
                        return;
                      }
                      uploadSignedContract({
                        file: ticketAttachment,
                        contractType: ticketReason,
                        message: ticketDescription
                      });
                    }} className="space-y-3 md:space-y-4">
                      <div className="space-y-1 md:space-y-2">
                        <label className="text-xs md:text-sm font-medium text-white">Type de contrat</label>
                        <select
                          required
                          className="w-full px-3 py-2 text-sm bg-gray-800/50 border border-gray-700 rounded-md text-white"
                          value={ticketReason}
                          onChange={e => setTicketReason(e.target.value)}
                        >
                          <option value="">Sélectionnez un type</option>
                          {contractTypes.map(ct => (
                            <option key={ct.id} value={ct.label} className="text-xs md:text-sm">
                              {isMobile ? ct.label.substring(0, 25) + '...' : ct.label} - {ct.price}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1 md:space-y-2">
                        <label className="text-xs md:text-sm font-medium text-white">Fichier du contrat signé</label>
                        <div className="border-2 border-dashed border-gray-700 rounded-lg p-4 md:p-6 text-center hover:border-blue-500/50 transition-colors">
                          <Upload className="w-6 h-6 md:w-8 md:h-8 text-gray-500 mx-auto mb-2" />
                          <p className="text-xs md:text-sm text-gray-400 mb-1 break-all px-2">
                            {selectedFile ? selectedFile.name : 'Glissez ou cliquez pour ajouter'}
                          </p>
                          <p className="text-xs text-gray-500">PDF, JPEG, PNG - Max 10MB</p>
                          <Input type="file" className="hidden" id="contract-upload" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" />
                          <Button 
                            type="button" 
                            variant="outline" 
                            size={isMobile ? "sm" : "default"}
                            className="mt-3 md:mt-4 bg-transparent border-blue-500/50 text-blue-400 hover:bg-blue-500/20 text-xs md:text-sm"
                            onClick={() => document.getElementById('contract-upload').click()}
                          >
                            <Upload className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                            Choisir
                          </Button>
                          {selectedFile && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="ml-2 text-red-400 hover:text-red-300"
                              onClick={() => {
                                setTicketAttachment(null);
                                setSelectedFile(null);
                                const fileInput = document.getElementById('contract-upload');
                                if (fileInput) fileInput.value = '';
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1 md:space-y-2">
                        <label className="text-xs md:text-sm font-medium text-white">Message (optionnel)</label>
                        <Textarea
                          placeholder="Ajoutez un commentaire..."
                          className="min-h-[60px] md:min-h-[80px] text-sm bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                          value={ticketDescription}
                          onChange={e => setTicketDescription(e.target.value)}
                          rows={isMobile ? 2 : 3}
                        />
                      </div>

                      {uploadProgress > 0 && (
                        <div className="space-y-1 md:space-y-2">
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>Envoi...</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <Progress value={uploadProgress} className="h-1 md:h-2 bg-gray-800" />
                        </div>
                      )}

                      <div className="bg-yellow-900/20 border border-yellow-500/30 p-2 md:p-3 rounded-lg">
                        <p className="text-xs text-yellow-400 flex items-start gap-2">
                          <AlertCircle className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0 mt-0.5" />
                          <span>
                            <strong>Important :</strong> En soumettant, vous confirmez avoir accepté les termes.
                          </span>
                        </p>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full bg-green-600 hover:bg-green-700 text-white text-sm md:text-base h-9 md:h-10" 
                        disabled={isSubmitting || !ticketAttachment || !ticketReason}
                      >
                        {isSubmitting ? (
                          <>
                            <span className="animate-spin mr-2">⏳</span>
                            Envoi...
                          </>
                        ) : (
                          <>
                            <Send className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                            Soumettre
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Contract Types Sidebar - Mobile Optimized */}
              <div className="space-y-4 md:space-y-6">
                <Card className="bg-[#111111] border-gray-800 sticky top-4">
                  <CardHeader className="p-4 md:p-6">
                    <CardTitle className="text-white text-lg md:text-xl">📋 Nos contrats</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6 pt-0 md:pt-0 space-y-3 md:space-y-4">
                    {contractTypes.map((ct, idx) => (
                      <div key={idx} className="p-2 md:p-3 bg-gray-800/30 rounded-lg border border-gray-700">
                        <Badge className={`mb-2 text-xs ${idx === 0 ? 'bg-blue-600/20 text-blue-300' : idx === 1 ? 'bg-purple-600/20 text-purple-300' : 'bg-yellow-600/20 text-yellow-300'}`}>
                          {isMobile ? ct.label.split(' ')[0] : ct.label}
                        </Badge>
                        <div className="flex justify-between text-xs md:text-sm">
                          <span className="text-gray-400">Prix:</span>
                          <span className="text-white font-bold">{ct.price}</span>
                        </div>
                        <div className="flex justify-between text-xs md:text-sm mt-1">
                          <span className="text-gray-400">Commission:</span>
                          <span className="text-green-400">{ct.commission}</span>
                        </div>
                      </div>
                    ))}

                    <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-gray-700">
                      <p className="text-xs text-gray-400">
                        <strong className="text-white">Besoin d'aide ?</strong>
                      </p>
                      <div className="space-y-1 mt-2">
                        <a href={`mailto:${adminEmails[0]}`} className="text-xs text-blue-400 hover:text-blue-300 block break-all">
                          support@bonplaninfos.net
                        </a>
                        <a href={`mailto:bonplaninfos@gmail.com`} className="text-xs text-gray-500 hover:text-blue-300 block break-all">
                          bonplaninfos@gmail.com
                        </a>
                        <a href="tel:+2250712275374" className="text-xs text-blue-400 hover:text-blue-300 block">
                          +225 07 12 27 53 74
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer - Mobile Optimized */}
        <div className="mt-8 md:mt-12 text-center text-xs text-gray-500 px-2">
          <p className="mb-2 leading-relaxed">
            <strong className="text-gray-300">Support BonPlanInfos</strong>
          </p>
          <p className="space-x-2">
            <a href={`mailto:support@bonplaninfos.net`} className="text-blue-400 hover:underline">
              support@bonplaninfos.net
            </a>
            <span className="text-gray-600">•</span>
            <a href={`mailto:bonplaninfos@gmail.com`} className="text-blue-400 hover:underline">
              bonplaninfos@gmail.com
            </a>
          </p>
          <p className="mt-2">
            <a href="tel:+2250712275374" className="text-blue-400 hover:underline">
              +225 07 12 27 53 74
            </a>
            <span className="text-gray-500 ml-2">• Lun-Ven: 9h-17h</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default HelpCenterPage;