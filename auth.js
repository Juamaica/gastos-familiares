async function registrar(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { data, error };
}

async function iniciarSesion(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

supabase.auth.onAuthStateChange((event, session) => {
  if (!session) window.location.href = "login.html";
});
