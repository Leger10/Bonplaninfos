import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, Lock, ShieldCheck, AlertTriangle, Key, Camera } from 'lucide-react';
import PinResetRequestModal from './PinResetRequestModal';
import { useTranslation } from 'react-i18next';

const PinVerificationModal = ({
  isOpen,
  onClose,
  onSuccess,
  userId,
  userProfile,
  failedAttempts = 0,
  onIncrementFailed,
  onLockAccount,
  isLocked = false
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const audioRef = useRef(null);

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showIntimidation, setShowIntimidation] = useState(false);
  const [localAttempts, setLocalAttempts] = useState(0);

  const isSettingUp = !userProfile?.wallet_pin;

  // Initialiser l'audio
  useEffect(() => {
    audioRef.current = new Audio('/sounds/warning.mp3');
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Réinitialiser quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setConfirmPin('');
      setError(null);
      setShowIntimidation(false);
      
      // Réinitialiser les tentatives locales si le compte n'est pas verrouillé
      if (!isLocked) {
        setLocalAttempts(0);
      }
    }
  }, [isOpen, isLocked]);

  // Jouer le son d'avertissement
  const playWarningSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log('Audio playback failed:', e));
    }
  };

  // Faire vibrer le téléphone
  const vibrate = (pattern = [200, 100, 200]) => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(pattern);
    }
  };

  const handleVerify = async () => {
    // Vérifier si le compte est verrouillé
    if (isLocked) {
      setError(t('pinVerification.errors.locked'));
      return;
    }

    // Validation du format
    if (pin.length !== 4) {
      setError(t('pinVerification.errors.pinLength'));
      
      // Vibration d'erreur
      vibrate(100);
      return;
    }

    try {
      setLoading(true);

      if (isSettingUp) {
        // === MODE CONFIGURATION ===
        if (pin !== confirmPin) {
          setError(t('pinVerification.errors.pinMismatch'));
          
          // Vibration d'erreur
          vibrate(100);
          setLoading(false);
          return;
        }

        // Enregistrer le nouveau PIN
        const { error } = await supabase
          .from('profiles')
          .update({ wallet_pin: pin })
          .eq('id', userId);

        if (error) throw error;

        toast({
          title: t('pinVerification.toast.pinSetupSuccess'),
          description: t('pinVerification.toast.pinSetupDescription'),
          variant: "success"
        });

        onSuccess();

      } else {
        // === MODE VÉRIFICATION ===
        
        // Incrémenter les tentatives locales
        const newAttemptCount = localAttempts + 1;
        setLocalAttempts(newAttemptCount);

        // Récupérer le PIN depuis la base
        const { data } = await supabase
          .from('profiles')
          .select('wallet_pin')
          .eq('id', userId)
          .single();

        if (data.wallet_pin === pin) {
          // PIN correct - réinitialiser et déverrouiller
          setLocalAttempts(0);
          if (onIncrementFailed) onIncrementFailed(0); // Réinitialiser le compteur global
          onSuccess();
        } else {
          // PIN incorrect
          
          // Vibration d'erreur plus intense selon le nombre de tentatives
          if (newAttemptCount === 2) {
            vibrate([100, 50, 100]);
          } else if (newAttemptCount === 3) {
            vibrate([300, 100, 300, 100, 300]);
            playWarningSound(); // Jouer le son d'avertissement
          } else {
            vibrate(100);
          }

          // Incrémenter le compteur global
          if (onIncrementFailed) {
            onIncrementFailed();
          }

          // Gestion des messages selon le nombre de tentatives
          if (newAttemptCount === 1) {
            setError(t('pinVerification.errors.attemptsLeft', { count: 2 }));
          } 
          else if (newAttemptCount === 2) {
            setError(t('pinVerification.errors.lastAttempt'));
            setShowIntimidation(true);
          } 
          else if (newAttemptCount >= 3) {
            // 3ème échec - afficher le message d'intimidation et verrouiller
            setError(t('pinVerification.errors.tooManyAttempts'));
            setShowIntimidation(true);
            
            // Simuler la capture de visage
            toast({
              title: t('pinVerification.toast.securityAlert'),
              description: t('pinVerification.toast.securityAlertDescription'),
              variant: "destructive",
              duration: 8000
            });

            // Verrouiller le compte
            if (onLockAccount) {
              onLockAccount();
            }

            // Fermer le modal après 3 secondes
            setTimeout(() => {
              onClose(false);
            }, 3000);
          }
        }
      }

    } catch (err) {
      console.error('PIN Error:', err);
      setError(t('pinVerification.errors.verificationError'));
      vibrate(100);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading && !isLocked) {
      handleVerify();
    }
  };

  // Message d'intimidation
  const IntimidationMessage = () => {
    if (!showIntimidation || isSettingUp) return null;

    return (
      <div className="bg-red-100 border-2 border-red-500 text-red-700 px-4 py-3 rounded-lg animate-pulse">
        <div className="flex items-center gap-2 font-bold text-lg mb-2">
          <Camera className="w-6 h-6 text-red-600" />
          <span>{t('pinVerification.intimidation.title')}</span>
        </div>
        <p className="text-sm mb-2">
          {t('pinVerification.intimidation.message', { count: localAttempts })}
        </p>
        <ul className="list-disc list-inside text-sm space-y-1">
          <li>{t('pinVerification.intimidation.bullet1')}</li>
          <li>{t('pinVerification.intimidation.bullet2')}</li>
          <li>{t('pinVerification.intimidation.bullet3')}</li>
          <li>{t('pinVerification.intimidation.bullet4')}</li>
        </ul>
        <p className="text-sm font-bold mt-2">
          {t('pinVerification.intimidation.footer')}
        </p>
      </div>
    );
  };

  // Message de verrouillage
  if (isLocked) {
    return (
      <Dialog open={isOpen} onOpenChange={(val) => !loading && onClose(val)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Lock className="w-5 h-5" />
              {t('pinVerification.locked.title')}
            </DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="bg-red-100 rounded-full p-4">
                <AlertTriangle className="w-12 h-12 text-red-600" />
              </div>
            </div>
            <p className="font-bold text-lg">{t('pinVerification.locked.message')}</p>
            <p className="text-muted-foreground">
              {t('pinVerification.locked.description')}
            </p>
            <Button 
              variant="link" 
              onClick={() => setShowResetModal(true)}
              className="mt-4"
            >
              <Key className="w-4 h-4 mr-2" />
              {t('pinVerification.buttons.forgotPin')}
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => onClose(false)}>{t('pinVerification.buttons.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(val) => !loading && onClose(val)}>
        <DialogContent className="sm:max-w-md">

          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isSettingUp ? (
                <ShieldCheck className="w-5 h-5 text-primary" />
              ) : (
                <Lock className="w-5 h-5 text-primary" />
              )}
              {isSettingUp ? t('pinVerification.setupTitle') : t('pinVerification.verifyTitle')}
            </DialogTitle>

            <DialogDescription>
              {isSettingUp
                ? t('pinVerification.setupDescription')
                : t('pinVerification.verifyDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-6">
            
            {/* Message d'intimidation */}
            <IntimidationMessage />

            {/* Champ PIN */}
            <div className="space-y-2">
              <Label htmlFor="pin" className="text-sm font-medium">
                {t('pinVerification.inputLabel')}
              </Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                placeholder={t('pinVerification.inputPlaceholder')}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                onKeyDown={handleKeyDown}
                className="text-center text-3xl tracking-[0.5em] font-mono h-14"
                autoFocus
                disabled={loading}
              />
            </div>

            {/* Confirmation PIN (uniquement en mode configuration) */}
            {isSettingUp && (
              <div className="space-y-2">
                <Label htmlFor="confirmPin" className="text-sm font-medium">
                  {t('pinVerification.confirmLabel')}
                </Label>
                <Input
                  id="confirmPin"
                  type="password"
                  inputMode="numeric"
                  pattern="\d{4}"
                  maxLength={4}
                  placeholder={t('pinVerification.confirmPlaceholder')}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={handleKeyDown}
                  className="text-center text-3xl tracking-[0.5em] font-mono h-14"
                  disabled={loading}
                />
              </div>
            )}

            {/* Message d'erreur */}
            {error && (
              <div className="text-sm text-destructive flex items-center gap-2 bg-destructive/10 p-3 rounded-lg">
                <AlertTriangle size={16} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Tentatives restantes (mode vérification) */}
            {!isSettingUp && localAttempts > 0 && (
              <div className="text-sm text-amber-600 flex items-center gap-2">
                <AlertTriangle size={16} />
                <span>
                  {localAttempts === 2 
                    ? t('pinVerification.errors.lastAttempt')
                    : t('pinVerification.errors.attemptsLeft', { count: 3 - localAttempts })
                  }
                </span>
              </div>
            )}

            {/* Lien "PIN oublié" (mode vérification) */}
            {!isSettingUp && (
              <div className="text-center">
                <Button 
                  variant="link" 
                  onClick={() => setShowResetModal(true)}
                  className="text-muted-foreground hover:text-primary"
                >
                  <Key size={14} className="mr-1" />
                  {t('pinVerification.buttons.forgotPin')}
                </Button>
              </div>
            )}

          </div>

          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => onClose(false)} 
              disabled={loading}
              className="flex-1"
            >
              {t('pinVerification.buttons.cancel')}
            </Button>
            <Button 
              onClick={handleVerify} 
              disabled={loading || pin.length !== 4 || (isSettingUp && confirmPin.length !== 4) || isLocked}
              className="flex-1"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {isSettingUp ? t('pinVerification.buttons.save') : t('pinVerification.buttons.unlock')}
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>

      {/* Modal de demande de réinitialisation */}
      <PinResetRequestModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        userId={userId}
      />
    </>
  );
};

export default PinVerificationModal;