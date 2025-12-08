import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react'; // Using MessageCircle as a generic chat icon
import { useTranslation } from 'react-i18next';

const WhatsAppCommunityButton = ({ className }) => {
  const { t } = useTranslation();
  const whatsappLink = "https://chat.whatsapp.com/IcR0TttLYpU1lJXr3ifyvH";

  return (
    <motion.a
      href={whatsappLink}
      target="_blank"
      rel="noopener noreferrer"
      className={`block w-full ${className}`}
      whileHover={{ scale: 1.02, boxShadow: "0 8px 20px -4px rgba(37, 211, 102, 0.6)" }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
    >
      <Button
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-white font-semibold"
        style={{
          backgroundColor: '#25D366', // WhatsApp Green
          boxShadow: "0 4px 12px -2px rgba(37, 211, 102, 0.4)",
        }}
        onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
        onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
      >
        <motion.span
          initial={{ rotate: 0 }}
          whileHover={{ rotate: [0, 10, -10, 10, -10, 0] }}
          transition={{ duration: 0.8, ease: "easeInOut", repeat: 0 }}
        >
          <MessageCircle className="w-5 h-5" />
        </motion.span>
        <span>{t('Rejoignez le groupe WhatsApp de votre pays')}</span>
      </Button>
    </motion.a>
  );
};

export default WhatsAppCommunityButton;