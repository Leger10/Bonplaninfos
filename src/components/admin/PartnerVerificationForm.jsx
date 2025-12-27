import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Info } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const licensePacks = [
  { id: 'starter', name: 'Concession Starter (Ville)', price: 10000000, duration_years: 2, commission_rate: 20 },
  { id: 'business', name: 'Concession Business (Région)', price: 30000000, duration_years: 3, commission_rate: 30 },
  { id: 'premium', name: 'Concession Premium (Pays)', price: 50000000, duration_years: 5, commission_rate: 40 },
];

const FileInput = ({ label, onFileChange, isUploading, helpText, required, currentFileUrl }) => (
  <div>
    <div className="flex items-center gap-2 mb-1">
      <Label>{label}{required && <span className="text-red-500">*</span>}</Label>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="w-4 h-4 text-muted-foreground cursor-pointer" />
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">{helpText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
    <div className="flex items-center gap-2">
      <Input type="file" onChange={onFileChange} className="flex-grow" disabled={isUploading} accept=".pdf,.jpg,.jpeg,.png" />
      {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
    </div>
    {currentFileUrl && <a href={currentFileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline mt-1 block">Voir le document actuel</a>}
  </div>
);

const PartnerVerificationForm = ({ license, onCancel, onSuccess }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    license_type: license.license?.slug || 'starter',
    company_name: license.company_name || '',
    legal_reference: license.legal_reference || '',
    contact_phone: license.contact_phone || '',
    contact_email: license.contact_email || '',
    address: license.address || '',
  });
  const [documentUrls, setDocumentUrls] = useState({
    rib_document_url: license.rib_document_url || '',
    fiscal_document_url: license.fiscal_document_url || '',
    commerce_register_url: license.commerce_register_url || '',
    location_proof_url: license.location_proof_url || '',
    opening_authorization_url: license.opening_authorization_url || '',
    legal_agreement_url: license.legal_agreement_url || '',
    additional_documents_url: license.additional_documents_url || '',
  });
  const [uploading, setUploading] = useState({});
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (file, fieldName) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { // 10 MB
      toast({ title: "Fichier trop volumineux", description: "La taille maximale est de 10 Mo.", variant: 'destructive' });
      return;
    }
    setUploading(prev => ({ ...prev, [fieldName]: true }));
    try {
      const fileExt = file.name.split('.').pop();
      const newFileName = `${user.id}-${fieldName}-${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from('media')
        .upload(`partner_documents/${newFileName}`, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(data.path);
      setDocumentUrls(prev => ({ ...prev, [fieldName]: publicUrl }));
      toast({ title: "Document téléversé", description: `${file.name} a été ajouté.` });
    } catch (error) {
      toast({ title: "Erreur de téléversement", description: error.message, variant: 'destructive' });
    } finally {
      setUploading(prev => ({ ...prev, [fieldName]: false }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!documentUrls.rib_document_url || !documentUrls.fiscal_document_url || !documentUrls.commerce_register_url) {
      toast({ title: "Champs obligatoires manquants", description: "Veuillez téléverser le RIB, les documents fiscaux et le registre du commerce.", variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const selectedPack = licensePacks.find(p => p.id === formData.license_type);

      const rpcParams = {
        p_license_id: license.id,
        p_partner_id: user.id,
        p_license_type: formData.license_type,
        p_monthly_fee_cfa: selectedPack?.price || 0,
        p_company_name: formData.company_name,
        p_legal_reference: formData.legal_reference,
        p_contact_phone: formData.contact_phone,
        p_contact_email: formData.contact_email,
        p_address: formData.address,
        p_rib_document_url: documentUrls.rib_document_url,
        p_fiscal_document_url: documentUrls.fiscal_document_url,
        p_commerce_register_url: documentUrls.commerce_register_url,
        p_location_proof_url: documentUrls.location_proof_url,
        p_opening_authorization_url: documentUrls.opening_authorization_url,
        p_legal_agreement_url: documentUrls.legal_agreement_url,
        p_additional_documents_url: documentUrls.additional_documents_url,
      };

      const { data, error } = await supabase.rpc('submit_partner_verification', rpcParams);

      if (error) throw error;
      if (data && !data.success) throw new Error(data.message);

      toast({ title: 'Informations soumises', description: 'Vos informations ont été envoyées pour approbation.' });
      onSuccess();
    } catch (error) {
      console.error('Error submitting verification:', error);
      toast({ title: 'Erreur lors de la soumission', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl bg-card text-foreground shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>Vérification du compte Partenaire</CardTitle>
          <CardDescription>
            Veuillez remplir les informations ci-dessous et téléverser les documents requis. Vous avez 15 jours pour compléter votre profil.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto p-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Type de licence</Label>
                <Select onValueChange={(v) => setFormData({ ...formData, license_type: v })} defaultValue={formData.license_type}><SelectTrigger><SelectValue placeholder="Sélectionner une licence" /></SelectTrigger><SelectContent>{licensePacks.map(p => <SelectItem key={p.id} value={p.id}>{p.name} - {p.price.toLocaleString()} FCFA</SelectItem>)}</SelectContent></Select>
              </div>
              <div><Label>Nom de l'entreprise</Label><Input value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Référence légale</Label><Input value={formData.legal_reference} onChange={(e) => setFormData({ ...formData, legal_reference: e.target.value })} /></div>
              <div><Label>Email de contact</Label><Input type="email" value={formData.contact_email} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Téléphone de contact</Label><Input type="tel" value={formData.contact_phone} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })} /></div>
              <div><Label>Adresse</Label><Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} /></div>
            </div>

            <div className="space-y-4 border-t pt-4 mt-4">
              <h4 className="font-semibold">Documents Légaux</h4>
              <p className="text-sm text-muted-foreground">Chaque document doit respecter une taille maximale de 10 Mo. Les documents suivis d'une étoile (*) sont obligatoires.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FileInput label="Relevé d'Identification Bancaire (RIB)" required helpText="Document fourni par votre banque afin d'identifier votre compte bancaire. Il nous est utile pour exécuter vos demandes de reversement de vos fonds." onFileChange={(e) => handleFileUpload(e.target.files[0], 'rib_document_url')} isUploading={uploading.rib_document_url} currentFileUrl={documentUrls.rib_document_url} />
                <FileInput label="Documents fiscaux" required helpText="Ex: Document d'identification du contribuable (BÉNIN), Immatriculation Fiscale Unique (Burkina Faso), Carte du Contribuable (CAMEROUN), Déclaration Fiscale d'Existence (Côte d'Ivoire), etc." onFileChange={(e) => handleFileUpload(e.target.files[0], 'fiscal_document_url')} isUploading={uploading.fiscal_document_url} currentFileUrl={documentUrls.fiscal_document_url} />
                <FileInput label="Registre du commerce" required helpText="Registre du Commerce et du Crédit Mobilier : document délivré par l'administration publique déclarant l'existence légale de votre activité." onFileChange={(e) => handleFileUpload(e.target.files[0], 'commerce_register_url')} isUploading={uploading.commerce_register_url} currentFileUrl={documentUrls.commerce_register_url} />
                <FileInput label="Justificatif de localisation" helpText="Les documents attendus sont : FACTURE donnant la localisation de votre entreprise (Eau, Electricité, Internet, Téléphone, etc.)." onFileChange={(e) => handleFileUpload(e.target.files[0], 'location_proof_url')} isUploading={uploading.location_proof_url} currentFileUrl={documentUrls.location_proof_url} />
                <FileInput label="Autorisation d'ouverture" helpText="Document délivré par l'autorité étatique de votre pays autorisant le lancement de votre activité." onFileChange={(e) => handleFileUpload(e.target.files[0], 'opening_authorization_url')} isUploading={uploading.opening_authorization_url} currentFileUrl={documentUrls.opening_authorization_url} />
                <FileInput label="Accord ou autorisation légale" helpText="Tout autre accord ou autorisation légale pertinent pour votre activité." onFileChange={(e) => handleFileUpload(e.target.files[0], 'legal_agreement_url')} isUploading={uploading.legal_agreement_url} currentFileUrl={documentUrls.legal_agreement_url} />
                <FileInput label="Documents supplémentaires" helpText="Utilisez ce champ si vous devez nous transmettre d'autres documents." onFileChange={(e) => handleFileUpload(e.target.files[0], 'additional_documents_url')} isUploading={uploading.additional_documents_url} currentFileUrl={documentUrls.additional_documents_url} />
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading || Object.values(uploading).some(u => u)}>{loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Soumission...</> : 'Soumettre pour vérification'}</Button>
              <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PartnerVerificationForm;