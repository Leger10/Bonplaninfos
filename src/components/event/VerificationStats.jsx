// ============================================================
// STATISTIQUES DE VÉRIFICATION - CORRIGÉES (AVEC PAGINATION)
// ============================================================
const VerificationStatsDialog = ({ isOpen, onClose, eventId, organizerId }) => {
  const { t } = useTranslation("security");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (isOpen && eventId && organizerId) {
      const fetchStats = async () => {
        if (!isMountedRef.current) return;
        setLoading(true);
        setError(null);
        try {
          const eventIdStr = String(eventId);
          
          // ============================================================
          // 🔥 RÉCUPÉRER TOUS LES TICKETS AVEC PAGINATION
          // ============================================================
          
          console.log('🔍 Récupération de TOUS les tickets pour l\'événement:', eventIdStr);
          
          let allTicketsData = [];
          let page = 0;
          const pageSize = 1000;
          let hasMore = true;
          
          while (hasMore) {
            const from = page * pageSize;
            const to = from + pageSize - 1;
            
            console.log(`📄 Chargement page ${page + 1} (${from} à ${to})...`);
            
            const { data, error } = await supabase
              .from('tickets')
              .select('id, user_id, purchase_price_pi, payment_method, status, ticket_date, is_multi_day, entry_count, ticket_type_id')
              .eq('event_id', eventIdStr)
              .range(from, to);
            
            if (error) {
              console.error('❌ Erreur chargement tickets:', error);
              throw error;
            }
            
            if (data && data.length > 0) {
              allTicketsData = allTicketsData.concat(data);
              page++;
              hasMore = data.length === pageSize;
            } else {
              hasMore = false;
            }
          }
          
          console.log(`📊 Total tickets récupérés: ${allTicketsData?.length || 0}`);
          
          // ============================================================
          // 🔥 RÉCUPÉRER LES TYPES DE BILLETS
          // ============================================================
          
          const { data: ticketTypes, error: ticketTypesError } = await supabase
            .from('ticket_types')
            .select('id, name, quantity_available')
            .eq('event_id', eventIdStr);
          
          if (ticketTypesError) {
            console.error('❌ Erreur récupération ticket_types:', ticketTypesError);
            throw ticketTypesError;
          }
          
          console.log(`📋 ${ticketTypes?.length || 0} types de billets chargés`);
          
          // Créer un map pour accéder facilement aux types
          const typeMap = {};
          ticketTypes?.forEach(tt => {
            typeMap[tt.id] = tt;
          });
          
          // ============================================================
          // 🔥 ANALYSE PAR JOUR
          // ============================================================
          
          const extractDateFromName = (name) => {
            if (!name) return null;
            const dateMatch = name.match(/(\d{4}-\d{2}-\d{2})/);
            return dateMatch ? dateMatch[1] : null;
          };
          
          // Créer un map des dates par ticket_type_id
          const dateByTypeId = {};
          ticketTypes?.forEach(tt => {
            const date = extractDateFromName(tt.name);
            if (date) {
              dateByTypeId[tt.id] = date;
              console.log(`✅ ${tt.name} → ${date}`);
            }
          });
          
          // ============================================================
          // 🔥 RÉPARTITION PAR JOUR - TOUS LES TICKETS
          // ============================================================
          
          const ticketsByDate = {};
          const ticketsByDateStatus = {};
          
          allTicketsData?.forEach(t => {
            // Essayer d'obtenir la date depuis ticket_date ou depuis le type
            let dateKey = t.ticket_date;
            
            if (!dateKey) {
              const typeInfo = typeMap[t.ticket_type_id];
              if (typeInfo) {
                dateKey = extractDateFromName(typeInfo.name);
              }
            }
            
            if (dateKey) {
              try {
                const formattedDate = new Date(dateKey).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long'
                });
                
                // Comptage total par jour
                if (!ticketsByDate[formattedDate]) {
                  ticketsByDate[formattedDate] = 0;
                }
                ticketsByDate[formattedDate]++;
                
                // Comptage par statut par jour
                if (!ticketsByDateStatus[formattedDate]) {
                  ticketsByDateStatus[formattedDate] = { 
                    total: 0, 
                    active: 0, 
                    used: 0, 
                    exited: 0,
                    sold: 0,
                    available: 0
                  };
                }
                ticketsByDateStatus[formattedDate].total++;
                
                if (t.status === 'active') {
                  ticketsByDateStatus[formattedDate].active++;
                  if (t.user_id === null || t.user_id === '') {
                    ticketsByDateStatus[formattedDate].available++;
                  } else {
                    ticketsByDateStatus[formattedDate].sold++;
                  }
                } else if (t.status === 'used' || t.status === 'exited') {
                  ticketsByDateStatus[formattedDate].used++;
                  ticketsByDateStatus[formattedDate].sold++;
                }
              } catch (e) {
                console.warn(`⚠️ Erreur formatage date: ${dateKey}`, e);
              }
            }
          });
          
          console.log('📊 Répartition par jour:', ticketsByDate);
          console.log('📊 Détails par jour:', ticketsByDateStatus);
          
          // ============================================================
          // 🔥 STATISTIQUES GLOBALES
          // ============================================================
          
          const totalTicketsCreated = allTicketsData?.length || 0;
          
          // Tickets avec user_id (vendus)
          const ticketsWithUser = allTicketsData?.filter(t => t.user_id !== null && t.user_id !== '') || [];
          const totalSold = ticketsWithUser.length;
          
          // Tickets sans user_id (non vendus)
          const ticketsWithoutUser = allTicketsData?.filter(t => t.user_id === null || t.user_id === '') || [];
          const ticketsNotSold = ticketsWithoutUser.length;
          
          // Tickets disponibles
          const availableTickets = ticketsWithoutUser.filter(t => t.status === 'active').length;
          
          // Tickets MoneyFusion
          const moneyTickets = ticketsWithUser.filter(t => t.payment_method === 'moneyfusion_ticket').length;
          
          // Tickets Coins
          const coinsTickets = ticketsWithUser.filter(t => t.payment_method === 'coins').length;
          
          // Tickets entrés
          const currentlyInside = ticketsWithUser.filter(t => t.status === 'used').length;
          
          // Tickets sortis
          const exitedTickets = ticketsWithUser.filter(t => t.status === 'exited').length;
          
          // Tickets validés
          const verifiedTickets = currentlyInside + exitedTickets;
          
          // Tickets actifs
          const activeTickets = ticketsWithUser.filter(t => t.status === 'active').length;
          
          // Tickets sans compte
          const guestTickets = ticketsWithUser.filter(t => t.user_id && t.user_id.toString().startsWith('guest_')).length;
          
          // MoneyFusion sans compte
          const moneyGuestTickets = ticketsWithUser.filter(t => 
            t.payment_method === 'moneyfusion_ticket' && 
            t.user_id && t.user_id.toString().startsWith('guest_')
          ).length;
          
          const moneyAccountTickets = moneyTickets - moneyGuestTickets;
          
          // Total des entrées
          const totalEntries = ticketsWithUser.filter(t => t.entry_count > 0).length;
          
          // Moyenne des entrées
          const totalEntryCounts = ticketsWithUser.reduce((sum, t) => sum + (t.entry_count || 0), 0);
          const avgEntriesPerTicket = verifiedTickets > 0 ? (totalEntryCounts / verifiedTickets) : 0;
          
          // Multi-jours
          const multiDayTickets = ticketsWithUser.filter(t => t.is_multi_day === true).length;
          
          // Journaliers
          const dailyTickets = ticketsWithUser.filter(t => t.is_multi_day === false && t.ticket_date !== null).length;
          
          // Sans date
          const ticketsWithoutDate = ticketsWithUser.filter(t => t.is_multi_day === false && t.ticket_date === null).length;
          
          // ============================================================
          // 🔥 CALCUL FINAL
          // ============================================================
          
          const verificationRate = totalSold > 0 ? (verifiedTickets / totalSold) * 100 : 0;
          
          // Formater les données par jour pour l'affichage
          const ticketsByDateDisplay = {};
          Object.entries(ticketsByDateStatus).forEach(([date, data]) => {
            ticketsByDateDisplay[date] = {
              total: data.total || 0,
              active: data.active || 0,
              used: data.used || 0,
              exited: data.exited || 0,
              sold: data.sold || 0,
              available: data.available || 0
            };
          });
          
          console.log('📊 RÉSULTAT FINAL:');
          console.log(`  - Total créés: ${totalTicketsCreated}`);
          console.log(`  - Total VENDUS: ${totalSold}`);
          console.log(`  - Non vendus: ${ticketsNotSold}`);
          console.log(`  - Disponibles: ${availableTickets}`);
          console.log(`  - En attente: ${activeTickets}`);
          console.log(`  - Validés: ${verifiedTickets}`);
          console.log(`  - Taux présence: ${verificationRate}%`);
          console.log(`  - Répartition par jour:`, ticketsByDate);
          
          if (isMountedRef.current) {
            setStats({
              total_tickets_created: totalTicketsCreated,
              total_sold: totalSold,
              tickets_not_sold: ticketsNotSold,
              available_tickets: availableTickets,
              coins_tickets: coinsTickets,
              money_tickets: moneyTickets,
              money_guest_tickets: moneyGuestTickets,
              money_account_tickets: moneyAccountTickets,
              currently_inside: currentlyInside,
              exited_tickets: exitedTickets,
              verified_tickets: verifiedTickets,
              active_tickets: activeTickets,
              guest_tickets: guestTickets,
              total_entries: totalEntries,
              avg_entries_per_ticket: Math.round(avgEntriesPerTicket * 100) / 100,
              verification_rate: Math.round(verificationRate * 100) / 100,
              multi_day_tickets: multiDayTickets,
              daily_tickets: dailyTickets,
              tickets_without_date: ticketsWithoutDate,
              tickets_by_date: ticketsByDateDisplay,
              tickets_by_date_total: ticketsByDate
            });
          }
          
        } catch (err) {
          console.error("❌ Erreur stats:", err);
          if (isMountedRef.current) {
            setError(err.message);
          }
        } finally {
          if (isMountedRef.current) {
            setLoading(false);
          }
        }
      };

      fetchStats();
      const interval = setInterval(fetchStats, 30000);
      return () => clearInterval(interval);
    }
  }, [isOpen, eventId, organizerId]);

  const daysWithTickets = Object.keys(stats?.tickets_by_date || {}).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-black border-gray-800 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <BarChart className="w-5 h-5 text-blue-400" /> Statistiques de vérification
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            État des entrées en temps réel
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin text-blue-400" />
          </div>
        ) : error ? (
          <div className="text-center p-8">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        ) : stats ? (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-900 p-4 rounded-lg text-center border border-gray-800">
                <p className="text-xs text-gray-400 uppercase font-bold">Billets vendus</p>
                <p className="text-2xl font-bold text-white">{stats.total_sold}</p>
                <div className="flex justify-center gap-2 mt-1 text-[10px] flex-wrap">
                  {stats.coins_tickets > 0 && (
                    <span className="text-green-400">🪙 {stats.coins_tickets}</span>
                  )}
                  {stats.money_tickets > 0 && (
                    <span className="text-blue-400">💳 {stats.money_tickets}</span>
                  )}
                </div>
                {stats.multi_day_tickets > 0 && (
                  <div className="text-[8px] text-purple-400 mt-1">
                    📅 {stats.multi_day_tickets} multi-jours
                  </div>
                )}
                {stats.daily_tickets > 0 && (
                  <div className="text-[8px] text-blue-400">
                    📅 {stats.daily_tickets} journaliers
                  </div>
                )}
                {stats.total_tickets_created > stats.total_sold && (
                  <div className="text-[8px] text-gray-500 mt-1">
                    ({stats.total_tickets_created} billets créés au total)
                  </div>
                )}
                {stats.tickets_not_sold > 0 && (
                  <div className="text-[8px] text-orange-400 mt-0.5">
                    ⚠️ {stats.tickets_not_sold} non vendus
                  </div>
                )}
                {stats.available_tickets > 0 && (
                  <div className="text-[8px] text-green-400 mt-0.5">
                    ✅ {stats.available_tickets} disponibles
                  </div>
                )}
              </div>
              <div className="bg-blue-900/20 p-4 rounded-lg text-center border border-blue-800/50">
                <p className="text-xs text-blue-400 uppercase font-bold">Validés / Entrés</p>
                <p className="text-2xl font-bold text-blue-400">{stats.verified_tickets}</p>
                <div className="text-[10px] text-gray-400 mt-1">
                  {stats.total_entries > 0 && (
                    <span>{stats.total_entries} entrées totales</span>
                  )}
                </div>
                {stats.exited_tickets > 0 && (
                  <p className="text-[10px] text-blue-300 mt-1">🚪 {stats.exited_tickets} sortis</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Taux de présence</span>
                <span className="font-bold text-white">{stats.verification_rate}%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${stats.verification_rate}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-gray-500 text-center">
                {stats.verified_tickets} entrés / {stats.total_sold} vendus
              </p>
            </div>

            {stats.money_tickets > 0 && (
              <div className="bg-blue-900/20 p-3 rounded-lg border border-blue-800/30">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-blue-400">💳 Tickets MoneyFusion</span>
                  <Badge className="ml-auto bg-blue-600 text-white text-[10px]">
                    {stats.money_tickets}
                  </Badge>
                </div>
                <div className="mt-1 text-[10px] text-gray-400 flex gap-3">
                  <span>Avec compte: {stats.money_account_tickets}</span>
                  <span>Sans compte: {stats.money_guest_tickets}</span>
                </div>
              </div>
            )}

            <div className="bg-orange-900/20 p-3 rounded-lg border border-orange-800/30">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-medium text-orange-400">En attente d'entrée</span>
                <Badge className="ml-auto bg-orange-600 text-white text-[10px]">
                  {stats.active_tickets}
                </Badge>
              </div>
              {stats.total_sold > 0 && (
                <div className="text-[8px] text-gray-500 mt-1">
                  {Math.round((stats.active_tickets / stats.total_sold) * 100)}% des vendus
                </div>
              )}
            </div>

            {stats.guest_tickets > 0 && (
              <div className="bg-yellow-900/20 p-3 rounded-lg border border-yellow-800/30">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-medium text-yellow-400">Sans compte</span>
                  <Badge className="ml-auto bg-yellow-600 text-white text-[10px]">
                    {stats.guest_tickets}
                  </Badge>
                </div>
              </div>
            )}

            {daysWithTickets > 0 && (
              <div className="bg-green-900/20 p-3 rounded-lg border border-green-800/30">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarIcon className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium text-green-400">Répartition par jour</span>
                  <Badge className="ml-auto bg-green-600 text-white text-[10px]">
                    {daysWithTickets} jours
                  </Badge>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {Object.entries(stats.tickets_by_date || {}).map(([date, data]) => {
                    const total = data.total || 0;
                    const sold = data.sold || 0;
                    const available = data.available || 0;
                    const used = (data.used || 0) + (data.exited || 0);
                    const rate = total > 0 ? Math.round((used / total) * 100) : 0;
                    
                    return (
                      <div key={date} className="flex flex-col gap-0.5">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-gray-300 truncate">{date}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">{total} tickets</span>
                            <span className={`font-medium ${rate >= 80 ? 'text-green-400' : rate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                              {rate}%
                            </span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${rate >= 80 ? 'bg-green-500' : rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[8px] text-gray-500">
                          <span className="text-green-400">✅ Disponibles: {available}</span>
                          <span className="text-blue-400">💰 Vendus: {sold}</span>
                          <span className="text-gray-500">📊 Total: {total}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-gray-500">Aucune donnée disponible</p>
        )}
      </DialogContent>
    </Dialog>
  );
};