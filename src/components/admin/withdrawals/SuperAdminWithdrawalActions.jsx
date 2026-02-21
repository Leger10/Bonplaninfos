import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  MoreVertical, Check, X, AlertTriangle, 
  MessageSquare, Phone, Eye, PlayCircle, Ban, RotateCcw
} from 'lucide-react';

// Import modals
import ApproveWithdrawalModal from './modals/ApproveWithdrawalModal';
import RejectWithdrawalModal from './modals/RejectWithdrawalModal';
import RefundParticipantsModal from './modals/RefundParticipantsModal'; // Verified Import
import CreateWithdrawalRequestModal from './modals/CreateWithdrawalRequestModal';
import { getStatusBadgeColor, getStatusText } from '@/utils/withdrawalMetrics';

const SuperAdminWithdrawalActions = ({ 
  event, 
  metrics, 
  adminId, 
  onActionComplete,
  isReadOnly = false 
}) => {
  const [activeModal, setActiveModal] = useState(null);

  if (!event) return null;

  // Defensive checks
  const safeMetrics = metrics || {};
  const organizer = event.organizer || {};
  const verificationRate = safeMetrics.verificationRate || safeMetrics.scanPercentage || 0;
  const isBelowThreshold = verificationRate < 30;
  const status = safeMetrics.status || 'AUCUNE_DEMANDE';
  
  // Use safeMetrics.ticketsSold or check if any tickets exist via metrics
  const hasTickets = (safeMetrics.totalTickets || safeMetrics.ticketsSold || 0) > 0;
  
  const handleAction = (actionType) => setActiveModal(actionType);
  const closeModals = () => setActiveModal(null);
  const handleComplete = () => {
    closeModals();
    if (onActionComplete) onActionComplete();
  };

  if (isReadOnly) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={getStatusBadgeColor(status)}>
          {getStatusText(status)}
        </Badge>
        {isBelowThreshold && (status === 'EN_ATTENTE' || status === 'PENDING') && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Seuil de présence non atteint ({verificationRate}%)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        {/* Status Badge */}
        <Badge variant="outline" className={`${getStatusBadgeColor(status)} hidden md:inline-flex`}>
          {getStatusText(status)}
          {isBelowThreshold && (status === 'EN_ATTENTE' || status === 'PENDING') && (
            <AlertTriangle className="ml-1 h-3 w-3 text-amber-500" />
          )}
        </Badge>

        {/* Action Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-300 hover:text-white">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 bg-gray-800 border-gray-700 text-white">
            <DropdownMenuLabel>Actions - {event.title ? event.title.substring(0, 30) : 'Événement'}...</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-700" />

            {/* Create Request */}
            {status === 'AUCUNE_DEMANDE' && (
              <DropdownMenuItem onClick={() => handleAction('create')} className="hover:bg-gray-700">
                <PlayCircle className="mr-2 h-4 w-4 text-blue-400" />
                <span>Créer demande de retrait</span>
              </DropdownMenuItem>
            )}

            {/* Approve/Reject */}
            {(status === 'EN_ATTENTE' || status === 'PENDING') && (
              <>
                <DropdownMenuItem 
                  onClick={() => handleAction('approve')}
                  className="text-green-400 hover:bg-gray-700"
                >
                  <Check className="mr-2 h-4 w-4" />
                  <span>Valider le retrait</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  onClick={() => handleAction('reject')}
                  className="text-red-400 hover:bg-gray-700"
                >
                  <X className="mr-2 h-4 w-4" />
                  <span>Refuser la demande</span>
                </DropdownMenuItem>
              </>
            )}

            {/* Auto-reject */}
            {isBelowThreshold && (status === 'EN_ATTENTE' || status === 'PENDING') && (
              <>
                <DropdownMenuSeparator className="bg-gray-700" />
                <DropdownMenuItem 
                  onClick={() => handleAction('autoReject')}
                  className="text-amber-400 hover:bg-gray-700"
                >
                  <Ban className="mr-2 h-4 w-4" />
                  <span>Refus auto (Taux &lt; 30%)</span>
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuSeparator className="bg-gray-700" />

            {/* Refund options */}
            {hasTickets && (
              <DropdownMenuItem 
                onClick={() => handleAction('refund')}
                className="text-orange-400 hover:bg-gray-700"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                <span>Rembourser participants</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator className="bg-gray-700" />

            {/* Communication */}
            <DropdownMenuItem 
              onClick={() => {
                if (organizer.phone) window.open(`tel:${organizer.phone}`);
                else if (organizer.email) window.open(`mailto:${organizer.email}`);
              }}
              disabled={!organizer.phone && !organizer.email}
              className="hover:bg-gray-700"
            >
              <Phone className="mr-2 h-4 w-4 text-blue-400" />
              <span>Contacter l'organisateur</span>
            </DropdownMenuItem>

            {/* Info */}
            <DropdownMenuItem className="hover:bg-gray-700">
              <Eye className="mr-2 h-4 w-4" />
              <span>Détails: {verificationRate}% / {safeMetrics.netAmount || 0} p</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Modals */}
      {activeModal === 'create' && (
        <CreateWithdrawalRequestModal
          isOpen={true}
          onClose={closeModals}
          event={event}
          metrics={safeMetrics}
          adminId={adminId}
          onConfirm={handleComplete}
        />
      )}

      {activeModal === 'approve' && (
        <ApproveWithdrawalModal
          isOpen={true}
          onClose={closeModals}
          event={event}
          metrics={safeMetrics}
          adminId={adminId}
          onConfirm={handleComplete}
        />
      )}

      {activeModal === 'reject' && (
        <RejectWithdrawalModal
          isOpen={true}
          onClose={closeModals}
          event={event}
          metrics={safeMetrics}
          adminId={adminId}
          onConfirm={handleComplete}
        />
      )}

      {activeModal === 'autoReject' && (
        <RejectWithdrawalModal
          isOpen={true}
          onClose={closeModals}
          event={event}
          metrics={safeMetrics}
          adminId={adminId}
          onConfirm={handleComplete}
          autoReason="Taux de scan insuffisant (< 30%)"
          autoRefund={true}
        />
      )}

      {activeModal === 'refund' && (
        <RefundParticipantsModal
          isOpen={true}
          onClose={closeModals}
          event={event}
          metrics={safeMetrics}
          adminId={adminId}
          onConfirm={handleComplete}
        />
      )}
    </>
  );
};

export default SuperAdminWithdrawalActions;