/**
 * Utilitaires pour vérifier et tester les fichiers audio de l'application.
 */

export const checkSoundFile = async () => {
  console.info('[SoundHelper] 🔍 Vérification de la présence de /sounds/success.mp3...');
  try {
    const res = await fetch('/sounds/success.mp3', { method: 'HEAD' });
    if (res.ok) {
      console.info('[SoundHelper] ✅ Fichier audio trouvé !');
      return true;
    } else {
      console.warn(`[SoundHelper] ❌ Fichier audio INTROUVABLE ! (Statut: ${res.status}). Veuillez placer success.mp3 dans public/sounds/`);
      return false;
    }
  } catch (e) {
    console.error('[SoundHelper] ❌ Erreur réseau lors de la vérification du fichier audio:', e);
    return false;
  }
};

export const testNotificationSound = () => {
  console.info('[SoundHelper] 🎵 Test manuel du son de notification...');
  try {
    const audio = new Audio('/sounds/success.mp3');
    audio.volume = 0.5;
    audio.play()
      .then(() => console.info('[SoundHelper] ✅ Test réussi'))
      .catch(e => console.error('[SoundHelper] ❌ Test échoué (cliquez sur la page d\'abord):', e));
  } catch (err) {
    console.error('[SoundHelper] ❌ Erreur critique lors du test:', err);
  }
};