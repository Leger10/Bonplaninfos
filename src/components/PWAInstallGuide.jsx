import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Share, 
  PlusSquare, 
  X, 
  Smartphone, 
  Download, 
  MoreVertical,
  Monitor,
  Chrome,
  Menu
} from 'lucide-react';

const PWAInstallGuide = ({ isOpen, onClose }) => {
  const [os, setOs] = React.useState('ios');

  React.useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    if (/android/.test(ua)) setOs('android');
    else if (/iphone|ipad|ipod/.test(ua)) setOs('ios');
    else setOs('desktop');
  }, []);

  const IosGuide = () => (
    <div className="space-y-5">
      <Step icon={<Share className="w-6 h-6 text-blue-500" />} text="Appuyez sur le bouton **Partager** dans Safari." />
      <Step icon={<PlusSquare className="w-6 h-6 text-green-500" />} text="Faites défiler et sélectionnez **Sur l'écran d'accueil**." />
      <Step icon={<div className="font-bold text-white bg-blue-600 px-3 py-1.5 rounded-md text-sm">Ajouter</div>} text="Appuyez sur **Ajouter** en haut à droite." />
    </div>
  );

  const AndroidGuide = () => (
    <div className="space-y-5">
      <Step icon={<MoreVertical className="w-6 h-6 text-gray-300" />} text="Appuyez sur le **menu à trois points** (⋮) de Chrome." />
      <Step icon={<Download className="w-6 h-6 text-blue-500" />} text="Sélectionnez **Installer l'application**." />
      <Step icon={<div className="font-bold text-white bg-green-600 px-3 py-1.5 rounded-md text-sm">Installer</div>} text="Confirmez l'installation." />
    </div>
  );

  const DesktopGuide = () => (
    <div className="space-y-5">
      <Step icon={<Chrome className="w-6 h-6 text-blue-500" />} text="Dans Chrome/Edge, regardez la **barre d'adresse**." />
      <Step icon={<Download className="w-6 h-6 text-green-500" />} text="Cliquez sur l'icône **d'installation** (📲) à droite de l'URL." />
      <Step icon={<Menu className="w-6 h-6 text-gray-300" />} text="Ou cliquez sur le menu **⋮** → **Installer l'application**." />
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="relative w-full max-w-md bg-black text-white rounded-t-3xl sm:rounded-3xl p-6 z-20 border border-gray-800"
          >
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Installer l'application
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                {os === 'ios' ? 'Sur iPhone / iPad' : os === 'android' ? 'Sur Android' : 'Sur ordinateur'}
              </p>
            </div>

            {os === 'ios' && <IosGuide />}
            {os === 'android' && <AndroidGuide />}
            {os === 'desktop' && <DesktopGuide />}

            <button
              onClick={onClose}
              className="w-full mt-8 py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all"
            >
              J'ai compris
            </button>
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X size={22} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const Step = ({ icon, text }) => (
  <div className="flex items-center gap-4 bg-gray-900/50 p-4 rounded-2xl border border-gray-800">
    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center border border-gray-700">
      {icon}
    </div>
    <p className="text-sm font-medium leading-tight text-gray-200">
      {text.split('**').map((part, i) => 
        i % 2 === 1 ? <strong key={i} className="text-blue-400">{part}</strong> : part
      )}
    </p>
  </div>
);

export default PWAInstallGuide;