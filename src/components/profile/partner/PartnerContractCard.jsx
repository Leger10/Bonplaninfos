import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FileText, Calendar, Clock, DollarSign, Percent, RefreshCw, CheckCircle2 } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import LicenseRenewalModal from '@/components/admin/LicenseRenewalModal';

const PartnerContractCard = ({ partner, onRenew }) => {
  const [renewalOpen, setRenewalOpen] = useState(false);

  if (!partner) return null;

  // Handle both joined structure and direct structure
  const license = partner.license_details || partner.partner_licenses || {};
  const expiryDate = partner.expiration_date ? new Date(partner.expiration_date) : null;
  const startDate = partner.activation_date ? new Date(partner.activation_date) : new Date(partner.created_at);
  const now = new Date();
  
  const totalDays = expiryDate ? differenceInDays(expiryDate, startDate) : 365;
  const daysLeft = expiryDate ? differenceInDays(expiryDate, now) : 0;
  const progress = totalDays > 0 ? Math.min(100, Math.max(0, ((totalDays - daysLeft) / totalDays) * 100)) : 100;
  
  const isExpired = daysLeft <= 0;
  const isExpiringSoon = daysLeft <= 30 && !isExpired;

  return (
    <>
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-slate-700 shadow-xl overflow-hidden relative">
        {/* Background Pattern */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                <FileText className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Contrat de Partenariat</CardTitle>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <span>Zone :</span>
                  <Badge variant="outline" className="bg-indigo-500/10 text-indigo-300 border-indigo-500/30">
                    {partner.coverage_zone?.country || 'Non définie'}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <Badge 
                className={`
                  ${isExpired ? 'bg-red-500/20 text-red-300 border-red-500/30' : 
                    isExpiringSoon ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 
                    'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'}
                `}
              >
                {isExpired ? 'Expiré' : isExpiringSoon ? 'Expire bientôt' : 'Actif'}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Main Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
            <div className="bg-white/5 p-3 rounded-lg border border-white/10">
              <p className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                <CheckCircle2 className="w-3 h-3" /> Type Licence
              </p>
              <p className="font-bold text-lg text-indigo-200 uppercase">{license.name || license.license_type || 'Standard'}</p>
            </div>
            <div className="bg-white/5 p-3 rounded-lg border border-white/10">
              <p className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                <DollarSign className="w-3 h-3" /> Droit d'entrée
              </p>
              <p className="font-bold text-lg">{license.price_fcfa ? license.price_fcfa.toLocaleString() : '0'} <span className="text-xs font-normal text-slate-500">FCFA</span></p>
            </div>
            <div className="bg-white/5 p-3 rounded-lg border border-white/10">
              <p className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                <Percent className="w-3 h-3" /> Commission
              </p>
              <p className="font-bold text-lg text-emerald-300">{license.commission_rate || 0}%</p>
            </div>
            <div className="bg-white/5 p-3 rounded-lg border border-white/10">
              <p className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                <Calendar className="w-3 h-3" /> Durée Contrat
              </p>
              <p className="font-bold text-lg">{license.duration_days ? Math.round(license.duration_days / 365) : 1} <span className="text-xs font-normal text-slate-500">ans</span></p>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Début: {format(startDate, 'dd MMM yyyy', { locale: fr })}</span>
              <span className={isExpiringSoon ? 'text-amber-400 font-bold' : ''}>
                {expiryDate ? (isExpired ? 'Expiré le ' : 'Expire le: ') + format(expiryDate, 'dd MMM yyyy', { locale: fr }) : 'Illimité'}
              </span>
            </div>
            <div className="relative pt-1">
              <Progress value={progress} className={`h-2 bg-white/10 ${isExpiringSoon ? 'text-amber-500' : 'text-emerald-500'}`} />
            </div>
            <div className="flex justify-between items-center mt-1">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>
                  {expiryDate ? (isExpired 
                    ? `Expiré depuis ${Math.abs(daysLeft)} jours` 
                    : `${daysLeft} jours restants`) : 'Durée indéterminée'
                  }
                </span>
              </div>
              
              {(isExpiringSoon || isExpired) && (
                <Button 
                  size="sm" 
                  onClick={() => setRenewalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-lg shadow-indigo-900/20"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Demander le renouvellement
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <LicenseRenewalModal 
        partner={partner}
        open={renewalOpen}
        onOpenChange={setRenewalOpen}
        onRenewalComplete={onRenew}
      />
    </>
  );
};

export default PartnerContractCard;