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

// ---------- ACTUALIZAR LISTA DE GASTOS ----------
document.getElementById("btnActualizarGastos").addEventListener("click", async () => {
  await cargarGastos();
  mostrarToast("Lista actualizada", "exito");
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
    mostrarToast("Error al guardar la foto: " + updateError.message, "error");
    return;
  }

  document.getElementById("fotoFamiliar").src = foto_url;
});

// ---------- CRUD GASTOS ----------
const form = document.getElementById("formGasto");
const btnCancelar = document.getElementById("btnCancelar");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const { data: { user } } = await supabase.auth.getUser();

  const gasto = {
    descripcion: document.getElementById("descripcion").value.trim(),
    monto: parseFloat(document.getElementById("monto").value),
    categoria: document.getElementById("categoria").value,
    fecha: document.getElementById("fecha").value,
    usuario_id: user.id,
  };

  if (editando) {
    const id = document.getElementById("gastoId").value;
    const { data, error } = await supabase
      .from("gastos")
      .update(gasto)
      .eq("id", id)
      .select()
      .single();

    if (error) return mostrarToast("Error al actualizar: " + error.message, "error");

    const idx = gastosCache.findIndex((g) => g.id === id);
    if (idx !== -1) gastosCache[idx] = data;
  } else {
    const { data, error } = await supabase
      .from("gastos")
      .insert([gasto])
      .select()
      .single();

    if (error) return mostrarToast("Error al guardar: " + error.message, "error");

    gastosCache.unshift(data);
  }

  resetForm();
  mostrarToast("Gasto guardado correctamente", "exito");
  renderGastos();
});

btnCancelar.addEventListener("click", resetForm);

function resetForm() {
  form.reset();
  document.getElementById("gastoId").value = "";
  document.getElementById("fecha").valueAsDate = new Date();
  editando = false;
  btnCancelar.hidden = true;
  document.getElementById("btnGuardar").textContent = "Guardar gasto";
}

async function cargarGastos() {
  const { data, error } = await supabase
    .from("gastos")
    .select("*")
    .order("fecha", { ascending: false });

  if (error) {
    console.error("Error cargando gastos:", error.message);
    return;
  }

  gastosCache = data;
  renderGastos();
}

function renderGastos() {
  pintarTabla(gastosCache);
  pintarStats(gastosCache);
  pintarCategorias(gastosCache);
}

function pintarTabla(gastos) {
  const tbody = document.getElementById("tablaGastosBody");
  tbody.innerHTML = "";

  gastos.forEach((g) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-label="Descripción">${g.descripcion}</td>
      <td data-label="Categoría">${g.categoria}</td>
      <td data-label="Monto">Bs. ${Number(g.monto).toFixed(2)}</td>
      <td data-label="Fecha">${g.fecha}</td>
      <td data-label="Acciones">
        <div class="acciones">
          <button class="btn btn--small btn--edit" onclick="editarGasto('${g.id}')">Editar</button>
          <button class="btn btn--small btn--delete" onclick="eliminarGasto('${g.id}')">Eliminar</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.editarGasto = async function (id) {
  const registro = gastosCache.find((g) => g.id === id);
  if (!registro) return mostrarToast("No se encontró el gasto", "error");

  document.getElementById("gastoId").value = registro.id;
  document.getElementById("descripcion").value = registro.descripcion;
  document.getElementById("monto").value = registro.monto;
  document.getElementById("categoria").value = registro.categoria;
  document.getElementById("fecha").value = registro.fecha;

  editando = true;
  btnCancelar.hidden = false;
  document.getElementById("btnGuardar").textContent = "Actualizar gasto";
  document.getElementById("nuevo-gasto").scrollIntoView({ behavior: "smooth" });
};

window.eliminarGasto = async function (id) {
  if (!confirm("¿Seguro que deseas eliminar este gasto?")) return;

  const { error } = await supabase.from("gastos").delete().eq("id", id);
  if (error) return mostrarToast("Error al eliminar: " + error.message, "error");

  gastosCache = gastosCache.filter((g) => g.id !== id);
  renderGastos();
  mostrarToast("Gasto eliminado", "exito");
};

// ---------- DASHBOARD: ESTADÍSTICAS ----------
function pintarStats(gastos) {
  const total = gastos.reduce((sum, g) => sum + Number(g.monto), 0);

  const hoy = new Date();
  const mesActual = hoy.getMonth();
  const anioActual = hoy.getFullYear();

  const totalMes = gastos
    .filter((g) => {
      const f = new Date(g.fecha);
      return f.getMonth() === mesActual && f.getFullYear() === anioActual;
    })
    .reduce((sum, g) => sum + Number(g.monto), 0);

  const totalesPorCategoria = {};
  gastos.forEach((g) => {
    totalesPorCategoria[g.categoria] = (totalesPorCategoria[g.categoria] || 0) + Number(g.monto);
  });

  let categoriaTop = "-";
  let maxValor = 0;
  for (const [cat, valor] of Object.entries(totalesPorCategoria)) {
    if (valor > maxValor) {
      maxValor = valor;
      categoriaTop = cat;
    }
  }

  document.getElementById("statTotal").textContent = `Bs. ${total.toFixed(2)}`;
  document.getElementById("statMes").textContent = `Bs. ${totalMes.toFixed(2)}`;
  document.getElementById("statCantidad").textContent = gastos.length;
  document.getElementById("statCategoriaTop").textContent = categoriaTop;
}

function pintarCategorias(gastos) {
  const contenedor = document.getElementById("categoriasContainer");
  contenedor.innerHTML = "";

  const total = gastos.reduce((sum, g) => sum + Number(g.monto), 0);

  const totalesPorCategoria = {};
  CATEGORIAS.forEach((cat) => (totalesPorCategoria[cat] = 0));
  gastos.forEach((g) => {
    totalesPorCategoria[g.categoria] = (totalesPorCategoria[g.categoria] || 0) + Number(g.monto);
  });

  Object.entries(totalesPorCategoria).forEach(([cat, valor]) => {
    const porcentaje = total > 0 ? (valor / total) * 100 : 0;

    const bar = document.createElement("div");
    bar.className = "categoria-bar";
    bar.innerHTML = `
      <div class="categoria-bar__label">
        <span>${cat}</span>
        <span>Bs. ${valor.toFixed(2)}</span>
      </div>
      <div class="categoria-bar__track">
        <div class="categoria-bar__fill" style="width: ${porcentaje}%"></div>
      </div>
    `;
    contenedor.appendChild(bar);
  });
}

// ---------- INICIO ----------
verificarSesion();
document.getElementById("fecha").valueAsDate = new Date();
cargarFamilia();
cargarGastos();
