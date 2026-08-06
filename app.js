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
    alert("Error al subir la foto: " + uploadError.message);
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
    alert("Error al guardar la foto: " + updateError.message);
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

// ---------- CRUD GASTOS ----------
const form = document.getElementById("formGasto");
const btnCancelar = document.getElementById("btnCancelar");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const gasto = {
    descripcion: document.getElementById("descripcion").value.trim(),
    monto: parseFloat(document.getElementById("monto").value),
    categoria: document.getElementById("categoria").value,
    fecha: document.getElementById("fecha").value,
  };

  if (editando) {
    const id = document.getElementById("gastoId").value;
    const { error } = await supabase.from("gastos").update(gasto).eq("id", id);
    if (error) return alert("Error al actualizar: " + error.message);
  } else {
    const { error } = await supabase.from("gastos").insert([gasto]);
    if (error) return alert("Error al guardar: " + error.message);
  }

  resetForm();
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

async function cargarGastos() {
  const { data, error } = await supabase
    .from("gastos")
    .select("*")
    .order("fecha", { ascending: false });

  if (error) {
    console.error("Error cargando gastos:", error.message);
    return;
  }

  pintarTabla(data);
  pintarStats(data);
  pintarCategorias(data);
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
  const { data, error } = await supabase.from("gastos").select("*").eq("id", id).single();
  if (error) return alert("Error: " + error.message);

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
  if (!confirm("¿Seguro que deseas eliminar este gasto?")) return;

  const { error } = await supabase.from("gastos").delete().eq("id", id);
  if (error) return alert("Error al eliminar: " + error.message);

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

// ---------- INICIO ----------
setFecha(new Date());
setCategoria(CATEGORIAS[0]);
cargarFamilia();
cargarGastos();
