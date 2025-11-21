import React, { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Ticket,
  Users,
  TrendingUp,
  Shield,
  Zap,
  Star,
  ArrowRight,
  CheckCircle,
  Phone,
  MapPin,
  Facebook,
  Youtube,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Coins,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const UserGuidePage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const containerRef = useRef(null);
  const testimonialsRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const scale = useTransform(scrollYProgress, [0, 1], [0.8, 1]);
  const springScale = useSpring(scale, { damping: 30, stiffness: 200 });

  // État pour le carrousel de témoignages
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  // Features data avec les informations réelles
  const features = [
    {
      icon: <Ticket className="w-12 h-12 text-blue-600" />,
      title: t("user_guide_page.features.ticketing.title"),
      description: t("user_guide_page.features.ticketing.description"),
      stats: t("user_guide_page.features.ticketing.stats"),
    },
    {
      icon: <Users className="w-12 h-12 text-purple-600" />,
      title: t("user_guide_page.features.voting.title"),
      description: t("user_guide_page.features.voting.description"),
      stats: t("user_guide_page.features.voting.stats"),
    },
    {
      icon: <Star className="w-12 h-12 text-amber-600" />,
      title: t("user_guide_page.features.raffle.title"),
      description: t("user_guide_page.features.raffle.description"),
      stats: t("user_guide_page.features.raffle.stats"),
    },
    {
      icon: <TrendingUp className="w-12 h-12 text-green-600" />,
      title: t("user_guide_page.features.stand_rental.title"),
      description: t("user_guide_page.features.stand_rental.description"),
      stats: t("user_guide_page.features.stand_rental.stats"),
    },
    {
      icon: <Shield className="w-12 h-12 text-red-600" />,
      title: t("user_guide_page.features.protected_events.title"),
      description: t("user_guide_page.features.protected_events.description"),
      stats: t("user_guide_page.features.protected_events.stats"),
    },
    {
      icon: <Zap className="w-12 h-12 text-yellow-600" />,
      title: t("user_guide_page.features.boost.title"),
      description: t("user_guide_page.features.boost.description"),
      stats: t("user_guide_page.features.boost.stats"),
    },
  ];

  // Stats data réelles
  const stats = [
    { number: "95%", label: t("user_guide_page.stats.revenue") },
    { number: "10F", label: t("user_guide_page.stats.coin_cost") },
    { number: "1", label: t("user_guide_page.stats.coin_earned") },
    { number: "0F", label: t("user_guide_page.stats.no_fees") },
  ];

  // Simulation d'événement protégé
  const eventSimulation = {
    views: 1000,
    likes: 250,
    comments: 80,
    shares: 50,
    coinValue: 10, // 1 pièce = 10F
    totalEarnings: 0,
  };

  eventSimulation.totalEarnings =
    (eventSimulation.views +
      eventSimulation.likes +
      eventSimulation.comments +
      eventSimulation.shares) *
    eventSimulation.coinValue;

  // Témoignages traduits
  const testimonials = [
    {
      name: "Marie K.",
      role: t("user_guide_page.testimonials.testimonial1.role"),
      content: t("user_guide_page.testimonials.testimonial1.content"),
      rating: 5,
    },
    {
      name: "Jean A.",
      role: t("user_guide_page.testimonials.testimonial2.role"),
      content: t("user_guide_page.testimonials.testimonial2.content"),
      rating: 5,
    },
    {
      name: "Sophie T.",
      role: t("user_guide_page.testimonials.testimonial3.role"),
      content: t("user_guide_page.testimonials.testimonial3.content"),
      rating: 5,
    },
    {
      name: "Paul D.",
      role: t("user_guide_page.testimonials.testimonial4.role"),
      content: t("user_guide_page.testimonials.testimonial4.content"),
      rating: 5,
    },
    {
      name: "Fatou M.",
      role: t("user_guide_page.testimonials.testimonial5.role"),
      content: t("user_guide_page.testimonials.testimonial5.content"),
      rating: 5,
    },
    {
      name: "Kevin L.",
      role: t("user_guide_page.testimonials.testimonial6.role"),
      content: t("user_guide_page.testimonials.testimonial6.content"),
      rating: 5,
    },
    {
      name: "Aïcha B.",
      role: t("user_guide_page.testimonials.testimonial7.role"),
      content: t("user_guide_page.testimonials.testimonial7.content"),
      rating: 5,
    },
    {
      name: "Marc T.",
      role: t("user_guide_page.testimonials.testimonial8.role"),
      content: t("user_guide_page.testimonials.testimonial8.content"),
      rating: 5,
    },
    {
      name: "Julie N.",
      role: t("user_guide_page.testimonials.testimonial9.role"),
      content: t("user_guide_page.testimonials.testimonial9.content"),
      rating: 5,
    },
    {
      name: "David K.",
      role: t("user_guide_page.testimonials.testimonial10.role"),
      content: t("user_guide_page.testimonials.testimonial10.content"),
      rating: 5,
    },
    {
      name: "Sarah J.",
      role: t("user_guide_page.testimonials.testimonial11.role"),
      content: t("user_guide_page.testimonials.testimonial11.content"),
      rating: 5,
    },
    {
      name: "Mohamed C.",
      role: t("user_guide_page.testimonials.testimonial12.role"),
      content: t("user_guide_page.testimonials.testimonial12.content"),
      rating: 5,
    },
    {
      name: "Laura P.",
      role: t("user_guide_page.testimonials.testimonial13.role"),
      content: t("user_guide_page.testimonials.testimonial13.content"),
      rating: 5,
    },
    {
      name: "Pierre G.",
      role: t("user_guide_page.testimonials.testimonial14.role"),
      content: t("user_guide_page.testimonials.testimonial14.content"),
      rating: 5,
    },
    {
      name: "Nadia S.",
      role: t("user_guide_page.testimonials.testimonial15.role"),
      content: t("user_guide_page.testimonials.testimonial15.content"),
      rating: 5,
    },
  ];

  // Navigation des témoignages
  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial(
      (prev) => (prev - 1 + testimonials.length) % testimonials.length
    );
  };

  const goToTestimonial = (index) => {
    setCurrentTestimonial(index);
  };

  // Défilement automatique
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      nextTestimonial();
    }, 5000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-background overflow-hidden"
    >
      <Helmet>
        <title>{t("user_guide_page.meta.title")}</title>
        <meta
          name="description"
          content={t("user_guide_page.meta.description")}
        />
      </Helmet>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/90 to-blue-700 overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>

        {/* Animated background elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse delay-1000"></div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="relative z-10 text-center text-white px-4 max-w-6xl mx-auto"
        >
          <motion.h1
            className="text-5xl md:text-7xl font-bold mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            {t("user_guide_page.hero.title")}
            <span className="block bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              {t("user_guide_page.hero.subtitle")}
            </span>
          </motion.h1>

          <motion.p
            className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            <span
              dangerouslySetInnerHTML={{
                __html: t("user_guide_page.hero.description"),
              }}
            />
            <span className="block font-semibold text-yellow-300">
              {t("user_guide_page.hero.coin_info")}
            </span>
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-gray-100 text-lg px-8 py-6 font-semibold"
              onClick={() => navigate("/create-event")}
            >
              {t("user_guide_page.hero.create_event")}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/20 text-lg px-8 py-6 font-semibold"
              onClick={() => navigate("/partner-signup")}
            >
              {t("user_guide_page.hero.become_partner")}
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-8 text-blue-200"
          >
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span>{t("user_guide_page.hero.features.revenue")}</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span>{t("user_guide_page.hero.features.coin")}</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span>{t("user_guide_page.hero.features.support")}</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 border-2 border-white rounded-full flex justify-center">
            <motion.div
              className="w-1 h-3 bg-white rounded-full mt-2"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {t("user_guide_page.features.title")}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t("user_guide_page.features.subtitle")}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                viewport={{ once: true }}
              >
                <Card className="h-full border-2 shadow-lg hover:shadow-xl transition-all duration-300 bg-card">
                  <CardContent className="p-8 text-center">
                    <div className="flex justify-center mb-6">
                      <div className="p-4 rounded-2xl bg-primary/10">
                        {feature.icon}
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-foreground mb-4">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground mb-6 leading-relaxed">
                      {feature.description}
                    </p>
                    <div className="bg-gradient-to-r from-primary to-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold inline-block">
                      {feature.stats}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Simulation Événement Protégé */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {t("user_guide_page.simulation.title")}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t("user_guide_page.simulation.subtitle")}
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            <Card className="border-2 shadow-xl bg-gradient-to-br from-primary/5 to-blue-50">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <div className="flex justify-center mb-4">
                    <Coins className="w-16 h-16 text-yellow-500" />
                  </div>
                  <h3 className="text-3xl font-bold text-foreground mb-2 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                    {t("user_guide_page.simulation.main_title")}
                  </h3>
                  <p className="text-lg text-muted-foreground font-semibold">
                    {t("user_guide_page.simulation.description")}
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="text-center p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg text-white">
                    <Eye className="w-8 h-8 text-white mx-auto mb-2" />
                    <div className="text-2xl font-bold">1000</div>
                    <div className="text-sm font-medium">
                      {t("user_guide_page.simulation.views")}
                    </div>
                    <div className="text-xs font-semibold mt-1 text-yellow-300">
                      10000F
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg text-white">
                    <Heart className="w-8 h-8 text-white mx-auto mb-2" />
                    <div className="text-2xl font-bold">250</div>
                    <div className="text-sm font-medium">
                      {t("user_guide_page.simulation.likes")}
                    </div>
                    <div className="text-xs font-semibold mt-1 text-yellow-300">
                      2500F
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg text-white">
                    <MessageCircle className="w-8 h-8 text-white mx-auto mb-2" />
                    <div className="text-2xl font-bold">80</div>
                    <div className="text-sm font-medium">
                      {t("user_guide_page.simulation.comments")}
                    </div>
                    <div className="text-xs font-semibold mt-1 text-yellow-300">
                      800F
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg text-white">
                    <Share2 className="w-8 h-8 text-white mx-auto mb-2" />
                    <div className="text-2xl font-bold">50</div>
                    <div className="text-sm font-medium">
                      {t("user_guide_page.simulation.shares")}
                    </div>
                    <div className="text-xs font-semibold mt-1 text-yellow-300">
                      500F
                    </div>
                  </div>
                </div>

                <div className="text-center p-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg text-white shadow-lg">
                  <div className="text-3xl font-bold mb-2">
                    {t("user_guide_page.simulation.total", {
                      amount: eventSimulation.totalEarnings.toLocaleString(),
                    })}
                  </div>
                  <p className="text-lg font-medium">
                    {t("user_guide_page.simulation.revenue_description", {
                      count:
                        eventSimulation.views +
                        eventSimulation.likes +
                        eventSimulation.comments +
                        eventSimulation.shares,
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-blue-700 text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.2, duration: 0.6 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-5xl md:text-6xl font-bold mb-4 text-yellow-300">
                  {stat.number}
                </div>
                <p className="text-xl text-blue-100">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Programme Partenaire */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {t("user_guide_page.partner_program.title")}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t("user_guide_page.partner_program.subtitle")}
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            <Card className="border-2 shadow-xl bg-card">
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div>
                    <h3 className="text-2xl font-bold text-foreground mb-4">
                      {t("user_guide_page.partner_program.advantages")}
                    </h3>
                    <ul className="space-y-3 text-muted-foreground">
                      <li className="flex items-center space-x-3">
                        <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                        <span>
                          {t(
                            "user_guide_page.partner_program.benefits.revenue"
                          )}
                        </span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                        <span>
                          {t(
                            "user_guide_page.partner_program.benefits.training"
                          )}
                        </span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                        <span>
                          {t(
                            "user_guide_page.partner_program.benefits.support"
                          )}
                        </span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                        <span>
                          {t(
                            "user_guide_page.partner_program.benefits.network"
                          )}
                        </span>
                      </li>
                    </ul>
                  </div>
                  <div className="text-center">
                    <div className="bg-gradient-to-r from-primary to-blue-600 text-white p-6 rounded-lg">
                      <div className="text-3xl font-bold mb-2">
                        {t("user_guide_page.partner_program.become_partner")}
                      </div>
                      <p className="mb-4">
                        {t(
                          "user_guide_page.partner_program.partner_description"
                        )}
                      </p>
                      <Button
                        className="bg-white text-primary hover:bg-gray-100"
                        onClick={() => navigate("/partner-signup")}
                      >
                        {t("user_guide_page.partner_program.apply_now")}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials Section avec défilement automatique */}
      <section className="py-20 bg-background" ref={testimonialsRef}>
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {t("user_guide_page.testimonials.title")}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t("user_guide_page.testimonials.subtitle")}
            </p>
          </motion.div>

          <div className="max-w-6xl mx-auto">
            {/* Contrôles du carrousel */}
            <div className="flex justify-center items-center gap-4 mb-8">
              <Button
                variant="outline"
                size="icon"
                onClick={prevTestimonial}
                className="rounded-full"
                title={t("user_guide_page.testimonials.previous")}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsPlaying(!isPlaying)}
                className="rounded-full"
                title={
                  isPlaying
                    ? t("user_guide_page.testimonials.pause")
                    : t("user_guide_page.testimonials.play")
                }
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={nextTestimonial}
                className="rounded-full"
                title={t("user_guide_page.testimonials.next")}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {/* Carrousel de témoignages */}
            <div className="relative h-96 overflow-hidden rounded-xl">
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 100 }}
                  animate={{
                    opacity: index === currentTestimonial ? 1 : 0,
                    x:
                      index === currentTestimonial
                        ? 0
                        : index < currentTestimonial
                        ? -100
                        : 100,
                    scale: index === currentTestimonial ? 1 : 0.9,
                  }}
                  transition={{ duration: 0.5 }}
                  className={`absolute inset-0 ${
                    index === currentTestimonial
                      ? "pointer-events-auto"
                      : "pointer-events-none"
                  }`}
                >
                  <Card className="h-full border-2 shadow-2xl bg-card">
                    <CardContent className="p-12 h-full flex flex-col justify-center items-center text-center">
                      <div className="flex items-center mb-6">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star
                            key={i}
                            className="w-8 h-8 fill-yellow-400 text-yellow-400 mx-1"
                          />
                        ))}
                      </div>
                      <p className="text-2xl text-muted-foreground mb-8 italic leading-relaxed max-w-4xl">
                        "{testimonial.content}"
                      </p>

                      <div className="text-center">
                        <div className="font-bold text-foreground text-xl mb-2">
                          {testimonial.name}
                        </div>
                        <div className="text-muted-foreground text-lg">
                          {testimonial.role}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Indicateurs de pagination */}
            <div className="flex justify-center items-center gap-2 mt-8">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToTestimonial(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentTestimonial
                      ? "bg-primary scale-125"
                      : "bg-gray-300 hover:bg-gray-400"
                  }`}
                />
              ))}
            </div>

            {/* Compteur */}
            <div className="text-center mt-4 text-muted-foreground">
              {t("user_guide_page.testimonials.counter", {
                current: currentTestimonial + 1,
                total: testimonials.length,
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-blue-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              {t("user_guide_page.cta.title")}
            </h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto text-blue-100">
              {t("user_guide_page.cta.description")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-white text-primary hover:bg-gray-100 text-lg px-8 py-6 font-semibold"
                onClick={() => navigate("/create-event")}
              >
                {t("user_guide_page.cta.create_event")}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white/20 text-lg px-8 py-6 font-semibold"
                onClick={() => navigate("/partner-signup")}
              >
                {t("user_guide_page.cta.become_partner")}
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer avec informations réelles */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-4">BonPlanInfos</h3>
              <p className="text-gray-400 mb-4">
                {t("user_guide_page.footer.description")}
              </p>
              <div className="flex space-x-3">
                <a
                  href="https://www.youtube.com/@bonplaninfos"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Youtube className="w-6 h-6 text-gray-400 hover:text-red-500 cursor-pointer" />
                </a>
                <a
                  href="https://www.tiktok.com/@bonplaninfos"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="w-6 h-6 bg-gray-400 hover:bg-black rounded flex items-center justify-center">
                    <span className="text-xs font-bold text-white">TK</span>
                  </div>
                </a>
                <a
                  href="https://www.facebook.com/share/1D3rt89vaP/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Facebook className="w-6 h-6 text-gray-400 hover:text-blue-500 cursor-pointer" />
                </a>
                <a
                  href="https://chat.whatsapp.com/IcR0TttLYpU1lJXr3ifyvH"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="w-6 h-6 text-gray-400 hover:text-green-500 cursor-pointer" />
                </a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">
                {t("user_guide_page.footer.navigation")}
              </h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <button
                    onClick={() => navigate("/")}
                    className="hover:text-white transition-colors"
                  >
                    {t("user_guide_page.footer.home")}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate("/events")}
                    className="hover:text-white transition-colors"
                  >
                    {t("user_guide_page.footer.events")}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate("/create-event")}
                    className="hover:text-white transition-colors"
                  >
                    {t("user_guide_page.footer.create_event")}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate("/partner-signup")}
                    className="hover:text-white transition-colors"
                  >
                    {t("user_guide_page.footer.become_partner")}
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">
                {t("user_guide_page.footer.contact")}
              </h4>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-center space-x-2">
                  <Phone className="w-4 h-4" />
                  <span>+225 07 12 27 53 74</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <a
                    href="mailto:support@bonplaninfos.net"
                    className="hover:underline"
                  >
                    support@bonplaninfos.net
                  </a>
                </li>

                <li className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4" />
                  <span>Côte d'Ivoire, Abidjan</span>
                </li>
                <li className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4" />
                  <a
                    href="https://share.google/vsn9fS33X9trfB43i"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    Burkina Faso, Ouagadougou
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">
                {t("user_guide_page.footer.information")}
              </h4>
              <ul className="space-y-2 text-gray-400">
                <li>🎫 95% des revenus vous sont reversés</li>
                <li>💰 1 pièce = 10F CFA</li>
                <li>⚡ 1 interaction = 1 pièce</li>
                <li>🚀 Support 24/7</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>{t("user_guide_page.footer.copyright")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default UserGuidePage;
