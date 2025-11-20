import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, Trash2, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { COUNTRIES, CITIES_BY_COUNTRY } from '@/constants/countries';
import { v4 as uuidv4 } from 'uuid';

const AddLocationPage = () => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        type_id: '',
        address: '',
        city: '',
        country: 'Côte d\'Ivoire',
        google_maps_link: '',
        website: '',
        phone_number: '',
        images_files: [],
    });
    const [locationTypes, setLocationTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        const fetchTypes = async () => {
            const { data, error } = await supabase.from('location_types').select('id, name').eq('is_active', true).order('name');
            if (error) {
                toast({ title: 'Erreur', description: 'Impossible de charger les types de lieux.' });
            } else {
                setLocationTypes(data);
            }
        };
        fetchTypes();
    }, []);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleCountryChange = (countryName) => {
        setFormData(prev => ({
            ...prev,
            country: countryName,
            city: '' // Reset city when country changes
        }));
    };

    const handleFileChange = (e) => {
        if (e.target.files.length > 5) {
            toast({ title: 'Trop d\'images', description: 'Vous ne pouvez téléverser que 5 images maximum.', variant: 'destructive' });
            return;
        }
        setFormData(prev => ({ ...prev, images_files: [...e.target.files] }));
    };

    const removeImage = (indexToRemove) => {
        setFormData(prev => ({
            ...prev,
            images_files: prev.images_files.filter((_, index) => index !== indexToRemove)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            toast({ title: 'Authentification requise', description: 'Veuillez vous connecter pour ajouter un lieu.', variant: 'destructive' });
            navigate('/auth');
            return;
        }
        setLoading(true);

        try {
            let imageUrls = [];
            if (formData.images_files.length > 0) {
                for (const file of formData.images_files) {
                    const filePath = `locations/${user.id}/${uuidv4()}-${file.name}`;
                    const { data: uploadData, error: uploadError } = await supabase.storage.from('media').upload(filePath, file);
                    if (uploadError) throw uploadError;
                    const { data: urlData } = supabase.storage.from('media').getPublicUrl(uploadData.path);
                    imageUrls.push(urlData.publicUrl);
                }
            }

            const locationPayload = {
                name: formData.name,
                description: formData.description,
                type_id: formData.type_id,
                address: formData.address,
                city: formData.city,
                country: formData.country,
                google_maps_link: formData.google_maps_link,
                website: formData.website,
                phone_number: formData.phone_number,
                images: imageUrls,
                user_id: user.id,
            };

            const { error } = await supabase.from('locations').insert(locationPayload);
            if (error) throw error;

            toast({ title: 'Lieu ajouté!', description: 'Merci pour votre contribution!' });
            navigate('/discover');

        } catch (error) {
            toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!user) {
            toast({ title: 'Authentification requise', description: 'Veuillez vous connecter.', variant: 'destructive' });
            return;
        }

        setDeleteLoading(true);
        try {
            // Réinitialiser tous les champs du formulaire
            setFormData({
                name: '',
                description: '',
                type_id: '',
                address: '',
                city: '',
                country: 'Côte d\'Ivoire',
                google_maps_link: '',
                website: '',
                phone_number: '',
                images_files: [],
            });

            toast({ title: 'Formulaire vidé', description: 'Tous les champs ont été réinitialisés.' });
        } catch (error) {
            toast({ title: 'Erreur', description: 'Impossible de vider le formulaire.', variant: 'destructive' });
        } finally {
            setDeleteLoading(false);
            setShowDeleteConfirm(false);
        }
    };

    const confirmDelete = () => {
        setShowDeleteConfirm(true);
    };

    const cancelDelete = () => {
        setShowDeleteConfirm(false);
    };

    const availableCities = useCallback(() => {
        return formData.country ? CITIES_BY_COUNTRY[formData.country] || [] : [];
    }, [formData.country]);

    const canSubmit = formData.name && formData.type_id && formData.address && formData.city && formData.country;
    const hasData = formData.name || formData.description || formData.type_id || formData.address ||
        formData.city || formData.google_maps_link || formData.website ||
        formData.phone_number || formData.images_files.length > 0;

    return (
        <div className="min-h-screen bg-background">
            <Helmet><title>Ajouter un lieu</title></Helmet>
            <main className="container mx-auto max-w-2xl px-4 py-8">
                <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Retour
                </Button>
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Ajouter un nouveau lieu</CardTitle>
                                <CardDescription>Partagez vos bons plans avec la communauté.</CardDescription>
                            </div>
                            {hasData && (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={confirmDelete}
                                    disabled={deleteLoading}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    {deleteLoading ? 'Suppression...' : 'Tout supprimer'}
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Modal de confirmation de suppression */}
                        {showDeleteConfirm && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                <Card className="w-full max-w-md mx-4">
                                    <CardHeader>
                                        <CardTitle className="text-destructive">Confirmer la suppression</CardTitle>
                                        <CardDescription>
                                            Êtes-vous sûr de vouloir supprimer toutes les données du formulaire ?
                                            Cette action est irréversible.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex gap-2 justify-end">
                                            <Button
                                                variant="outline"
                                                onClick={cancelDelete}
                                                disabled={deleteLoading}
                                            >
                                                Annuler
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                onClick={handleDelete}
                                                disabled={deleteLoading}
                                            >
                                                {deleteLoading ? (
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                )}
                                                Supprimer tout
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="name">Nom du lieu *</Label>
                                    <Input id="name" value={formData.name} onChange={e => handleInputChange('name', e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="type_id">Type de lieu *</Label>
                                    <Select value={formData.type_id} onValueChange={value => handleInputChange('type_id', value)}>
                                        <SelectTrigger><SelectValue placeholder="Choisir un type..." /></SelectTrigger>
                                        <SelectContent>
                                            {locationTypes.map(type => (
                                                <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address">Adresse *</Label>
                                    <Input id="address" value={formData.address} onChange={e => handleInputChange('address', e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="country">Pays *</Label>
                                    <Select value={formData.country} onValueChange={handleCountryChange}>
                                        <SelectTrigger><SelectValue placeholder="Choisir un pays..." /></SelectTrigger>
                                        <SelectContent>
                                            {COUNTRIES.map(c => <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="city">Ville *</Label>
                                    <Select value={formData.city} onValueChange={value => handleInputChange('city', value)} disabled={!formData.country || availableCities().length === 0}>
                                        <SelectTrigger><SelectValue placeholder="Choisir une ville..." /></SelectTrigger>
                                        <SelectContent>
                                            {availableCities().map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea id="description" value={formData.description} onChange={e => handleInputChange('description', e.target.value)} />
                            </div>

                            {/* Section Images avec prévisualisation et suppression */}
                            <div className="space-y-4">
                                <Label htmlFor="images">Images (5 max)</Label>
                                <Input id="images" type="file" multiple accept="image/*" onChange={handleFileChange} />

                                {/* Prévisualisation des images avec bouton de suppression */}
                                {formData.images_files.length > 0 && (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                                        {Array.from(formData.images_files).map((file, index) => (
                                            <div key={index} className="relative group">
                                                <img
                                                    src={URL.createObjectURL(file)}
                                                    alt={`Preview ${index + 1}`}
                                                    className="w-full h-24 object-cover rounded-lg border"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="sm"
                                                    className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => removeImage(index)}
                                                >
                                                    <X className="w-3 h-3" />
                                                </Button>
                                                <div className="text-xs text-center mt-1 truncate">
                                                    {file.name}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="google_maps_link">Lien Google Maps</Label>
                                    <Input id="google_maps_link" value={formData.google_maps_link} onChange={e => handleInputChange('google_maps_link', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="website">Site Web</Label>
                                    <Input id="website" value={formData.website} onChange={e => handleInputChange('website', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone_number">Téléphone</Label>
                                    <Input id="phone_number" value={formData.phone_number} onChange={e => handleInputChange('phone_number', e.target.value)} />
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => navigate(-1)}
                                    className="flex-1"
                                >
                                    Annuler
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={loading || !canSubmit}
                                    className="flex-1"
                                >
                                    {loading ? <Loader2 className="animate-spin mr-2" /> : 'Ajouter le lieu'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
};

export default AddLocationPage;