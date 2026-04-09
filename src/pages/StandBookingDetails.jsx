import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function StandBookingDetails() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const orderId = searchParams.get('orderId');
  const codesParam = searchParams.get('codes');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      if (code) {
        const { data } = await supabase
          .from('stand_rentals')
          .select('*, stand_types(*)')
          .eq('booking_code', code);
        setBookings(data || []);
      } else if (orderId && codesParam) {
        const codes = codesParam.split(',');
        const { data } = await supabase
          .from('stand_rentals')
          .select('*, stand_types(*)')
          .in('booking_code', codes);
        setBookings(data || []);
      }
      setLoading(false);
    };
    fetchBookings();
  }, [code, orderId, codesParam]);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  if (bookings.length === 0) return <div className="p-8 text-center">Aucune réservation trouvée.</div>;

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Détail de la réservation</h1>
      {bookings.map((booking) => (
        <Card key={booking.id}>
          <CardHeader><CardTitle>Stand {booking.stand_number}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p><strong>Code :</strong> {booking.booking_code}</p>
            <p><strong>Entreprise :</strong> {booking.company_name}</p>
            <p><strong>Contact :</strong> {booking.contact_person}</p>
            <p><strong>Téléphone :</strong> {booking.contact_phone}</p>
            <p><strong>Type :</strong> {booking.stand_types?.name}</p>
            <p><strong>Montant :</strong> {booking.rental_amount_pi} π</p>
            <p><strong>Date :</strong> {new Date(booking.created_at).toLocaleDateString('fr-FR')}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}