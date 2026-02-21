// ScreenCaptureBlocker.jsx - Version corrigée
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const ScreenCaptureBlocker = () => {
  const { t, ready } = useTranslation('security');
  const [text, setText] = useState('© BonPlanInfos - Capture d\'écran non autorisée');

  useEffect(() => {
    if (ready) {
      setText(t('screenshot_warning_watermark', '© BonPlanInfos - Capture d\'écran non autorisée'));
    }
  }, [ready, t]);

  return (
    <div
      className="screenshot-overlay"
      data-text={text}
    />
  );
};

export default ScreenCaptureBlocker;