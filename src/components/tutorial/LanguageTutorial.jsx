import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hand, Menu, Globe, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import SuccessMessage from './SuccessMessage';

const LanguageTutorial = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [step, setStep] = useState(0); // 0: point to menu, 1: lang select, 2: success
    const { changeLanguage } = useLanguage();

    useEffect(() => {
        // Logique d'affichage unique via localStorage et restriction Mobile
        const checkTutorial = () => {
            const hasSeen = localStorage.getItem('hasSeenLangTutorial');
            // Considérer comme mobile si la largeur est < 768px
            const isMobile = window.innerWidth < 768;
            
            if (!hasSeen && isMobile) {
                // Petit délai pour laisser la page charger avant de montrer le tuto
                const timer = setTimeout(() => setIsVisible(true), 2000);
                return () => clearTimeout(timer);
            }
        };

        const cleanup = checkTutorial();
        return cleanup;
    }, []);

    const completeTutorial = () => {
        localStorage.setItem('hasSeenLangTutorial', 'true');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed inset-0 z-[100] pointer-events-auto flex items-center justify-center">
                    {/* Overlay sombre */}
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                    />
                    
                    {/* Bouton pour ignorer */}
                    <button 
                        onClick={completeTutorial} 
                        className="absolute top-4 right-4 text-foreground z-10 flex items-center gap-2 bg-secondary px-4 py-2 rounded-full text-sm font-medium shadow-md border border-border"
                    >
                        Ignorer <X className="w-4 h-4"/>
                    </button>

                    {/* Étape 1 : Montrer le menu */}
                    {step === 0 && (
                        <div className="absolute top-4 left-4 z-10">
                            {/* Simulation du bouton Menu (qui se trouve généralement en haut à gauche sur mobile) */}
                            <div className="bg-background rounded-md p-2 relative shadow-[0_0_0_4px_rgba(var(--primary),0.5)] z-20">
                                <Menu className="w-6 h-6 text-foreground" />
                            </div>
                            
                            {/* Doigt animé */}
                            <motion.div 
                                animate={{ y: [0, -15, 0], scale: [1, 0.9, 1] }} 
                                transition={{ repeat: Infinity, duration: 1.5 }}
                                className="absolute -bottom-14 left-4 flex flex-col items-center z-20 pointer-events-none"
                            >
                                <Hand className="w-10 h-10 text-primary fill-primary rotate-0 drop-shadow-xl" />
                            </motion.div>
                            
                            {/* Bulle d'instruction */}
                            <motion.div 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="absolute top-16 left-0 bg-card border border-border text-card-foreground p-4 rounded-xl shadow-2xl w-64 text-sm font-medium z-10"
                            >
                                <h4 className="font-bold text-base mb-1 text-primary">Bienvenue ! 👋</h4>
                                <p className="text-muted-foreground mb-3">Cliquez sur le menu en haut à gauche pour changer la langue de l'application.</p>
                                <button 
                                    onClick={() => setStep(1)} 
                                    className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-bold w-full text-center shadow-sm"
                                >
                                    C'est compris
                                </button>
                            </motion.div>
                        </div>
                    )}

                    {/* Étape 2 : Choix de la langue */}
                    {step === 1 && (
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="relative z-10 w-[90%] max-w-sm"
                        >
                            <div className="bg-card rounded-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.2)] border-2 border-primary flex flex-col gap-4 relative">
                                <h3 className="font-bold text-xl flex items-center gap-3 border-b border-border pb-3 text-foreground">
                                    <Globe className="w-6 h-6 text-primary"/> 
                                    Choisir la langue
                                </h3>
                                
                                <div className="space-y-3 mt-2">
                                    <button 
                                        className="w-full p-4 text-left bg-secondary hover:bg-secondary/80 rounded-xl transition-all font-semibold border border-border flex items-center gap-3 text-lg"
                                        onClick={() => {
                                            changeLanguage('fr');
                                            setStep(2);
                                        }}
                                    >
                                        <span className="text-2xl">🇫🇷</span> Français
                                    </button>
                                    <button 
                                        className="w-full p-4 text-left bg-secondary hover:bg-secondary/80 rounded-xl transition-all font-semibold border border-border flex items-center gap-3 text-lg"
                                        onClick={() => {
                                            changeLanguage('en');
                                            setStep(2);
                                        }}
                                    >
                                        <span className="text-2xl">🇬🇧</span> English
                                    </button>
                                </div>

                                {/* Doigt animé pointant vers les options */}
                                <motion.div 
                                    animate={{ x: [0, 15, 0] }} 
                                    transition={{ repeat: Infinity, duration: 1.2 }}
                                    className="absolute top-1/2 -right-12 pointer-events-none hidden sm:block"
                                >
                                    <Hand className="w-12 h-12 text-primary fill-primary -rotate-90 drop-shadow-xl" />
                                </motion.div>
                            </div>
                            
                            <div className="mt-6 bg-primary/10 text-foreground border border-primary/20 p-4 rounded-xl shadow-lg text-sm font-medium text-center">
                                Sélectionnez votre langue préférée pour configurer l'interface.
                            </div>
                        </motion.div>
                    )}

                    {/* Étape 3 : Message de Succès */}
                    {step === 2 && (
                        <SuccessMessage 
                            message="La langue de l'application a été configurée selon votre choix. Vous pouvez la modifier à tout moment depuis le menu !" 
                            onClose={completeTutorial} 
                        />
                    )}
                </div>
            )}
        </AnimatePresence>
    );
};

export default LanguageTutorial;