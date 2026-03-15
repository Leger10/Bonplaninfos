import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SuccessMessage = ({ message, onClose }) => {
    const { t } = useTranslation();
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div 
                className="bg-card text-card-foreground rounded-2xl p-6 sm:p-8 flex flex-col items-center shadow-2xl max-w-sm w-full text-center border border-border" 
                onClick={e => e.stopPropagation()}
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                >
                    <CheckCircle className="w-20 h-20 text-green-500 mb-4" />
                </motion.div>
                
                <h3 className="text-2xl font-bold mb-2">Succès !</h3>
                <p className="text-muted-foreground mb-8 text-sm sm:text-base">{message}</p>
                
                <button 
                    onClick={onClose} 
                    className="bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-8 py-3 rounded-full font-semibold w-full shadow-lg"
                >
                    Continuer
                </button>
            </div>
        </motion.div>
    );
};

export default SuccessMessage;