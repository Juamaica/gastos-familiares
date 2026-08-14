// =========================================================
// app.js - Lógica principal de la aplicación
// No es necesario modificar este archivo para desplegar el proyecto
// =========================================================

const CATEGORIAS = [
  "Alimentación",
  "Transporte",
  "Servicios",
  "Salud",
  "Educación",
  "Entretenimiento",
  "Otros",
];

let familiaId = null;
let editando = false;
let gastosCache = [];

// ---------- TOAST (notificaciones) ----------
function mostrarToast(mensaje, tipo) {
  const toast = document.createElement("div");
  toast.className = `toast toast--${tipo === "error" ? "error" : "exito"}`;
  toast.textContent = mensaje;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// ---------- PROTECCIÓN DE SESIÓN ----------
async function verificarSesion() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
  }
}

// ---------- CERRAR SESIÓN ----------
document.getElementById("btnLogout").addEventListener("click", async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    mostrarToast("Error al cerrar sesión: " + error.message, "error");
    return;
  }

  window.location.href = "login.html";
});

// ---------- MENÚ HAMBURGUESA ----------
const hamburgerBtn = document.getElementById("hamburgerBtn");
const navMenu = document.getElementById("navMenu");

hamburgerBtn.addEventListener("click", () => {
  hamburgerBtn.classList.toggle("active");
  navMenu.classList.toggle("active");
});

navMenu.querySelectorAll(".nav__link").forEach((link) => {
  link.addEventListener("click", () => {
    hamburgerBtn.classList.remove("active");
    navMenu.classList.remove("active");
  });
});

// ---------- FAMILIA (foto + nombre) ----------
async function cargarFamilia() {
  const { data, error } = await supabase.from("familia").select("*").limit(1);

  if (error) {
    console.error("Error cargando familia:", error.message);
    return;
  }

  if (data.length === 0) {
    const { data: nueva, error: errorInsert } = await supabase
      .from("familia")
      .insert([{ nombre_familia: "Mi Familia" }])
      .select();

    if (errorInsert) {
      console.error("Error creando familia:", errorInsert.message);
      return;
    }
    familiaId = nueva[0].id;
    pintarFamilia(nueva[0]);
  } else {
    familiaId = data[0].id;
    pintarFamilia(data[0]);
  }
}

function pintarFamilia(familia) {
  document.getElementById("nombreFamilia").textContent = familia.nombre_familia || "Mi Familia";
  const img = document.getElementById("fotoFamiliar");
  img.src = familia.foto_url || "https://placehold.co/90x90?text=Foto";
}

document.getElementById("inputFoto").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const nombreArchivo = `familia_${familiaId}_${Date.now()}.${file.name.split(".").pop()}`;

  const { error: uploadError } = await supabase.storage
    .from("fotos-familia")
    .upload(nombreArchivo, file, { upsert: true });

  if (uploadError) {
    mostrarToast("Error al subir la foto: " + uploadError.message, "error");
    return;
  }

  const { data: publicUrlData } = supabase.storage
    .from("fotos-familia")
    .getPublicUrl(nombreArchivo);

  const foto_url = publicUrlData.publicUrl;

  const { error: updateError } = await supabase
    .from("familia")
    .update({ foto_url })
    .eq("id", familiaId);

  if (updateError) {
    mostrarToast("Error al guardar la foto:
