import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend, PieChart as RechartsPieChart, Pie, Cell 
} from 'recharts';
import { 
  DollarSign, Users, Crown, Eye, Download, Share2, UserCheck, UserX 
} from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-background/80 backdrop-blur-sm border border-primary/20 rounded-lg shadow-lg">
        <p className="label text-primary">{`${label}`}</p>
        {payload.map((pld, index) => (
          <p key={index} style={{ color: pld.color }}>
            {`${pld.name}: ${pld.value.toLocaleString()}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const RevenueChart = ({ data }) => (
  <Card className="glass-effect border-primary/20">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-base font-medium text-white">Revenus Mensuels</CardTitle>
      <DollarSign className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(201, 162, 39, 0.2)" />
            <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value.toLocaleString()} FCFA`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="total_revenue" name="Revenu" stroke="#C9A227" fill="#C9A227" fillOpacity={0.3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </CardContent>
  </Card>
);

export const UserGrowthChart = ({ data }) => {
  return (
    <Card className="glass-effect border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-white">Croissance des Utilisateurs</CardTitle>
        <Users className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: 'white' }} />
              <Legend />
              <Line type="monotone" dataKey="new_users" stroke="#10B981" name="Nouveaux utilisateurs" />
              <Line type="monotone" dataKey="total_users" stroke="#3B82F6" name="Total utilisateurs" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
};

export const DetailedStatsCard = ({ stats }) => (
  <Card className="glass-effect border-primary/20">
    <CardHeader>
      <CardTitle className="text-white">📊 Statistiques Détaillées</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-4 bg-[#1a1a1a] rounded-lg">
          <Crown className="w-8 h-8 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{stats?.total_organizers || 0}</p>
          <p className="text-gray-400">Organisateurs</p>
        </div>
        <div className="text-center p-4 bg-[#1a1a1a] rounded-lg">
          <Eye className="w-8 h-8 text-blue-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{stats?.total_coins_circulation?.toLocaleString() || 0}</p>
          <p className="text-gray-400">Pièces en circulation</p>
        </div>
        <div className="text-center p-4 bg-[#1a1a1a] rounded-lg">
          <Download className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{stats?.total_coins_used?.toLocaleString() || 0}</p>
          <p className="text-gray-400">Pièces utilisées</p>
        </div>
        <div className="text-center p-4 bg-[#1a1a1a] rounded-lg">
          <Share2 className="w-8 h-8 text-purple-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{stats?.active_users_7d || 0}</p>
          <p className="text-gray-400">Utilisateurs actifs (7j)</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export const UserStatsCard = ({ users }) => {
  const roleCounts = users.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1
    return acc
  }, {})

  const activeUsers = users.filter(user => user.is_active).length
  const inactiveUsers = users.length - activeUsers

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const roleData = Object.entries(roleCounts).map(([name, value]) => ({ name, value }))

  return (
    <Card className="glass-effect border-primary/20">
      <CardHeader>
        <CardTitle className="text-white">👥 Répartition des Utilisateurs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-4 bg-[#1a1a1a] rounded-lg">
            <UserCheck className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{activeUsers}</p>
            <p className="text-gray-400">Utilisateurs actifs</p>
          </div>
          <div className="text-center p-4 bg-[#1a1a1a] rounded-lg">
            <UserX className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{inactiveUsers}</p>
            <p className="text-gray-400">Utilisateurs inactifs</p>
          </div>
        </div>
        
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie
                data={roleData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {roleData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: 'white' }}
              />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
};

export const RecentEvents = ({ events }) => (
  <Card className="glass-effect border-primary/20">
    <CardHeader>
      <CardTitle className="text-white">📅 Événements Récents</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {events.slice(0, 5).map((event) => (
          <div key={event.id} className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
            <div>
              <h4 className="font-semibold text-white">{event.title}</h4>
              <p className="text-sm text-gray-400">Par {event.organizer?.name}</p>
              <p className="text-xs text-gray-500">
                {new Date(event.date).toLocaleDateString()} • {event.location}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-primary">{event.coin_cost} pièces</p>
              <p className="text-xs text-gray-400">{event.attendee_count || 0} participants</p>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export const RecentPromotions = ({ promotions }) => {
  const getPromotionStatus = (purchaseDate, packDurationDays) => {
    if (!purchaseDate || !packDurationDays) {
      return { status: 'Inconnu', endDate: new Date() };
    }
    const startDate = new Date(purchaseDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + packDurationDays);
    const now = new Date();
    return {
      status: now <= endDate ? 'Actif' : 'Expiré',
      endDate
    };
  };

  return (
    <Card className="glass-effect border-primary/20">
      <CardHeader>
        <CardTitle className="text-white">🎯 Promotions Récentes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {promotions.slice(0, 5).map((promotion) => {
            const { status, endDate } = getPromotionStatus(promotion.pack_started_at, 30); // Assuming 30 days for now

            return (
              <div 
                key={promotion.id} 
                className={`flex items-center justify-between p-3 rounded-lg 
                  ${status === 'Actif' ? 'bg-green-900/50' : 'bg-red-900/50'}`}
              >
                <div className="flex flex-col">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-white">{promotion.title}</h4>
                    {promotion.is_boosted && (
                      <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded-full font-bold">🔥 Boost</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">Par {promotion.user?.name}</p>
                  <p className="text-xs text-gray-500">
                    Valide du {new Date(promotion.pack_started_at).toLocaleDateString()} au {endDate.toLocaleDateString()}
                  </p>
                  <p className={`text-xs font-bold mt-1 ${status === 'Actif' ? 'text-green-400' : 'text-red-400'}`}>
                    {status} {status === 'Expiré' && '(pièces expirées)'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">
                    {status === 'Actif' ? promotion.view_cost : 0} pièces
                  </p>
                  <p className="text-xs text-gray-400">{promotion.usage_count || 0} utilisations</p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
};