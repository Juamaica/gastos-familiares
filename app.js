// =========================================================
// app.js - Lógica principal de la aplicación
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
let usuarioActualId = null;
let miembrosFamilia = [];

// ---------- PERFIL ACTIVO (estilo Netflix, editable) ----------
const CLAVE_PERFIL = "gf_perfil_activo";
const perfilModalOverlay = document.getElementById("perfilModalOverlay");
const perfilModalGrid = document.getElementById("perfilModalGrid");
const perfilActivoBadge = document.getElementById("perfilActivoBadge");
const perfilActivoAvatar = document.getElementById("perfilActivoAvatar");
const perfilActivoNombre = document.getElementById("perfilActivoNombre");
const perfilVistaGrid = document.getElementById("perfilVistaGrid");
const perfilVistaForm = document.getElementById("perfilVistaForm");
const perfilFormTitulo = document.getElementById("perfilFormTitulo");
const formPerfil = document.getElementById("formPerfil");
const btnEliminarPerfil = document.getElementById("btnEliminarPerfil");
const btnCancelarPerfil = document.getElementById("btnCancelarPerfil");

function obtenerPerfilActivo() {
  return localStorage.getItem(CLAVE_PERFIL);
}

function obtenerPerfilPorNombre(nombre) {
  return miembrosFamilia.find((m) => m.nombre === nombre) || null;
}

// Avatar visual (foto real, o inicial del nombre si no tiene foto)
function avatarHTML(nombre) {
  const m = obtenerPerfilPorNombre(nombre);
  if (m && m.foto_url) return `<img src="${m.foto_url}" alt="${nombre}">`;
  const inicial = nombre ? nombre.trim().charAt(0).toUpperCase() : "?";
  return inicial;
}

// Ícono simple para contextos de texto plano (tabla)
function iconoDe(nombre) {
  return "👤";
}

async function cargarMiembrosFamilia() {
  const { data, error } = await supabase
    .from("miembros_familia")
    .select("*")
    .order("creado_en", { ascending: true });

  if (error) {
    console.error("Error cargando miembros de familia:", error.message);
    return;
  }
  miembrosFamilia = data || [];
}

function pintarPerfilActivo() {
  const activo = obtenerPerfilActivo();
  if (activo && obtenerPerfilPorNombre(activo)) {
    perfilActivoAvatar.innerHTML = avatarHTML(activo);
    perfilActivoNombre.textContent = activo;
  } else {
    perfilActivoAvatar.innerHTML = "👤";
    perfilActivoNombre.textContent = "Elegir perfil";
  }
}

function seleccionarPerfil(nombre) {
  localStorage.setItem(CLAVE_PERFIL, nombre);
  pintarPerfilActivo();
  perfilModalOverlay.hidden = true;
}

function mostrarVistaGrid() {
  perfilVistaForm.hidden = true;
  perfilVistaGrid.hidden = false;
  renderGridPerfiles();
}

function mostrarVistaForm(perfil = null) {
  formPerfil.reset();
  document.getElementById("perfilIdEdit").value = perfil ? perfil.id : "";
  perfilFormTitulo.textContent = perfil ? "Editar perfil" : "Nuevo perfil";
  document.getElementById("perfilNombre").value = perfil ? perfil.nombre : "";
  btnEliminarPerfil.hidden = !perfil;
  perfilVistaGrid.hidden = true;
  perfilVistaForm.hidden = false;
}

