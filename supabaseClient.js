// =========================================================
// ÚNICO ARCHIVO QUE DEBES EDITAR PARA CONECTAR TU PROYECTO
// =========================================================
// 1. Entra a tu proyecto en https://supabase.com
// 2. Ve a: Project Settings > API
// 3. Copia "Project URL" y pégalo en SUPABASE_URL
// 4. Copia "anon public key" y pégalo en SUPABASE_ANON_KEY
// =========================================================

(function () {
  const SUPABASE_URL = "https://kdxoroxdyxpchjfyoqmk.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkeG9yb3hkeXhwY2hqZnlvcW1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1MTc2MDcsImV4cCI6MjEwMTA5MzYwN30.0MDBHJzF18jDfdyuejPzT_WEPs7PM9PzuEytfPtKoxM";

  window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
})();
