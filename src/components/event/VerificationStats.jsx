import React, { useState, useEffect } from 'react';
import { BarChart, Users, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/customSupabaseClient';

const VerificationStats = ({ eventId, organizerId }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { data, error } = await supabase.rpc('get_verification_stats', { 
                    p_event_id: eventId, 
                    p_organizer_id: organizerId 
                });
                
                if (error) throw error;
                setStats(data?.stats);
            } catch (err) {
                console.error("Error loading verification stats:", err);
            } finally {
                setLoading(false);
            }
        };

        if (eventId && organizerId) {
            fetchStats();
            // Poll every 30 seconds
            const interval = setInterval(fetchStats, 30000);
            return () => clearInterval(interval);
        }
    }, [eventId, organizerId]);

    if (loading) return <div className="p-4 text-center text-muted-foreground">Chargement...</div>;
    if (!stats) return null;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Billets</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.total_tickets}</div>
                    <p className="text-xs text-muted-foreground">vendus pour cet événement</p>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Validés / Entrés</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">{stats.verified_tickets}</div>
                    <p className="text-xs text-muted-foreground">{stats.verification_rate}% de présence</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Doublons</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">{stats.duplicate_scans}</div>
                    <p className="text-xs text-muted-foreground">tentatives rejetées</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Sessions Actives</CardTitle>
                    <BarChart className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{stats.active_sessions}</div>
                    <p className="text-xs text-muted-foreground">scanners connectés</p>
                </CardContent>
            </Card>
        </div>
    );
};

export default VerificationStats;