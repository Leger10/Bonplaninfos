import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, Upload, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const PinResetRequestModal = ({ isOpen, onClose, userId }) => {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [idPhoto, setIdPhoto] = useState(null);
  const [idPhotoPreview, setIdPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) resetForm();
  }, [isOpen]);

  const resetForm = () => {
    setStep(1);
    setPhoneNumber('');
    setIdPhoto(null);
    setIdPhotoPreview(null);
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: t('pinResetRequest.errors.unsupportedFormat'),
        description: t('pinResetRequest.errors.unsupportedFormatDescription'),
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t('pinResetRequest.errors.fileTooLarge'),
        description: t('pinResetRequest.errors.fileTooLargeDescription'),
        variant: "destructive"
      });
      return;
    }

    setIdPhoto(file);
    const reader = new FileReader();
    reader.onloadend = () => setIdPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const uploadIdPhoto = async () => {
    const fileExt = idPhoto.name.split('.').pop();
    const filePath = `${userId}/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from('id_photos')
      .upload(filePath, idPhoto);

    if (error) throw error;

    return filePath;
  };

  const handleSubmit = async () => {
    if (!phoneNumber || phoneNumber.length < 8) {
      toast({
        title: t('pinResetRequest.errors.invalidPhone'),
        description: t('pinResetRequest.errors.invalidPhoneDescription'),
        variant: "destructive"
      });
      return;
    }

    if (!idPhoto) {
      toast({
        title: t('pinResetRequest.errors.photoRequired'),
        description: t('pinResetRequest.errors.photoRequiredDescription'),
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      const photoPath = await uploadIdPhoto();

      const { error } = await supabase
        .from('pin_reset_requests')
        .insert({
          user_id: userId,
          phone_number: phoneNumber,
          id_photo_url: photoPath,
          status: 'pending'
        });

      if (error) throw error;

      setStep(2);

      toast({
        title: t('pinResetRequest.toast.requestSent'),
        description: t('pinResetRequest.toast.requestSentDescription'),
      });

    } catch (err) {
      toast({
        title: t('pinResetRequest.toast.error'),
        description: t('pinResetRequest.toast.errorDescription'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !loading && !val && onClose()}>
      <DialogContent className="sm:max-w-md">

        <DialogHeader>
          <DialogTitle>
            {step === 1 ? t('pinResetRequest.step1.title') : t('pinResetRequest.step2.title')}
          </DialogTitle>

          <DialogDescription>
            {step === 1
              ? t('pinResetRequest.step1.description')
              : t('pinResetRequest.step2.description')}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="py-6 space-y-6">

            <div className="space-y-2">
              <Label>{t('pinResetRequest.form.phoneLabel')}</Label>
              <Input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={loading}
              />
            </div>

            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
              />

              {idPhotoPreview ? (
                <img src={idPhotoPreview} alt="ID preview" className="max-h-40 mx-auto rounded-lg" />
              ) : (
                <div>
                  <Upload className="mx-auto mb-2" />
                  <p>{t('pinResetRequest.form.idPhotoLabel')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('pinResetRequest.form.uploadHint')}</p>
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="py-8 text-center">
            <CheckCircle className="mx-auto mb-4 text-green-600" size={40} />
            <p>{t('pinResetRequest.step2.successMessage')}</p>
          </div>
        )}

        <DialogFooter>
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={onClose} disabled={loading}>
                {t('pinResetRequest.buttons.cancel')}
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {t('pinResetRequest.buttons.submit')}
              </Button>
            </>
          ) : (
            <Button onClick={onClose} className="w-full">
              {t('pinResetRequest.buttons.close')}
            </Button>
          )}
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
};

export default PinResetRequestModal;