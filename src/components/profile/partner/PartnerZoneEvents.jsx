import React from 'react';
import SecretaryEventModerationTab from '@/components/secretary/SecretaryEventModerationTab';

// Reusing the robust Secretary Moderation component as it fits the requirements perfectly
// The component handles fetching by country (from user profile) and offers moderation tools
const PartnerZoneEvents = () => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Gestion des Événements de la Zone</h3>
      <SecretaryEventModerationTab />
    </div>
  );
};

export default PartnerZoneEvents;