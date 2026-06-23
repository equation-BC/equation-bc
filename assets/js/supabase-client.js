// Configuration de Supabase
const SUPABASE_URL = 'https://qnbimfonenxyehbwrxjh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_B7LNM2pmbNMurMinCu5q5Q_yvH9zUgu';

// Initialisation du client Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
