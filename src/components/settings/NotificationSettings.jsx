import React, { useState, useEffect, useCallback } from 'react';
    import { Save, Loader2 } from 'lucide-react';
    import { Button } from '@/components/ui/button';
    import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
    import { toast } from '@/components/ui/use-toast';
    import { Switch } from '@/components/ui/switch';
    import { Label } from '@/components/ui/label';
    import { supabase } from '@/lib/customSupabaseClient';
    import { useAuth } from '@/contexts/SupabaseAuthContext';

    const defaultSettings = {
        push_notifications_enabled: true,
        new_events_notification: true,
        promoted_events_notification: true,
        nearby_events_notification: true,
    };

    const NotificationSettings = () => {
      const { user } = useAuth();
      const [settings, setSettings] = useState(defaultSettings);
      const [loading, setLoading] = useState(true);

      const fetchSettings = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
              .from('profiles')
              .select('notification_settings')
              .eq('id', user.id)
              .single();
            
            if (error && error.code !== 'PGRST116') throw error;

            if (data && data.notification_settings) {
                setSettings({ ...defaultSettings, ...data.notification_settings });
            } else {
                setSettings(defaultSettings);
            }
        } catch (error) {
            toast({ title: "Erreur", description: "Impossible de charger les paramètres de notification.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
      }, [user, toast]);

      useEffect(() => {
        fetchSettings();
      }, [fetchSettings]);

      const handleSave = async () => {
        if (!user) return;
        setLoading(true);
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ notification_settings: settings })
            .eq('id', user.id);

          if (error) throw error;
          toast({ title: "Succès", description: "Paramètres de notification enregistrés." });
        } catch (error) {
          toast({ title: "Erreur", description: "Impossible d'enregistrer les paramètres.", variant: "destructive" });
        } finally {
          setLoading(false);
        }
      };

      const handleToggle = (key) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
      };

      if (loading) {
        return (
            <Card className="glass-effect border-primary/20">
                <CardHeader><CardTitle className="text-foreground">Paramètres de notification</CardTitle></CardHeader>
                <CardContent className="flex items-center justify-center h-48">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
      }

      return (
        <Card className="glass-effect border-primary/20">
          <CardHeader>
            <CardTitle className="text-foreground">Paramètres de notification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label htmlFor="push_notifications_enabled" className="font-medium text-foreground">Activer les notifications Push</Label>
                  <p className="text-sm text-muted-foreground">Recevoir des notifications sur votre appareil.</p>
                </div>
                <Switch id="push_notifications_enabled" checked={settings.push_notifications_enabled} onCheckedChange={() => handleToggle('push_notifications_enabled')} />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label htmlFor="new_events_notification" className="font-medium text-foreground">Nouveaux événements</Label>
                  <p className="text-sm text-muted-foreground">Recevoir des notifications pour les nouveaux événements.</p>
                </div>
                <Switch id="new_events_notification" checked={settings.new_events_notification} onCheckedChange={() => handleToggle('new_events_notification')} />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label htmlFor="promoted_events_notification" className="font-medium text-foreground">Événements promus</Label>
                  <p className="text-sm text-muted-foreground">Recevoir des notifications pour les événements mis en avant.</p>
                </div>
                <Switch id="promoted_events_notification" checked={settings.promoted_events_notification} onCheckedChange={() => handleToggle('promoted_events_notification')} />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label htmlFor="nearby_events_notification" className="font-medium text-foreground">Événements à proximité</Label>
                  <p className="text-sm text-muted-foreground">Recevoir des notifications pour les événements près de chez vous.</p>
                </div>
                <Switch id="nearby_events_notification" checked={settings.nearby_events_notification} onCheckedChange={() => handleToggle('nearby_events_notification')} />
              </div>
            </div>
            <Button onClick={handleSave} disabled={loading} className="gradient-red text-white">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Sauvegarder
            </Button>
          </CardContent>
        </Card>
      );
    };

    export default NotificationSettings;