function renderGridPerfiles() {
  perfilModalGrid.innerHTML = "";

  miembrosFamilia.forEach((m) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "perfil-modal__opcion";
    btn.innerHTML = `
      <span class="avatar">${avatarHTML(m.nombre)}</span>
      <span class="nombre">${m.nombre}</span>
      <span class="perfil-modal__editar" title="Editar">✏️</span>
    `;
    btn.addEventListener("click", () => seleccionarPerfil(m.nombre));
    btn.querySelector(".perfil-modal__editar").addEventListener("click", (e) => {
      e.stopPropagation();
      mostrarVistaForm(m);
    });
    perfilModalGrid.appendChild(btn);
  });

  const btnAgregar = document.createElement("button");
  btnAgregar.type = "button";
  btnAgregar.className = "perfil-modal__opcion perfil-modal__opcion--agregar";
  btnAgregar.innerHTML = `<span class="avatar">+</span><span class="nombre">Agregar</span>`;
  btnAgregar.addEventListener("click", () => mostrarVistaForm(null));
  perfilModalGrid.appendChild(btnAgregar);
}

function abrirSelectorPerfil() {
  mostrarVistaGrid();
  perfilModalOverlay.hidden = false;
}

perfilActivoBadge.addEventListener("click", abrirSelectorPerfil);
btnCancelarPerfil.addEventListener("click", mostrarVistaGrid);

formPerfil.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("perfilIdEdit").value;
  const nombre = document.getElementById("perfilNombre").value.trim();
  const archivo = document.getElementById("perfilFoto").files[0];
  const btnGuardar = formPerfil.querySelector('button[type="submit"]');
  btnGuardar.disabled = true;

  try {
    let perfilId = id;

    if (id) {
      // Editar perfil existente
      const { error } = await supabase.from("miembros_familia").update({ nombre }).eq("id", id);
      if (error) throw error;
    } else {
      // Crear perfil nuevo
      const { data, error } = await supabase
        .from("miembros_familia")
        .insert([{ usuario_id: usuarioActualId, nombre }])
        .select();
      if (error) throw error;
      perfilId = data[0].id;
    }

    if (archivo) {
      const nombreArchivo = `miembro_${perfilId}_${Date.now()}.${archivo.name.split(".").pop()}`;
      const { error: uploadError } = await supabase.storage
        .from("fotos-familia")
        .upload(nombreArchivo, archivo, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from("fotos-familia").getPublicUrl(nombreArchivo);
      const { error: updateError } = await supabase
        .from("miembros_familia")
        .update({ foto_url: publicUrlData.publicUrl })
        .eq("id", perfilId);
      if (updateError) throw updateError;
    }

    const nombreOriginalSiEditaba = id ? miembrosFamilia.find((m) => m.id === id)?.nombre : null;
    await cargarMiembrosFamilia();

    // Si edité el perfil que tenía activo y le cambié el nombre, actualizo el activo también
    if (id && nombreOriginalSiEditaba && obtenerPerfilActivo() === nombreOriginalSiEditaba) {
      localStorage.setItem(CLAVE_PERFIL, nombre);
    }

    pintarPerfilActivo();
    mostrarToast(id ? "Perfil actualizado" : "Perfil creado", "exito");
    mostrarVistaGrid();
  } catch (err) {
    mostrarToast("Error al guardar el perfil: " + err.message, "error");
  } finally {
    btnGuardar.disabled = false;
  }
});

