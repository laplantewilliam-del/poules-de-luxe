import { createClient } from '@supabase/supabase-js'

// L'URL et la clé publique peuvent être publiques : l'accès aux données
// est protégé par la connexion et les règles de sécurité de la base.
// Ne jamais mettre ici la clé secrète (service role / sb_secret_).
const SUPABASE_URL = 'https://mhyurmzjfwmizaknznog.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_5EMwmMBnGZMxQHFLUVZKDw_uDmUQ4Sc'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
