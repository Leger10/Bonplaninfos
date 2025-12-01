// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

// Ces variables d'environnement doivent être définies dans votre fichier .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Vérification des variables d'environnement
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes!')
  console.error('Veuillez définir VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans votre fichier .env')
}

// Création du client Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test de connexion (optionnel)
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('profiles').select('count')
    if (error) throw error
    console.log('✅ Connexion Supabase réussie')
    return true
  } catch (error) {
    console.error('❌ Erreur de connexion Supabase:', error)
    return false
  }
}