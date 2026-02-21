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
  HelpCircle, Upload, CheckCircle, AlertCircle, Wrench
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import AdminContractManagement from '@/components/admin/AdminContractManagement';

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
  const [viewMode, setViewMode] = useState('default'); // 'default' (auto admin check) or 'user' (forced user view)

  const adminEmails = ["digihouse10@gmail.com", "bonplaninfos@gmail.com"];
  const isAdmin = user && adminEmails.includes(user.email);

  // Admin View Logic
  if (isAdmin && viewMode === 'default') {
    return (
      <div className="relative">
        <div className="bg-[#0A0A0A] border-b border-gray-800 p-2 text-right">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setViewMode('user')} 
            className="text-xs text-gray-400 hover:text-white"
          >
            <Wrench className="w-3 h-3 mr-1" />
            Basculer en vue Utilisateur (Test Upload)
          </Button>
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

      // Non-blocking error for profile
      if (userError) console.warn("Profile fetch warning:", userError);
      
      setUploadProgress(30);

      const file = contractData.file;
      const fileExt = file.name.split('.').pop();
      // Use clean filename structure: userID/timestamp_type.ext
      const fileName = `${user.id}/${Date.now()}_${contractData.contractType.replace(/[^a-z0-9]/gi, '_')}.${fileExt}`;

      // Upload to 'contracts' bucket
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

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('contracts')
        .getPublicUrl(fileName);
        
      const publicUrl = urlData.publicUrl;
      console.log("File uploaded, public URL:", publicUrl);

      setUploadProgress(80);

      // Insert into contract_submissions
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
        // Attempt to clean up file if DB fails? Optional, usually fine to leave orphan files or handle later
        throw new Error("Erreur lors de l'enregistrement en base de données: " + dbError.message);
      }

      setUploadProgress(100);

      toast({
        title: "✅ Contrat envoyé avec succès",
        description: "Votre contrat signé a été enregistré et sera traité par notre équipe.",
        className: "bg-green-600 text-white"
      });

      // Clear form
      setTicketReason('');
      setTicketDescription('');
      setTicketAttachment(null);
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
    // Helper for admins/devs to verify bucket configuration
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
      
      // Verify public access with a fetch
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
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Format non supporté",
          description: "Formats acceptés : PDF, JPEG, PNG",
          variant: "destructive"
        });
        return;
      }

      setTicketAttachment(file);
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
        
        // Use 'tickets' bucket for support tickets
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
      {/* Admin Switch Back Button */}
      {isAdmin && viewMode === 'user' && (
        <div className="bg-blue-900/30 border-b border-blue-800 p-2 text-center sticky top-0 z-50">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setViewMode('default')} 
            className="text-blue-300 hover:text-white"
          >
            Retourner au Panneau Admin
          </Button>
        </div>
      )}

      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-purple-900 py-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <img src="https://images.unsplash.com/photo-1643101448770-d508b0cfe8bf" alt="Support" className="w-full h-full object-cover" />
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full filter blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full filter blur-3xl opacity-20"></div>
        <div className="container max-w-4xl mx-auto relative z-10 text-center text-white">
          <Badge className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-100 border-blue-400/50 mb-4">
            Centre d'Aide & Soumission Contrats
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-blue-100 to-purple-100 text-transparent bg-clip-text">
            Comment pouvons-nous vous aider ?
          </h1>
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Recherchez une réponse (ex: retrait, contrat, licence)..."
              className="pl-10 h-12 bg-white/10 backdrop-blur-lg border-gray-600 text-white placeholder:text-gray-400 shadow-xl"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 -mt-8 relative z-20 pb-20">
        <Tabs defaultValue="support" className="w-full mb-8" onValueChange={setActiveTab}>
          <TabsList className="bg-[#111111] border border-gray-800 p-1 w-full grid grid-cols-2">
            <TabsTrigger value="support" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <HelpCircle className="w-4 h-4 mr-2" />
              Support & Assistance
            </TabsTrigger>
            <TabsTrigger value="contracts" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <FileText className="w-4 h-4 mr-2" />
              Soumettre un contrat signé
            </TabsTrigger>
          </TabsList>

          <TabsContent value="support" className="mt-6 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Contact Cards - Same as before */}
              <Card className="bg-[#111111] border-gray-800 hover:border-blue-500/50 transition-all">
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className="bg-blue-500/20 p-3 rounded-full mb-4 text-blue-400">
                    <Phone className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-white">Par Téléphone</h3>
                  <p className="text-sm text-gray-400 mb-2">Lun-Ven: 9h-17h</p>
                  <a href="tel:+2250712275374" className="text-blue-400 font-medium hover:text-blue-300">+225 07 12 27 53 74</a>
                  <Button
                    variant="outline"
                    className="w-full mt-4 bg-transparent border-blue-500/50 text-blue-400 hover:bg-blue-500/20"
                    onClick={() => window.location.href = 'tel:+2250712275374'}
                  >
                    Appeler
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-[#111111] border-gray-800 hover:border-purple-500/50 transition-all">
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className="bg-purple-500/20 p-3 rounded-full mb-4 text-purple-400">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-white">Chat en Direct</h3>
                  <p className="text-sm text-gray-400 mb-4">Réponse instantanée</p>
                  <Button
                    variant="outline"
                    className="w-full bg-transparent border-purple-500/50 text-purple-400 hover:bg-purple-500/20"
                    onClick={() => window.open('https://chat.whatsapp.com/IcR0TttLYpU1lJXr3ifyvH', '_blank')}
                  >
                    Démarrer le Chat
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-[#111111] border-gray-800 hover:border-green-500/50 transition-all">
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className="bg-green-500/20 p-3 rounded-full mb-4 text-green-400">
                    <Mail className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-white">Email</h3>
                  <p className="text-sm text-gray-400 mb-1">support@bonplaninfos.net</p>
                  <a href={`mailto:${adminEmails[0]}`} className="text-blue-400 font-medium hover:text-blue-300 text-sm">
                    Nous écrire
                  </a>
                  <Button
                    variant="outline"
                    className="w-full mt-4 bg-transparent border-green-500/50 text-green-400 hover:bg-green-500/20"
                    onClick={() => window.location.href = `mailto:${adminEmails[0]}`}
                  >
                    Envoyer un Email
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-[#111111] border-gray-800 border-t-4 border-t-blue-600">
              <CardHeader>
                <CardTitle className="text-white">Ouvrir un Ticket Support</CardTitle>
                <CardDescription className="text-gray-400">
                  Une question spécifique ? Notre équipe vous répond sous 24h.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTicketSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white">Sujet</label>
                    <Input
                      placeholder="Ex: Problème de retrait..."
                      required
                      className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                      value={ticketReason}
                      onChange={e => setTicketReason(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white">Description détaillée</label>
                    <Textarea
                      placeholder="Décrivez votre problème en détail..."
                      className="min-h-[120px] bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                      required
                      value={ticketDescription}
                      onChange={e => setTicketDescription(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white">Pièce jointe (Optionnel)</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        className="text-xs bg-gray-800/50 border-gray-700 text-white file:bg-blue-600 file:text-white file:border-0 file:rounded-md"
                        onChange={handleFileChange}
                        accept=".pdf,.jpg,.jpeg,.png"
                      />
                    </div>
                    <p className="text-xs text-gray-500">Formats acceptés: PDF, JPEG, PNG (max 10MB)</p>
                  </div>

                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Envoyer la demande
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contracts" className="mt-6 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card className="bg-[#111111] border-gray-800">
                  <CardHeader className="flex flex-row justify-between items-start">
                    <div>
                      <CardTitle className="text-white">📄 Soumettre un contrat signé</CardTitle>
                      <CardDescription className="text-gray-400">
                        Vous avez téléchargé et rempli votre contrat ? Déposez-le ici pour validation par notre équipe.
                      </CardDescription>
                    </div>
                    {/* Test Button for Admins */}
                    {isAdmin && (
                      <Button variant="outline" size="sm" onClick={handleTestUpload} className="text-xs border-dashed">
                        Test Upload (Admin)
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-6">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-white font-medium">Processus de soumission</p>
                          <p className="text-xs text-gray-400 mt-1">
                            1. Téléchargez le contrat depuis la page Documentation<br />
                            2. Imprimez, remplissez et signez le document<br />
                            3. Scannez ou prenez en photo le contrat signé<br />
                            4. Déposez le fichier ci-dessous et soumettez<br />
                            5. Notre équipe traitera votre demande sous 48h
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
                    }} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-white">Type de contrat</label>
                        <select
                          required
                          className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-md text-white"
                          value={ticketReason}
                          onChange={e => setTicketReason(e.target.value)}
                        >
                          <option value="">Sélectionnez un type de contrat</option>
                          {contractTypes.map(ct => (
                            <option key={ct.id} value={ct.label}>{ct.label} - {ct.price} - {ct.commission}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-white">Fichier du contrat signé</label>
                        <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-blue-500/50 transition-colors">
                          <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                          <p className="text-sm text-gray-400 mb-1">
                            {ticketAttachment ? ticketAttachment.name : 'Glissez ou cliquez pour ajouter le contrat signé'}
                          </p>
                          <p className="text-xs text-gray-500">PDF, JPEG, PNG - Max 10MB</p>
                          <Input type="file" className="hidden" id="contract-upload" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" />
                          <Button type="button" variant="outline" className="mt-4 bg-transparent border-blue-500/50 text-blue-400 hover:bg-blue-500/20" onClick={() => document.getElementById('contract-upload').click()}>
                            <Upload className="w-4 h-4 mr-2" />
                            Choisir un fichier
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-white">Message (optionnel)</label>
                        <Textarea
                          placeholder="Ajoutez un commentaire pour l'équipe de validation..."
                          className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                          value={ticketDescription}
                          onChange={e => setTicketDescription(e.target.value)}
                          rows={3}
                        />
                      </div>

                      {uploadProgress > 0 && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>Envoi en cours...</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <Progress value={uploadProgress} className="h-2 bg-gray-800" />
                        </div>
                      )}

                      <div className="bg-yellow-900/20 border border-yellow-500/30 p-3 rounded-lg">
                        <p className="text-xs text-yellow-400 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span>
                            <strong>Important :</strong> En soumettant ce contrat, vous confirmez avoir lu,
                            compris et accepté l'intégralité des termes. Votre signature sera vérifiée par notre équipe.
                          </span>
                        </p>
                      </div>

                      <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white" disabled={isSubmitting || !ticketAttachment || !ticketReason}>
                        {isSubmitting ? (
                          <>
                            <span className="animate-spin mr-2">⏳</span>
                            Envoi du contrat en cours...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Soumettre le contrat signé
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="bg-[#111111] border-gray-800 sticky top-6">
                  <CardHeader>
                    <CardTitle className="text-white">📋 Rappel des contrats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {contractTypes.map((ct, idx) => (
                      <div key={idx} className="p-3 bg-gray-800/30 rounded-lg border border-gray-700">
                        <Badge className={`mb-2 ${idx === 0 ? 'bg-blue-600/20 text-blue-300' : idx === 1 ? 'bg-purple-600/20 text-purple-300' : 'bg-yellow-600/20 text-yellow-300'}`}>
                          {ct.label}
                        </Badge>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Droit d'entrée:</span>
                          <span className="text-white font-bold">{ct.price}</span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-gray-400">Commission:</span>
                          <span className="text-green-400">{ct.commission}</span>
                        </div>
                      </div>
                    ))}

                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <p className="text-xs text-gray-400">
                        <strong className="text-white">Besoin d'aide ?</strong><br />
                        Contactez notre équipe partenariat :
                      </p>
                      <a href={`mailto:${adminEmails[0]}`} className="text-sm text-blue-400 hover:text-blue-300 block mt-2">
                        support@bonplaninfos.net
                      </a>
                      <a href={`mailto:bonplaninfos@gmail.com`} className="text-sm text-gray-500 hover:text-blue-300 block mt-1">
                        bonplaninfos@gmail.com
                      </a>
                      <a href="tel:+2250712275374" className="text-sm text-blue-400 hover:text-blue-300 block mt-2">+225 07 12 27 53 74</a>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-12 text-center text-sm text-gray-500">
          <p className="mb-2">
            <strong className="text-gray-300">Support BonPlanInfos</strong> •
            <a href={`mailto:support@bonplaninfos.net`} className="text-blue-400 hover:underline ml-1">support@bonplaninfos.net</a> •
            <a href={`mailto:bonplaninfos@gmail.com`} className="text-blue-400 hover:underline ml-1">bonplaninfos@gmail.com</a>
          </p>
          <p>
            <a href="tel:+2250712275374" className="text-blue-400 hover:underline">+225 07 12 27 53 74</a>
            • Lun-Ven: 9h00 - 17h00 (UTC+0)
          </p>
        </div>
      </div>
    </div>
  );
};

export default HelpCenterPage;