btnEliminarPerfil.addEventListener("click", async () => {
  const id = document.getElementById("perfilIdEdit").value;
  if (!id) return;
  if (!confirm("¿Seguro que quieres eliminar este perfil? Los gastos que ya registró quedan igual, pero ya no podrá elegir este perfil de nuevo.")) return;

  const perfil = miembrosFamilia.find((m) => m.id === id);
  const { error } = await supabase.from("miembros_familia").delete().eq("id", id);
  if (error) return mostrarToast("Error al eliminar: " + error.message, "error");

  if (perfil && obtenerPerfilActivo() === perfil.nombre) {
    localStorage.removeItem(CLAVE_PERFIL);
  }

  await cargarMiembrosFamilia();
  pintarPerfilActivo();
  mostrarToast("Perfil eliminado", "exito");
  mostrarVistaGrid();
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

// ---------- CERRAR SESIÓN ----------
document.getElementById("btnCerrarSesion").addEventListener("click", async (e) => {
  e.preventDefault();
  await supabase.auth.signOut();
  window.location.href = "login.html";
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

// ---------- DATE PICKER CUSTOM ----------
const MESES_ABBR = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_FULL = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const fechaInput = document.getElementById("fecha");
const fechaDisplay = document.getElementById("fechaDisplay");
const datePicker = document.getElementById("datePicker");
const datePanel = document.getElementById("datePanel");
const dpGrid = document.getElementById("dpGrid");
const dpMonthLabel = document.getElementById("dpMonthLabel");
const dpPrev = document.getElementById("dpPrev");
const dpNext = document.getElementById("dpNext");

let vistaCalendario = new Date();

function pad2(n) {
  return n < 10 ? "0" + n : "" + n;
}

function fechaAISO(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function isoAFecha(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function setFecha(date) {
  fechaInput.value = fechaAISO(date);
  fechaDisplay.textContent = `${date.getDate()} ${MESES_ABBR[date.getMonth()]} ${date.getFullYear()}`;
  vistaCalendario = new Date(date.getFullYear(), date.getMonth(), 1);
}

function renderCalendario() {
  dpMonthLabel.textContent = `${MESES_FULL[vistaCalendario.getMonth()]} ${vistaCalendario.getFullYear()}`;
  dpGrid.innerHTML = "";

  const year = vistaCalendario.getFullYear();
  const month = vistaCalendario.getMonth();
  const primerDia = new Date(year, month, 1).getDay();
  const diasEnMes = new Date(year, month + 1, 0).getDate();
  const seleccionada = fechaInput.value ? fechaAISO(isoAFecha(fechaInput.value)) : null;
  const hoy = fechaAISO(new Date());

  for (let i = 0; i < primerDia; i++) {
    const vacio = document.createElement("span");
    vacio.className = "date-picker__day date-picker__day--empty";
    dpGrid.appendChild(vacio);
  }

  for (let d = 1; d <= diasEnMes; d++) {
    const fechaDia = new Date(year, month, d);
    const isoDia = fechaAISO(fechaDia);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "date-picker__day";
    if (isoDia === hoy) btn.classList.add("date-picker__day--today");
    if (isoDia === seleccionada) btn.classList.add("date-picker__day--selected");
    btn.textContent = d;
    btn.addEventListener("click", () => {
      setFecha(fechaDia);
      datePanel.hidden = true;
    });
    dpGrid.appendChild(btn);
  }
}

fechaDisplay.addEventListener("click", () => {
  datePanel.hidden = !datePanel.hidden;
  categoriaPanel.hidden = true;
  if (!datePanel.hidden) renderCalendario();
});

dpPrev.addEventListener("click", () => {
  vistaCalendario = new Date(vistaCalendario.getFullYear(), vistaCalendario.getMonth() - 1, 1);
  renderCalendario();
});

dpNext.addEventListener("click", () => {
  vistaCalendario = new Date(vistaCalendario.getFullYear(), vistaCalendario.getMonth() + 1, 1);
  renderCalendario();
});

document.addEventListener("click", (e) => {
  if (!datePicker.contains(e.target)) datePanel.hidden = true;
});

// ---------- SELECT PICKER CUSTOM (categoría) ----------
const categoriaSelect = document.getElementById("categoria");
const categoriaDisplay = document.getElementById("categoriaDisplay");
const categoriaPicker = document.getElementById("categoriaPicker");
const categoriaPanel = document.getElementById("categoriaPanel");

function renderCategorias() {
  categoriaPanel.innerHTML = "";
  CATEGORIAS.forEach((cat) => {
    const opt = document.createElement("button");
    opt.type = "button";
    opt.className = "select-picker__option";
    if (cat === categoriaSelect.value) opt.classList.add("select-picker__option--selected");
    opt.textContent = cat;
    opt.addEventListener("click", () => {
      setCategoria(cat);
      categoriaPanel.hidden = true;
    });
    categoriaPanel.appendChild(opt);
  });
}

function setCategoria(cat) {
  categoriaSelect.value = cat;
  categoriaDisplay.textContent = cat;
}

categoriaDisplay.addEventListener("click", () => {
  categoriaPanel.hidden = !categoriaPanel.hidden;
  datePanel.hidden = true;
  if (!categoriaPanel.hidden) renderCategorias();
});

document.addEventListener("click", (e) => {
  if (!categoriaPicker.contains(e.target)) categoriaPanel.hidden = true;
});

// ---------- BOTÓN REFRESCAR LISTA ----------
const btnRefrescar = document.getElementById("btnRefrescar");
const refrescarIcono = document.getElementById("refrescarIcono");

btnRefrescar.addEventListener("click", async () => {
  refrescarIcono.classList.add("girando");
  btnRefrescar.disabled = true;
  await cargarGastos();
  refrescarIcono.classList.remove("girando");
  btnRefrescar.disabled = false;
});

// ---------- IMPRIMIR / DESCARGAR (como factura profesional) ----------
const btnImprimir = document.getElementById("btnImprimir");
btnImprimir.addEventListener("click", () => window.print());

window.addEventListener("beforeprint", () => {
  const filtrados = obtenerGastosFiltrados();
  const nombreFamilia = document.getElementById("nombreFamilia").textContent;
  const filtroTexto = filtroMiembroActual === "todos" ? "Todos" : filtroMiembroActual;
  const total = filtrados.reduce((sum, g) => sum + Number(g.monto), 0);

  document.getElementById("facturaFamilia").textContent = `${nombreFamilia} · ${filtroTexto}`;
  document.getElementById("facturaFecha").textContent = new Date().toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  document.getElementById("facturaCantidad").textContent = filtrados.length;

  const tbody = document.getElementById("facturaTablaBody");
  tbody.innerHTML = "";

  if (filtrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Sin gastos registrados</td></tr>`;
  } else {
    filtrados.forEach((g) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${g.descripcion}</td>
        <td>${g.categoria}</td>
        <td>${g.miembro || "-"}</td>
        <td>${g.fecha}</td>
        <td class="factura-tabla__monto">Bs. ${Number(g.monto).toFixed(2)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  document.getElementById("facturaTotal").textContent = `Bs. ${total.toFixed(2)}`;
});

window.addEventListener("afterprint", () => {
  // Volver a la vista normal con paginación
  renderizarListado();
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

  // El miembro solo se asigna al crear un gasto nuevo (el activo en ese momento).
  // Al editar, se conserva el miembro original para no "cambiarle de dueño" el gasto.
  if (!editando) {
    gasto.miembro = obtenerPerfilActivo() || "Sin asignar";
  }

  if (editando) {
    const id = document.getElementById("gastoId").value;
    const { error } = await supabase.from("gastos").update(gasto).eq("id", id);
    if (error) return mostrarToast("Error al actualizar: " + error.message, "error");
  } else {
    const { error } = await supabase.from("gastos").insert([gasto]);
    if (error) return mostrarToast("Error al guardar: " + error.message, "error");
  }

  resetForm();
  mostrarToast("Gasto guardado correctamente", "exito");
  await cargarGastos();
});

btnCancelar.addEventListener("click", resetForm);

function resetForm() {
  form.reset();
  document.getElementById("gastoId").value = "";
  setFecha(new Date());
  setCategoria(CATEGORIAS[0]);
  editando = false;
  btnCancelar.hidden = true;
  document.getElementById("btnGuardar").textContent = "Guardar gasto";
}

// ---------- FILTRO Y PAGINACIÓN ----------
const GASTOS_POR_PAGINA = 10;
let todosLosGastos = [];
let paginaActual = 1;

const filtroMiembroDisplay = document.getElementById("filtroMiembroDisplay");
const filtroMiembroPicker = document.getElementById("filtroMiembroPicker");
const filtroMiembroPanel = document.getElementById("filtroMiembroPanel");

// Variable normal de JS (ya NO dependemos del <select> oculto, que tenía
// opciones fijas como "Mamá"/"Papá" y no reconocía nombres reales como "Ulices").
let filtroMiembroActual = "todos";

function etiquetaFiltro(valor) {
  if (valor === "todos") return "Todos";
  return `${iconoDe(valor)} ${valor}`;
}

function renderFiltroMiembroPanel() {
  filtroMiembroPanel.innerHTML = "";
  const opciones = ["todos", ...miembrosFamilia.map((m) => m.nombre)];
  opciones.forEach((valor) => {
    const opt = document.createElement("button");
    opt.type = "button";
    opt.className = "select-picker__option";
    if (valor === filtroMiembroActual) opt.classList.add("select-picker__option--selected");
    opt.textContent = etiquetaFiltro(valor);
    opt.addEventListener("click", () => {
      filtroMiembroActual = valor;
      filtroMiembroDisplay.textContent = etiquetaFiltro(valor);
      filtroMiembroPanel.hidden = true;
      paginaActual = 1;
      renderizarListado();
    });
    filtroMiembroPanel.appendChild(opt);
  });
}

filtroMiembroDisplay.textContent = "Todos";
filtroMiembroDisplay.addEventListener("click", () => {
  filtroMiembroPanel.hidden = !filtroMiembroPanel.hidden;
  datePanel.hidden = true;
  categoriaPanel.hidden = true;
  if (!filtroMiembroPanel.hidden) renderFiltroMiembroPanel();
});

document.addEventListener("click", (e) => {
  if (!filtroMiembroPicker.contains(e.target)) filtroMiembroPanel.hidden = true;
});

function obtenerGastosFiltrados() {
  if (filtroMiembroActual === "todos") return todosLosGastos;
  return todosLosGastos.filter((g) => g.miembro === filtroMiembroActual);
}

function renderizarListado() {
  const filtrados = obtenerGastosFiltrados();
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / GASTOS_POR_PAGINA));
  if (paginaActual > totalPaginas) paginaActual = totalPaginas;

  const inicio = (paginaActual - 1) * GASTOS_POR_PAGINA;
  const pagina = filtrados.slice(inicio, inicio + GASTOS_POR_PAGINA);

  pintarTabla(pagina);
  pintarPaginacion(filtrados.length, totalPaginas);
}

function pintarPaginacion(totalRegistros, totalPaginas) {
  const cont = document.getElementById("paginacionGastos");
  cont.innerHTML = "";

  if (totalRegistros === 0) return;

  const btnAnterior = document.createElement("button");
  btnAnterior.textContent = "‹ Anterior";
  btnAnterior.disabled = paginaActual === 1;
  btnAnterior.addEventListener("click", () => {
    paginaActual--;
    renderizarListado();
  });

  const info = document.createElement("span");
  info.className = "paginacion__info";
  info.textContent = `Página ${paginaActual} de ${totalPaginas} · ${totalRegistros} gasto(s)`;

  const btnSiguiente = document.createElement("button");
  btnSiguiente.textContent = "Siguiente ›";
  btnSiguiente.disabled = paginaActual === totalPaginas;
  btnSiguiente.addEventListener("click", () => {
    paginaActual++;
    renderizarListado();
  });

  cont.appendChild(btnAnterior);
  cont.appendChild(info);
  cont.appendChild(btnSiguiente);
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

  todosLosGastos = data;
  renderizarListado();
  pintarStats(data);
  pintarCategorias(data);
  pintarMiembros(data);
}

function pintarTabla(gastos) {
  const tbody = document.getElementById("tablaGastosBody");
  tbody.innerHTML = "";

  if (gastos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--color-ink-light);padding:1.2rem;">Sin gastos para mostrar</td></tr>`;
    return;
  }

  gastos.forEach((g) => {
    const esMio = g.miembro === obtenerPerfilActivo();
    const acciones = esMio
      ? `<div class="acciones">
           <button class="btn btn--small btn--edit" onclick="editarGasto('${g.id}')">Editar</button>
           <button class="btn btn--small btn--delete" onclick="eliminarGasto('${g.id}')">Eliminar</button>
         </div>`
      : `<span class="acciones-bloqueadas" title="Solo ${g.miembro || "esa persona"} puede editar este gasto">🔒 No editable</span>`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-label="Descripción">${g.descripcion}</td>
      <td data-label="Categoría">${g.categoria}</td>
      <td data-label="Miembro">${iconoDe(g.miembro)} ${g.miembro || "-"}</td>
      <td data-label="Monto">Bs. ${Number(g.monto).toFixed(2)}</td>
      <td data-label="Fecha">${g.fecha}</td>
      <td data-label="Acciones">${acciones}</td>
    `;
    tbody.appendChild(tr);
  });
}

window.editarGasto = async function (id) {
  const { data, error } = await supabase.from("gastos").select("*").eq("id", id).single();
  if (error) return mostrarToast("Error: " + error.message, "error");

  if (data.miembro !== obtenerPerfilActivo()) {
    return mostrarToast(`Solo ${data.miembro || "esa persona"} puede editar este gasto`, "error");
  }

  document.getElementById("gastoId").value = data.id;
  document.getElementById("descripcion").value = data.descripcion;
  document.getElementById("monto").value = data.monto;
  setCategoria(data.categoria);
  setFecha(isoAFecha(data.fecha));

  editando = true;
  btnCancelar.hidden = false;
  document.getElementById("btnGuardar").textContent = "Actualizar gasto";
  document.getElementById("nuevo-gasto").scrollIntoView({ behavior: "smooth" });
};

window.eliminarGasto = async function (id) {
  const gasto = todosLosGastos.find((g) => g.id === id);
  if (gasto && gasto.miembro !== obtenerPerfilActivo()) {
    return mostrarToast(`Solo ${gasto.miembro || "esa persona"} puede eliminar este gasto`, "error");
  }

  if (!confirm("¿Seguro que deseas eliminar este gasto?")) return;

  const { error } = await supabase.from("gastos").delete().eq("id", id);
  if (error) return mostrarToast("Error al eliminar: " + error.message, "error");

  await cargarGastos();
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

function pintarMiembros(gastos) {
  const contenedor = document.getElementById("miembrosContainer");
  contenedor.innerHTML = "";

  const total = gastos.reduce((sum, g) => sum + Number(g.monto), 0);

  const totalesPorMiembro = {};
  miembrosFamilia.forEach((m) => (totalesPorMiembro[m.nombre] = 0));
  gastos.forEach((g) => {
    const key = g.miembro || "Sin asignar";
    totalesPorMiembro[key] = (totalesPorMiembro[key] || 0) + Number(g.monto);
  });

  Object.entries(totalesPorMiembro).forEach(([nombre, valor]) => {
    const porcentaje = total > 0 ? (valor / total) * 100 : 0;

    const bar = document.createElement("div");
    bar.className = "categoria-bar";
    bar.innerHTML = `
      <div class="categoria-bar__label">
        <span>${iconoDe(nombre)} ${nombre}</span>
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
setFecha(new Date());
setCategoria(CATEGORIAS[0]);
cargarFamilia();
cargarGastos();

(async () => {
  const { data: { user } } = await supabase.auth.getUser();
  usuarioActualId = user?.id || null;

  await cargarMiembrosFamilia();
  pintarPerfilActivo();

  const activo = obtenerPerfilActivo();
  const activoValido = activo && obtenerPerfilPorNombre(activo);
  if (!activoValido) {
    abrirSelectorPerfil();
  }
})();
