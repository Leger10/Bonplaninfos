import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Save, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const SalaryWithdrawalManagement = () => {
    const [activeTab, setActiveTab] = useState('requests');

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Gestion des Retraits Salaires</h2>
                    <p className="text-muted-foreground">Gérez les demandes de retrait des administrateurs et la configuration.</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="requests">Demandes en cours</TabsTrigger>
                    <TabsTrigger value="history">Historique</TabsTrigger>
                    <TabsTrigger value="config">Configuration</TabsTrigger>
                </TabsList>

                <TabsContent value="requests" className="space-y-4">
                    <RequestsTable status="pending" />
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                    <RequestsTable status="history" />
                </TabsContent>

                <TabsContent value="config" className="space-y-4">
                    <ConfigPanel />
                </TabsContent>
            </Tabs>
        </div>
    );
};

const RequestsTable = ({ status }) => {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);

    const fetchRequests = async () => {
        setLoading(true);
        let query = supabase
            .from('admin_withdrawal_requests')
            .select('*, admin:admin_id(full_name, email)')
            .order('requested_at', { ascending: false });

        if (status === 'pending') {
            query = query.eq('status', 'pending');
        } else {
            query = query.neq('status', 'pending');
        }

        const { data, error } = await query;
        if (error) toast({ title: "Erreur chargement", description: error.message, variant: "destructive" });
        setRequests(data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchRequests();
    }, [status]);

    const handleAction = async (id, action) => {
        setProcessingId(id);
        console.log(`Processing withdrawal approval: ${id}`);
        
        try {
            if (action === 'approved') {
                // Approve via RPC to handle balance deduction
                const { data, error } = await supabase.rpc('approve_admin_withdrawal', { 
                    p_request_id: id, 
                    p_processed_by: user.id 
                });

                if (error) throw error;
                if (!data.success) throw new Error(data.message);

                console.log(`Withdrawal approved: ${id}`);
                console.log(`Balance before: ${data.balance_before}`);
                console.log(`Balance after: ${data.balance_after}`);
                console.log("Balance updated successfully");
                console.log(`Withdrawal completed: ${id}`);

                toast({ title: "Succès", description: "Retrait approuvé et solde débité." });
            } else {
                // Reject logic (No deduction occurred yet, so just update status)
                const { error } = await supabase
                    .from('admin_withdrawal_requests')
                    .update({ 
                        status: 'rejected', 
                        processed_at: new Date().toISOString(),
                        processed_by: user.id
                    })
                    .eq('id', id);
                
                if (error) throw error;
                console.log(`Withdrawal rejected: ${id}`);
                toast({ title: "Rejeté", description: "Demande rejetée." });
            }
            
            fetchRequests();
        } catch (error) {
            console.error(`Withdrawal error: ${error.message}`);
            toast({ title: "Erreur", description: error.message, variant: "destructive" });
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) return <Loader2 className="animate-spin mx-auto" />;

    return (
        <Card>
            <CardHeader>
                <CardTitle>{status === 'pending' ? 'Demandes en attente' : 'Historique des traitements'}</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Admin</TableHead>
                            <TableHead>Montant</TableHead>
                            <TableHead>Méthode</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            {status === 'pending' && <TableHead>Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {requests.map(req => (
                            <TableRow key={req.id}>
                                <TableCell>
                                    <div className="font-medium">{req.admin?.full_name}</div>
                                    <div className="text-xs text-muted-foreground">{req.admin?.email}</div>
                                </TableCell>
                                <TableCell>{req.amount_fcfa?.toLocaleString()} FCFA</TableCell>
                                <TableCell>
                                    <Badge variant="outline">{req.method}</Badge>
                                </TableCell>
                                <TableCell>{format(new Date(req.requested_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                                <TableCell>
                                    <Badge variant={req.status === 'pending' ? 'secondary' : req.status === 'approved' ? 'success' : 'destructive'}>
                                        {req.status}
                                    </Badge>
                                </TableCell>
                                {status === 'pending' && (
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button 
                                                size="sm" 
                                                variant="default" 
                                                className="bg-green-600 hover:bg-green-700" 
                                                onClick={() => handleAction(req.id, 'approved')}
                                                disabled={processingId === req.id}
                                            >
                                                {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant="destructive" 
                                                onClick={() => handleAction(req.id, 'rejected')}
                                                disabled={processingId === req.id}
                                            >
                                                {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                                            </Button>
                                        </div>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                        {requests.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-4">Aucune demande</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

const ConfigPanel = () => {
    const [config, setConfig] = useState({
        withdrawal_available_date: 5,
        min_withdrawal_amount: 1000,
        max_withdrawal_amount: 500000,
        withdrawal_methods: ['Orange Money', 'Bank Transfer']
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('admin_withdrawal_config')
                .select('*')
                .limit(1)
                .maybeSingle();
            
            if (data) {
                setConfig(data);
            }
        } catch(e) {
            console.error("Error loading config", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                withdrawal_available_date: parseInt(config.withdrawal_available_date),
                min_withdrawal_amount: parseInt(config.min_withdrawal_amount),
                max_withdrawal_amount: parseInt(config.max_withdrawal_amount),
                withdrawal_methods: config.withdrawal_methods
            };

            // Ensure we use the existing ID if present to update
            const { error } = await supabase
                .from('admin_withdrawal_config')
                .upsert(config.id ? { ...payload, id: config.id } : payload);

            if (error) throw error;
            toast({ title: "Configuration sauvegardée", description: "Les paramètres de retrait ont été mis à jour." });
            fetchConfig(); 
        } catch (error) {
            console.error(error);
            toast({ title: "Erreur", description: error.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Loader2 className="animate-spin mx-auto" />;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Paramètres des Retraits</CardTitle>
                <CardDescription>Définissez les règles pour les demandes de retrait des administrateurs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <Label>Jour de disponibilité (du mois)</Label>
                        <Input 
                            type="number" 
                            min="1" 
                            max="28" 
                            value={config.withdrawal_available_date} 
                            onChange={e => setConfig({...config, withdrawal_available_date: e.target.value})} 
                        />
                        <p className="text-sm text-muted-foreground">Les retraits seront disponibles à partir de ce jour chaque mois.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Montant Minimum (FCFA)</Label>
                            <Input 
                                type="number" 
                                value={config.min_withdrawal_amount} 
                                onChange={e => setConfig({...config, min_withdrawal_amount: e.target.value})} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Montant Maximum (FCFA)</Label>
                            <Input 
                                type="number" 
                                value={config.max_withdrawal_amount} 
                                onChange={e => setConfig({...config, max_withdrawal_amount: e.target.value})} 
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Méthodes de retrait autorisées (séparées par des virgules)</Label>
                        <Input 
                            value={Array.isArray(config.withdrawal_methods) ? config.withdrawal_methods.join(', ') : config.withdrawal_methods} 
                            onChange={e => setConfig({...config, withdrawal_methods: e.target.value.split(',').map(s => s.trim())})} 
                        />
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" /> Enregistrer la configuration
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default SalaryWithdrawalManagement;