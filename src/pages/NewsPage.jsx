import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Loader2, Newspaper } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/ui/use-toast';

const NewsPage = () => {
  const { t } = useTranslation();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setAnnouncements(data || []);
      } catch (error) {
        console.error('Error fetching announcements:', error);
        toast({
          title: t('news.error.title'),
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, [t]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
      },
    },
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>{t('news.meta.title')}</title>
        <meta name="description" content={t('news.meta.description')} />
      </Helmet>
      <main className="container mx-auto px-4 pt-8 pb-16">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-black font-heading uppercase tracking-wider text-primary">
            {t('news.title')}
          </h1>
          <p className="text-lg text-muted-foreground mt-2">{t('news.subtitle')}</p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        ) : announcements.length > 0 ? (
          <motion.div
            className="space-y-6 max-w-4xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {announcements.map((announcement) => (
              <motion.div key={announcement.id} variants={itemVariants}>
                <Card className="glass-effect overflow-hidden hover:border-primary/50 transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="text-xl md:text-2xl text-white">{announcement.title}</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground pt-1">
                      {t('news.publishedOn', { date: new Date(announcement.created_at).toLocaleDateString() })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground/90 whitespace-pre-wrap">{announcement.content}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center flex flex-col items-center justify-center h-64"
          >
            <Newspaper className="w-24 h-24 text-muted-foreground mb-6" />
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {t('news.noNews.title')}
            </h2>
            <p className="text-muted-foreground max-w-md">
              {t('news.noNews.description')}
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default NewsPage;