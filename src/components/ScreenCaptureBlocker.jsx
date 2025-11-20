import React from 'react';
import { useTranslation } from 'react-i18next';

const ScreenCaptureBlocker = () => {
  const { t } = useTranslation();

  return (
    <div
      className="screenshot-overlay"
      data-text={t('security.screenshot_warning_watermark', '© BonPlanInfos - Capture d\'écran non autorisée')}
    ></div>
  );
};

export default ScreenCaptureBlocker;