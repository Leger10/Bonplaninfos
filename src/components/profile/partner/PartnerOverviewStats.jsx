import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, MapPin, Wallet, TrendingUp, UserPlus, CheckCircle2 } from 'lucide-react';
import { Loader2 } from 'lucide-react';

const StatCard = ({ title, value, subValue, icon: Icon, colorClass, loading }) => (
  <Card className={`border-l-4 ${colorClass} shadow-sm`}>
    <CardContent className="p-5">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <h3 className="text-2xl font-bold">{value}</h3>
          )}
          {subValue && <p className="text-xs text-muted-foreground mt-1">{subValue}</p>}
        </div>
        <div className={`p-3 rounded-full bg-opacity-10 ${colorClass.replace('border-l-', 'bg-').replace('-500', '-100')}`}>
          <Icon className={`w-5 h-5 ${colorClass.replace('border-l-', 'text-')}`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

const PartnerOverviewStats = ({ stats, loading }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Utilisateurs Zone"
        value={stats.usersCount}
        subValue={`${stats.newUsers} nouveaux ce mois`}
        icon={Users}
        colorClass="border-l-blue-500"
        loading={loading}
      />
      <StatCard
        title="Événements Actifs"
        value={stats.activeEvents}
        subValue={`Sur ${stats.eventsCount} total`}
        icon={Calendar}
        colorClass="border-l-purple-500"
        loading={loading}
      />
      <StatCard
        title="Demandes Retrait"
        value={stats.pendingWithdrawals}
        subValue="En attente de validation"
        icon={Wallet}
        colorClass="border-l-orange-500"
        loading={loading}
      />
      <StatCard
        title="Lieux / Établissements"
        value={stats.venuesCount}
        subValue="Référencés dans la zone"
        icon={MapPin}
        colorClass="border-l-green-500"
        loading={loading}
      />
      
      {/* Secondary Row */}
      <div className="col-span-1 md:col-span-2 lg:col-span-2">
        <Card className="h-full bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              Taux d'activité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Utilisateurs Actifs</span>
              <span className="font-bold">{stats.activeUsers} <span className="text-xs text-muted-foreground font-normal">({stats.usersCount > 0 ? Math.round((stats.activeUsers / stats.usersCount) * 100) : 0}%)</span></span>
            </div>
            <div className="flex items-center justify-between py-2 pt-3">
              <span className="text-sm text-muted-foreground">Ratio Événements/Lieux</span>
              <span className="font-bold">{stats.venuesCount > 0 ? (stats.eventsCount / stats.venuesCount).toFixed(1) : 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="col-span-1 md:col-span-2 lg:col-span-2">
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Santé de la Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
               <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Nouveaux inscrits (30j)</span>
                  <div className="flex items-center gap-2 mt-1">
                     <UserPlus className="w-4 h-4 text-emerald-500" />
                     <span className="text-xl font-bold">{stats.newUsers}</span>
                  </div>
               </div>
               <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Retraits en attente</span>
                  <div className="flex items-center gap-2 mt-1">
                     <Wallet className="w-4 h-4 text-orange-500" />
                     <span className="text-xl font-bold">{stats.pendingWithdrawals}</span>
                  </div>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PartnerOverviewStats;