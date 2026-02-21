import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { getWithdrawalStatusColor, getStatusText } from '@/utils/withdrawalMetrics';

const SecretaryReadOnlyView = ({ event, metrics }) => {
  if (!event || !metrics) return null;

  const status = metrics.status || 'AUCUNE_DEMANDE';
  const isBelowThreshold = (metrics.scanPercentage || 0) < 30;

  const getStatusIcon = (status) => {
    switch(status) {
      case 'VALIDE':
      case 'APPROVED':
        return <CheckCircle className="h-3 w-3 mr-1" />;
      case 'REFUSE':
      case 'REJECTED':
        return <XCircle className="h-3 w-3 mr-1" />;
      case 'EN_ATTENTE':
      case 'PENDING':
        return <Clock className="h-3 w-3 mr-1" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge 
              variant="outline" 
              className={`${getWithdrawalStatusColor(status)} flex items-center px-2 py-1`}
            >
              {getStatusIcon(status)}
              {getStatusText(status)}
              {isBelowThreshold && (status === 'EN_ATTENTE' || status === 'PENDING') && (
                <AlertTriangle className="ml-1 h-3 w-3 text-amber-500" />
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              <p>Taux de présence: {metrics.scanPercentage || 0}%</p>
              <p>Participants: {metrics.totalTickets || 0}</p>
              <p>Montant: {metrics.netAmount || 0} pièces</p>
              {isBelowThreshold && (
                <p className="text-amber-500">⚠️ Seuil non atteint (&lt;30%)</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default SecretaryReadOnlyView;