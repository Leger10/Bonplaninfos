import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Ticket, Gift, Vote, Store, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

const EventTypeFilters = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const eventTypes = [
        { name: t('home_page.event_types.standard'), type: 'standard', icon: Zap, color: 'from-blue-500 to-indigo-600' },
        { name: t('home_page.event_types.ticketing'), type: 'ticketing', icon: Ticket, color: 'from-purple-500 to-pink-600' },
        { name: t('home_page.event_types.raffles'), type: 'raffle', icon: Gift, color: 'from-green-400 to-teal-500' },
        { name: t('home_page.event_types.voting'), type: 'voting', icon: Vote, color: 'from-yellow-500 to-orange-600' },
        { name: t('home_page.event_types.stands'), type: 'stand_rental', icon: Store, color: 'from-red-500 to-rose-600' },
    ];
    
    const EventTypeCard = ({ name, icon: Icon, color, onClick }) => (
        <motion.div
            whileHover={{ y: -5, scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 300 }}
            onClick={onClick}
        >
            <Card className={`relative overflow-hidden cursor-pointer group bg-gradient-to-br ${color} text-white shadow-lg`}>
                <div className="p-6 flex flex-col items-center justify-center h-32 text-center">
                    <Icon className="w-10 h-10 mb-3" />
                    <h3 className="font-bold text-md">{name}</h3>
                </div>
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-10 transition-opacity"></div>
            </Card>
        </motion.div>
    );

    const handleTypeClick = (eventType) => {
        navigate('/events', { state: { preselectedEventTypes: [eventType] } });
    };

    return (
        <section className="py-12">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-bold tracking-tight">{t('home_page.explore_by_type.title')}</h2>
                <p className="text-muted-foreground mt-2">{t('home_page.explore_by_type.subtitle')}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
                {eventTypes.map((eventType) => (
                    <EventTypeCard
                        key={eventType.type}
                        {...eventType}
                        onClick={() => handleTypeClick(eventType.type)}
                    />
                ))}
            </div>
        </section>
    );
};

export default EventTypeFilters;