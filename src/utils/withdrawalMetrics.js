import { format } from "date-fns";

/**
 * Calculate event metrics for withdrawal management
 * @param {Object} event - Event object with tickets, sales, etc.
 * @returns {Object} Calculated metrics
 */
export const calculateEventMetrics = (event) => {
  if (!event) {
    return {
      ticketsSold: 0,
      ticketsScanned: 0,
      scanPercentage: 0,
      grossAmount: 0,
      platformFee: 0,
      netAmount: 0,
      status: 'AUCUNE_DEMANDE',
      thresholdStatus: 'critical',
      potentialRefundAmount: 0
    };
  }

  // Récupérer les données des tickets
  const ticketsSold = event.tickets_sold || event.total_tickets || 0;
  const ticketsScanned = event.tickets_scanned || event.total_tickets_scanned || 0;
  
  // Prix du ticket : Utilisation de price_pi ou fallback
  const ticketPrice = event.ticket_price || event.price_pi || event.price || 0;

  // Calculs financiers
  const grossAmount = ticketsSold * ticketPrice;
  const platformFeePercent = event.platform_fee_percent || 5;
  const platformFee = Math.ceil(grossAmount * (platformFeePercent / 100));
  const netAmount = grossAmount - platformFee;
  const scanPercentage = ticketsSold > 0 ? Math.round((ticketsScanned / ticketsSold) * 100) : 0;

  // Déterminer le statut prioritaire
  let status = 'AUCUNE_DEMANDE';
  
  if (event.validation_status && Array.isArray(event.validation_status) && event.validation_status.length > 0) {
    const sortedStatus = [...event.validation_status].sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );
    const latestStatus = sortedStatus[0];
    status = latestStatus.status?.toUpperCase() || 'AUCUNE_DEMANDE';
  } else if (event.status === 'completed' || event.is_completed) {
     status = 'EN_ATTENTE';
  }

  if (status === 'PENDING') status = 'EN_ATTENTE';
  if (status === 'APPROVED') status = 'VALIDE';
  if (status === 'REJECTED') status = 'REFUSE';

  return {
    ticketsSold,
    ticketsScanned,
    scanPercentage,
    grossAmount,
    platformFee,
    netAmount,
    status,
    thresholdStatus: scanPercentage >= 30 ? 'ok' : 'critical',
    potentialRefundAmount: grossAmount,
    ticketPrice,
    platformFeePercent,
    formattedNetAmount: `${netAmount.toLocaleString()} pièces`,
    formattedGrossAmount: `${grossAmount.toLocaleString()} pièces`,
    verificationRate: scanPercentage, 
    totalTickets: ticketsSold,
    verifiedTickets: ticketsScanned
  };
};

export const getStatusBadgeColor = (status) => {
  const statusMap = {
    'VALIDE': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
    'APPROVED': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
    'REFUSE': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
    'REJECTED': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
    'EN_ATTENTE': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    'PENDING': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    'AUCUNE_DEMANDE': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700',
    'PAID': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    'CANCELLED': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700'
  };
  return statusMap[status] || statusMap['AUCUNE_DEMANDE'];
};

export const getWithdrawalStatusColor = (status) => {
  return getStatusBadgeColor(status);
};

export const getStatusText = (status) => {
  const textMap = {
    'VALIDE': 'Validé',
    'APPROVED': 'Validé',
    'REFUSE': 'Refusé',
    'REJECTED': 'Refusé',
    'EN_ATTENTE': 'En attente',
    'PENDING': 'En cours',
    'AUCUNE_DEMANDE': 'Aucune demande',
    'PAID': 'Payé',
    'CANCELLED': 'Annulé'
  };
  return textMap[status] || status;
};

export const formatCoins = (amount) => {
  if (!amount && amount !== 0) return '0';
  return new Intl.NumberFormat('fr-FR').format(amount) + ' pièces';
};

export const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '0 FCFA';
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
};

export const meetsAttendanceThreshold = (metrics, threshold = 30) => {
  const rate = metrics?.verificationRate || metrics?.scanPercentage || 0;
  return rate >= threshold;
};

/**
 * Calculate refund amount for participants
 * Updated to strictly use total_amount_pi
 */
export const calculateRefundAmount = (event, tickets = []) => {
  if (!event || !tickets.length) {
    return {
      totalRefund: 0,
      participantCount: 0,
      ticketCount: 0,
      averagePerTicket: 0,
      participants: []
    };
  }

  const participantMap = new Map();

  tickets.forEach(ticket => {
    const userId = ticket.user_id;
    if (!participantMap.has(userId)) {
      participantMap.set(userId, {
        userId,
        user: ticket.user || null,
        tickets: [],
        totalAmount: 0 
      });
    }

    const participant = participantMap.get(userId);
    participant.tickets.push(ticket);
    // CRITICAL FIX: Use total_amount_pi
    participant.totalAmount += Number(ticket.total_amount_pi) || 0;
  });

  const participants = Array.from(participantMap.values());
  const totalRefund = participants.reduce((sum, p) => sum + p.totalAmount, 0);
  const ticketCount = tickets.length;

  return {
    totalRefund,
    participantCount: participants.length,
    ticketCount,
    averagePerTicket: ticketCount > 0 ? Math.round(totalRefund / ticketCount) : 0,
    participants,
    formattedTotalRefund: formatCoins(totalRefund)
  };
};

export const getStatusHistory = (event) => {
  const history = [];

  if (event.validation_status && Array.isArray(event.validation_status) && event.validation_status.length > 0) {
    event.validation_status.forEach(status => {
      history.push({
        status: status.status,
        date: status.created_at,
        notes: status.admin_notes || '',
        type: 'validation',
        formattedDate: status.created_at ? format(new Date(status.created_at), 'dd/MM/yyyy') : ''
      });
    });
  }
  
  return history.sort((a, b) =>
    new Date(b.date || 0) - new Date(a.date || 0)
  );
};

export const calculatePlatformFees = (amount, percent = 5) => {
  const fee = Math.ceil(amount * (percent / 100));
  const net = amount - fee;

  return {
    gross: amount,
    fee,
    feePercent: percent,
    net,
    feeFormatted: formatCoins(fee),
    netFormatted: formatCoins(net),
    grossFormatted: formatCoins(amount)
  };
};

export const validateWithdrawal = (event, metrics) => {
  const errors = [];
  const warnings = [];

  if (!event) {
    errors.push("Événement non trouvé");
    return {
      valid: false,
      errors,
      warnings: [],
      canProceed: false,
      requiresConfirmation: false
    };
  }

  if (event.event_end_at && new Date(event.event_end_at) > new Date()) {
    errors.push("L'événement n'est pas encore terminé");
  }

  if (!metrics?.ticketsSold || metrics.ticketsSold === 0) {
    errors.push("Aucun ticket vendu pour cet événement");
  }

  if (metrics && !meetsAttendanceThreshold(metrics)) {
    warnings.push(`Taux de présence (${metrics.scanPercentage}%) inférieur à 30%`);
  }

  if (metrics?.status === 'VALIDE') {
    errors.push("Ce retrait a déjà été validé");
  }

  if (metrics?.status === 'REFUSE') {
    errors.push("Ce retrait a déjà été refusé");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    canProceed: errors.length === 0,
    requiresConfirmation: warnings.length > 0
  };
};

export default {
  calculateEventMetrics,
  getStatusBadgeColor,
  getWithdrawalStatusColor,
  getStatusText,
  formatCoins,
  formatCurrency,
  meetsAttendanceThreshold,
  calculateRefundAmount,
  getStatusHistory,
  calculatePlatformFees,
  validateWithdrawal
};