import { createClient } from '@supabase/supabase-js';

    export default async function handler(req, res) {
      if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
      }

      try {
        const { token, functionName, body: requestBody } = req.body;

        if (!token || !functionName || !requestBody) {
          return res.status(400).json({ error: 'Token, functionName, and body are required.' });
        }

        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
          console.error('Supabase URL or Service Role Key is not defined in environment variables.');
          return res.status(500).json({ error: 'Server configuration error.' });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        supabaseAdmin.auth.setAuth(token);

        const { data, error } = await supabaseAdmin.functions.invoke(functionName, {
          body: JSON.stringify(requestBody),
        });

        if (error) {
          console.error('Supabase function invocation error from proxy:', error);
          const errorMessage = error.context?.body?.error || error.message || 'An internal error occurred.';
          const status = error.context?.status || 500;
          return res.status(status).json({ error: errorMessage });
        }

        if (!data) {
            console.error('Supabase function returned empty data from proxy');
            return res.status(500).json({ error: 'La fonction a retourné une réponse vide.' });
        }

        return res.status(200).json(data);

      } catch (e) {
        console.error('Error in API proxy route:', e);
        return res.status(500).json({ error: e.message || 'An unexpected error occurred.' });
      }
    }