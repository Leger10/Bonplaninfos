// components/marketing/RevenueSimulation.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { Gift, Ticket, Users, Coins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RevenueSimulation = ({ onCtaClick }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('event');

  // Simulation classique
  const [eventType, setEventType] = useState('concert');
  const [ticketPrice, setTicketPrice] = useState(5000);
  const [numberOfTickets, setNumberOfTickets] = useState(200);
  const [calculations, setCalculations] = useState({
    potentialRevenue: 0,
    platformFee: 0,
    netEarning: 0
  });

  // Simulation avec code influenceur
  const [basePrice, setBasePrice] = useState(5000);
  const [discountAmount, setDiscountAmount] = useState(1000);
  const [commissionRate, setCommissionRate] = useState(10);
  const [salesCount, setSalesCount] = useState(50);
  const [influencerCalculations, setInfluencerCalculations] = useState({
    discountedPrice: 0,
    organizerRevenue: 0,
    influencerCommission: 0,
    totalRevenue: 0,
    commissionPerTicket: 0
  });

  // Simulation code coupon
  const [rechargeAmount, setRechargeAmount] = useState(10000);
  const [couponUsageCount, setCouponUsageCount] = useState(10);
  const [couponCalculations, setCouponCalculations] = useState({
    coinsReceived: 0,
    couponOwnerCommission: 0,
    couponOwnerCommissionCoins: 0
  });

  // Types d'événements
  const eventTypes = {
    concert: { name: 'Concert', description: '90% pour organisateur, 10% pour la plateforme', icon: '🎤' },
    stands: { name: 'Vente de stands', description: '90% pour organisateur, 10% pour la plateforme', icon: '🏪' },
    election: { name: 'Élection vote', description: '90% pour organisateur, 10% pour la plateforme', icon: '🗳️' },
    lottery: { name: 'Tirage au sort', description: '90% pour organisateur, 10% pour la plateforme', icon: '🎰' }
  };

  // Simulations
  useEffect(() => {
    const potentialRevenue = ticketPrice * numberOfTickets;
    const platformFee = potentialRevenue * 0.10;
    const netEarning = potentialRevenue - platformFee;
    setCalculations({
      potentialRevenue: Math.round(potentialRevenue),
      platformFee: Math.round(platformFee),
      netEarning: Math.round(netEarning)
    });
  }, [ticketPrice, numberOfTickets]);

  useEffect(() => {
    const finalPrice = basePrice - discountAmount;
    const totalRevenue = finalPrice * salesCount;
    const commissionPerTicket = finalPrice * (commissionRate / 100);
    const totalCommission = commissionPerTicket * salesCount;
    const organizerRevenue = totalRevenue - totalCommission;
    setInfluencerCalculations({
      discountedPrice: finalPrice,
      totalRevenue: totalRevenue,
      organizerRevenue: organizerRevenue,
      influencerCommission: totalCommission,
      commissionPerTicket: commissionPerTicket
    });
  }, [basePrice, discountAmount, commissionRate, salesCount]);

  useEffect(() => {
    const coinsReceived = Math.floor(rechargeAmount / 10);
    const couponCommission = rechargeAmount * 0.01;
    const couponCommissionCoins = Math.floor(couponCommission / 10);
    setCouponCalculations({
      coinsReceived: coinsReceived,
      couponOwnerCommission: couponCommission,
      couponOwnerCommissionCoins: couponCommissionCoins
    });
  }, [rechargeAmount, couponUsageCount]);

  const formatNumber = (number) => {
    return new Intl.NumberFormat('fr-FR').format(Math.round(number));
  };

  const currentEvent = eventTypes[eventType];

  return (
    <section className="py-12 md:py-24 bg-black">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            📊 Simulateur de Revenus
          </h2>
          <p className="text-gray-400 mt-2 max-w-2xl mx-auto text-sm md:text-base">
            Découvrez combien vous pouvez gagner selon votre stratégie
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <Card className="shadow-xl overflow-hidden border border-gray-800 bg-gray-900">
            <CardContent className="p-4 md:p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                {/* Version mobile : défilement horizontal des onglets */}
                <div className="relative mb-8">
                  <div className="overflow-x-auto scrollbar-hide pb-2">
                    <TabsList className="inline-flex min-w-full bg-gray-800/50 p-1 rounded-xl gap-1">
                      <TabsTrigger 
                        value="event" 
                        className="flex-1 text-xs sm:text-sm md:text-base whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-500 data-[state=active]:text-black rounded-lg px-3 py-2"
                      >
                        <span className="hidden xs:inline">🎫 </span>Événement
                      </TabsTrigger>
                      <TabsTrigger 
                        value="influencer" 
                        className="flex-1 text-xs sm:text-sm md:text-base whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-500 data-[state=active]:text-black rounded-lg px-3 py-2"
                      >
                        <span className="hidden xs:inline">🤝 </span>Influenceur
                      </TabsTrigger>
                      <TabsTrigger 
                        value="coupon" 
                        className="flex-1 text-xs sm:text-sm md:text-base whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-500 data-[state=active]:text-black rounded-lg px-3 py-2"
                      >
                        <span className="hidden xs:inline">🎁 </span>Coupon
                      </TabsTrigger>
                    </TabsList>
                  </div>
                </div>

                {/* TAB 1: Événement Classique */}
                <TabsContent value="event" className="mt-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                    <div className="space-y-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Type d'événement</label>
                        <select
                          className="w-full p-3 border border-gray-700 rounded-lg bg-gray-800 text-white focus:ring-2 focus:ring-yellow-500/50"
                          value={eventType}
                          onChange={(e) => setEventType(e.target.value)}
                        >
                          <option value="concert">🎤 Concert</option>
                          <option value="stands">🏪 Vente de stands</option>
                          <option value="election">🗳️ Élection vote</option>
                          <option value="lottery">🎰 Tirage au sort</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-2">{currentEvent?.description}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Prix du billet</label>
                        <div className="flex items-center border border-gray-700 rounded-lg bg-gray-800 px-3">
                          <Ticket className="w-4 h-4 text-gray-400 mr-2" />
                          <input type="number" className="w-full p-3 bg-transparent outline-none text-white" value={ticketPrice} onChange={(e) => setTicketPrice(Number(e.target.value))} min="0" step="500" />
                          <span className="text-gray-400">FCFA</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Nombre de billets vendus</label>
                        <input type="number" className="w-full p-3 border border-gray-700 rounded-lg bg-gray-800 text-white" value={numberOfTickets} onChange={(e) => setNumberOfTickets(Number(e.target.value))} min="0" />
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 md:p-6 space-y-4 border border-gray-700">
                      <div className="flex justify-between items-center border-b border-gray-700 pb-3">
                        <span className="font-medium text-gray-300">💰 Chiffre d'affaires</span>
                        <span className="font-bold text-yellow-400 text-lg">{formatNumber(calculations.potentialRevenue)} FCFA</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-gray-700 pb-3">
                        <span className="font-medium text-gray-300">🏦 Commission (10%)</span>
                        <span className="font-semibold text-orange-400">- {formatNumber(calculations.platformFee)} FCFA</span>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <span className="font-bold text-base text-gray-200">🎯 Votre gain net</span>
                        <span className="font-bold text-green-400 text-xl">{formatNumber(calculations.netEarning)} FCFA</span>
                      </div>
                      <div className="mt-4 p-3 bg-gray-800 rounded-lg">
                        <p className="text-xs text-gray-400">📊 Répartition : 90% organisateur ({(calculations.netEaring)} FCFA) | 10% plateforme ({formatNumber(calculations.platformFee)} FCFA)</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 2: Simulation avec code influenceur */}
                <TabsContent value="influencer" className="mt-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                    <div className="space-y-5">
                      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                        <h4 className="font-semibold text-yellow-400 flex items-center gap-2 mb-2">
                          <Users className="w-4 h-4" /> Comment ça marche ?
                        </h4>
                        <p className="text-xs text-gray-400">Les influenceurs créent leur code promo. Ils reçoivent <strong className="text-yellow-400">{commissionRate}%</strong> du prix après réduction.</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">💰 Prix original</label>
                        <div className="flex items-center border border-gray-700 rounded-lg bg-gray-800 px-3">
                          <Ticket className="w-4 h-4 text-gray-400 mr-2" />
                          <input type="number" className="w-full p-3 bg-transparent outline-none text-white" value={basePrice} onChange={(e) => setBasePrice(Number(e.target.value))} min="0" step="500" />
                          <span className="text-gray-400">FCFA</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">🎁 Réduction (FCFA)</label>
                        <input type="number" className="w-full p-3 border border-gray-700 rounded-lg bg-gray-800 text-white" value={discountAmount} onChange={(e) => setDiscountAmount(Number(e.target.value))} min="0" step="100" />
                        <p className="text-xs text-green-500 mt-1">Prix après réduction : <strong>{formatNumber(basePrice - discountAmount)} FCFA</strong></p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">📊 Commission (%)</label>
                        <div className="flex items-center gap-3">
                          <input type="range" className="flex-1 h-2 rounded-lg bg-gray-700 accent-yellow-500" value={commissionRate} onChange={(e) => setCommissionRate(Number(e.target.value))} min="0" max="30" step="1" />
                          <span className="font-bold text-yellow-400 bg-gray-800 px-3 py-1 rounded-lg min-w-[60px] text-center">{commissionRate}%</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Glissez pour ajuster (0% à 30%)</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">👥 Ventes via le code</label>
                        <input type="number" className="w-full p-3 border border-gray-700 rounded-lg bg-gray-800 text-white" value={salesCount} onChange={(e) => setSalesCount(Number(e.target.value))} min="0" />
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 md:p-6 space-y-4 border border-gray-700">
                      <div className="flex justify-between items-center border-b border-gray-700 pb-3">
                        <span className="font-medium text-gray-300">🎫 Prix après réduction</span>
                        <span className="font-bold text-blue-400">{formatNumber(influencerCalculations.discountedPrice)} FCFA</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-gray-700 pb-3">
                        <span className="font-medium text-gray-300">💰 Chiffre d'affaires total</span>
                        <span className="font-bold text-green-400">{formatNumber(influencerCalculations.totalRevenue)} FCFA</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-gray-700 pb-3">
                        <span className="font-medium text-gray-300">🤝 Commission ({commissionRate}%)</span>
                        <span className="font-semibold text-orange-400">- {formatNumber(influencerCalculations.influencerCommission)} FCFA</span>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <span className="font-bold text-base text-gray-200">🎯 Votre gain net</span>
                        <span className="font-bold text-green-400 text-xl">{formatNumber(influencerCalculations.organizerRevenue)} FCFA</span>
                      </div>
                      <div className="mt-3 p-2 bg-gray-800 rounded-lg">
                        <p className="text-xs text-gray-400">💡 Par vente : <strong className="text-yellow-400">{formatNumber(influencerCalculations.commissionPerTicket)} FCFA</strong> pour l'influenceur</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 3: Simulation code coupon */}
                <TabsContent value="coupon" className="mt-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                    <div className="space-y-5">
                      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                        <h4 className="font-semibold text-yellow-400 flex items-center gap-2 mb-2">
                          <Gift className="w-4 h-4" /> Comment ça marche ?
                        </h4>
                        <p className="text-xs text-gray-400">Chaque utilisateur peut créer son code coupon. L'ami reçoit <strong className="text-yellow-400">1% de commission</strong> (en pièces).</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">💰 Montant rechargé</label>
                        <div className="flex items-center border border-gray-700 rounded-lg bg-gray-800 px-3">
                          <Coins className="w-4 h-4 text-gray-400 mr-2" />
                          <input type="number" className="w-full p-3 bg-transparent outline-none text-white" value={rechargeAmount} onChange={(e) => setRechargeAmount(Number(e.target.value))} min="0" step="500" />
                          <span className="text-gray-400">FCFA</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">👥 Amis utilisant votre code</label>
                        <input type="number" className="w-full p-3 border border-gray-700 rounded-lg bg-gray-800 text-white" value={couponUsageCount} onChange={(e) => setCouponUsageCount(Number(e.target.value))} min="0" />
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 md:p-6 space-y-4 border border-gray-700">
                      <div className="flex justify-between items-center border-b border-gray-700 pb-3">
                        <span className="font-medium text-gray-300">💎 Crédits reçus</span>
                        <span className="font-bold text-purple-400">{couponCalculations.coinsReceived} pièces</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-gray-700 pb-3">
                        <span className="font-medium text-gray-300">🎁 Commission (1%)</span>
                        <span className="font-semibold text-orange-400">{formatNumber(couponCalculations.couponOwnerCommission)} FCFA</span>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <span className="font-bold text-base text-gray-200">🏆 Gains du parrain</span>
                        <div className="text-right">
                          <span className="font-bold text-green-400 text-xl">{couponCalculations.couponOwnerCommissionCoins} pièces</span>
                          <p className="text-xs text-gray-400">soit {formatNumber(couponCalculations.couponOwnerCommission)} FCFA</p>
                        </div>
                      </div>
                      {couponUsageCount > 1 && (
                        <div className="mt-3 p-3 bg-gray-800 rounded-lg">
                          <p className="text-xs text-gray-400">📈 Gains totaux : <strong className="text-yellow-400">{couponCalculations.couponOwnerCommissionCoins * couponUsageCount} pièces</strong> ({formatNumber(couponCalculations.couponOwnerCommission * couponUsageCount)} FCFA)</p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* CTA commun */}
              <div className="mt-8 text-center pt-6 border-t border-gray-800">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold shadow-lg px-6 sm:px-8 hover:scale-105 transition-transform w-full sm:w-auto"
                  onClick={() => {
                    if (activeTab === "event") navigate("/create-event");
                    else if (activeTab === "influencer") navigate("/events");
                    else if (activeTab === "coupon") navigate("/profile?tab=coupons");
                    if (onCtaClick) onCtaClick();
                  }}
                >
                  🚀 {activeTab === "event" ? "Créer mon événement" : activeTab === "influencer" ? "Activer les codes influenceurs" : "Créer mon code coupon"}
                </Button>
                <p className="text-xs text-gray-500 mt-3">
                  {activeTab === "event" && "Les frais de plateforme sont de 10% sur les ventes (90% pour vous)"}
                  {activeTab === "influencer" && "Les influenceurs génèrent leur code directement sur l'événement"}
                  {activeTab === "coupon" && "Créez votre code coupon dans votre profil → Mes coupons"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default RevenueSimulation;