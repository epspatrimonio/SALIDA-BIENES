document.addEventListener('DOMContentLoaded', () => {
  let activos = [];
  let bienesSeleccionados = [];
  let responsablesList = []; // Lista única de responsables para autocompletado
  let responsablesDataMap = {}; // Mapea nombre -> {cargo, ubicacion}
  let historialSalidas = [];

  // Elementos del DOM - Origen de datos y General
  const dataStatusBadge = document.getElementById('data-status-badge');
  const fileUploader = document.getElementById('file-uploader');
  
  // Elementos de Navegación
  const tabNuevaOrden = document.getElementById('tab-nueva-orden');
  const tabHistorial = document.getElementById('tab-historial');
  const sectionNuevaOrden = document.getElementById('section-nueva-orden');
  const sectionHistorial = document.getElementById('section-historial');
  const btnRefrescarHistorial = document.getElementById('btn-refrescar-historial');
  const historialTbody = document.getElementById('historial-tbody');

  // Elementos del Formulario
  const formFecha = document.getElementById('form-fecha');
  const formMotivo = document.getElementById('form-motivo');
  const formResponsable = document.getElementById('form-responsable');
  const formCargo = document.getElementById('form-cargo');
  const formUbicacion = document.getElementById('form-ubicacion');
  const formRespTecnico = document.getElementById('form-resp-tecnico');
  const formObservaciones = document.getElementById('form-observaciones');
  
  const searchResponsable = document.getElementById('search-responsable');
  const responsableSuggestions = document.getElementById('responsable-suggestions');
  
  const searchActivo = document.getElementById('search-activo');
  const activoSuggestions = document.getElementById('activo-suggestions');
  
  const bienesTbody = document.getElementById('bienes-tbody');
  const selectedCountBadge = document.getElementById('selected-count');
  
  const btnLimpiar = document.getElementById('btn-limpiar');
  const btnGenerar = document.getElementById('btn-generar');

  // Inicializar fecha de hoy por defecto en el formulario
  const hoy = new Date().toISOString().split('T')[0];
  formFecha.value = hoy;

  // Cargar datos al iniciar
  loadActivosData();

  // Función asíncrona para buscar y cargar activos en diferentes rutas posibles
  async function loadActivosData() {
    const paths = [
      '/api/activos',                           // 1. Endpoint en vivo de FastAPI
      '../public/activos.json',                 // 2. Ruta relativa al dashboard (public)
      './activos.json'                          // 3. Ruta local en la misma carpeta
    ];

    let loaded = false;
    for (const path of paths) {
      try {
        const response = await fetch(path);
        if (response.ok) {
          activos = await response.json();
          processActivosData();
          updateStatusBadge('success', 'Activos cargados correctamente');
          loaded = true;
          break;
        }
      } catch (err) {
        console.warn(`No se pudo cargar activos desde ${path}:`, err);
      }
    }

    if (!loaded) {
      updateStatusBadge('warning', 'Sube activos.json manualmente o inicia el servidor');
    }
  }

  // Procesar datos al cargar para obtener responsables únicos
  function processActivosData() {
    responsablesDataMap = {};
    const respSet = new Set();

    activos.forEach(item => {
      const resp = item.responsable ? item.responsable.trim().toUpperCase() : '';
      if (resp) {
        respSet.add(resp);
        if (!responsablesDataMap[resp]) {
          responsablesDataMap[resp] = {
            cargo: item.puesto || item.unidad || '—',
            ubicacion: item.localidad || item.sucursal || '—'
          };
        } else {
          if (item.puesto && responsablesDataMap[resp].cargo === '—') {
            responsablesDataMap[resp].cargo = item.puesto;
          }
          if (item.localidad && responsablesDataMap[resp].ubicacion === '—') {
            responsablesDataMap[resp].ubicacion = item.localidad;
          }
        }
      }
    });

    responsablesList = Array.from(respSet).sort();
  }

  // Actualizar estado del badge de carga de activos
  function updateStatusBadge(type, message) {
    if (type === 'success') {
      dataStatusBadge.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200';
      dataStatusBadge.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> ${message}`;
    } else if (type === 'warning') {
      dataStatusBadge.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200';
      dataStatusBadge.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span> ${message}`;
    }
  }

  // Manejar subida manual de activos.json
  fileUploader.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        activos = JSON.parse(event.target.result);
        processActivosData();
        updateStatusBadge('success', 'Activos subidos manualmente');
        searchActivo.disabled = false;
        searchResponsable.disabled = false;
      } catch (err) {
        alert('Error al leer el archivo JSON. Asegúrese de que sea un archivo válido.');
        console.error(err);
      }
    };
    reader.readAsText(file);
  });

  // Alternar entre pestañas de navegación
  function switchTab(tab) {
    if (tab === 'nueva-orden') {
      tabNuevaOrden.className = "px-5 py-3 text-sm font-bold border-b-2 border-[#00B0F0] text-[#00B0F0] transition-colors focus:outline-none cursor-pointer";
      tabHistorial.className = "px-5 py-3 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors focus:outline-none cursor-pointer";
      sectionNuevaOrden.classList.remove('hidden');
      sectionHistorial.classList.add('hidden');
    } else {
      tabHistorial.className = "px-5 py-3 text-sm font-bold border-b-2 border-[#00B0F0] text-[#00B0F0] transition-colors focus:outline-none cursor-pointer";
      tabNuevaOrden.className = "px-5 py-3 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors focus:outline-none cursor-pointer";
      sectionNuevaOrden.classList.add('hidden');
      sectionHistorial.classList.remove('hidden');
      loadHistorial();
    }
  }

  if (tabNuevaOrden) tabNuevaOrden.addEventListener('click', () => switchTab('nueva-orden'));
  if (tabHistorial) tabHistorial.addEventListener('click', () => switchTab('historial'));
  if (btnRefrescarHistorial) btnRefrescarHistorial.addEventListener('click', loadHistorial);

  // Cargar Historial desde la API
  async function loadHistorial() {
    historialTbody.innerHTML = `
      <tr>
        <td colspan="7" class="p-8 text-center text-slate-400 font-medium animate-pulse">
          Cargando historial de salidas de la base de datos...
        </td>
      </tr>
    `;
    try {
      const response = await fetch('/api/activos/salidas');
      if (response.ok) {
        historialSalidas = await response.json();
        renderHistorialTable();
      } else {
        historialTbody.innerHTML = `
          <tr>
            <td colspan="7" class="p-8 text-center text-red-500 font-semibold">
              Error al consultar el servidor (Estatus: ${response.status}).
            </td>
          </tr>
        `;
      }
    } catch (err) {
      console.error(err);
      historialTbody.innerHTML = `
        <tr>
          <td colspan="7" class="p-8 text-center text-red-500 font-semibold">
            Error de conexión con el servidor. Por favor inicie el backend local.
          </td>
        </tr>
      `;
    }
  }

  // Renderizar la tabla del historial
  function renderHistorialTable() {
    if (historialSalidas.length === 0) {
      historialTbody.innerHTML = `
        <tr>
          <td colspan="7" class="p-8 text-center text-slate-400 font-medium">
            No hay registros de salidas en la base de datos.
          </td>
        </tr>
      `;
      return;
    }

    historialTbody.innerHTML = '';
    historialSalidas.forEach(salida => {
      const row = document.createElement('tr');
      row.className = 'hover:bg-slate-50 transition-colors align-middle';

      // Nro Orden
      const cellNro = document.createElement('td');
      cellNro.className = 'p-3 font-bold text-brand-600 font-mono';
      cellNro.textContent = salida.n_orden;
      row.appendChild(cellNro);

      // Fecha
      const cellFecha = document.createElement('td');
      cellFecha.className = 'p-3 text-slate-600 font-medium';
      const parts = salida.fecha_orden.split('-');
      cellFecha.textContent = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : salida.fecha_orden;
      row.appendChild(cellFecha);

      // Responsable / Cargo
      const cellResp = document.createElement('td');
      cellResp.className = 'p-3';
      cellResp.innerHTML = `
        <div class="font-semibold text-slate-900 text-xs">${salida.responsable}</div>
        <div class="text-slate-500 text-[0.7rem]">${salida.cargo}</div>
      `;
      row.appendChild(cellResp);

      // Tipo / Ubicación
      const cellTipo = document.createElement('td');
      cellTipo.className = 'p-3';
      cellTipo.innerHTML = `
        <span class="inline-flex items-center px-2 py-0.5 rounded text-[0.65rem] font-bold bg-slate-100 text-slate-700 mb-1 uppercase">${salida.tipo_salida}</span>
        <div class="text-slate-500 text-[0.7rem]">${salida.ubicacion}</div>
      `;
      row.appendChild(cellTipo);

      // Motivo
      const cellMotivo = document.createElement('td');
      cellMotivo.className = 'p-3 text-slate-600 text-[0.75rem] max-w-xs truncate';
      cellMotivo.textContent = salida.motivo;
      cellMotivo.title = salida.motivo;
      row.appendChild(cellMotivo);

      // Bienes count
      const cellBienes = document.createElement('td');
      cellBienes.className = 'p-3 text-center font-bold text-slate-700';
      cellBienes.textContent = salida.bienes ? salida.bienes.length : 0;
      row.appendChild(cellBienes);

      // Acciones (Re-generar PDF)
      const cellAccion = document.createElement('td');
      cellAccion.className = 'p-3 text-center';
      
      const btnDownload = document.createElement('button');
      btnDownload.type = 'button';
      btnDownload.className = 'px-3 py-1.5 bg-brand-50 hover:bg-[#b8eeff]/50 text-brand-850 border border-brand-200 rounded text-[0.7rem] font-bold transition-colors flex items-center gap-1 mx-auto cursor-pointer';
      btnDownload.innerHTML = `
        <svg class="w-3.5 h-3.5 text-brand-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        Descargar PDF
      `;
      btnDownload.addEventListener('click', async () => {
        btnDownload.disabled = true;
        const originalText = btnDownload.innerHTML;
        btnDownload.innerHTML = '⏳ Cargando...';
        try {
          const [logoImg, selloImg] = await Promise.all([
            loadImage('logo_eps2.png').catch(() => null),
            loadImage('Sello Post Firma - CP1.png').catch(() => null)
          ]);
          await generarOrdenSalidaPDF(salida, logoImg, selloImg);
        } catch (err) {
          console.error(err);
        } finally {
          btnDownload.innerHTML = originalText;
          btnDownload.disabled = false;
        }
      });
      cellAccion.appendChild(btnDownload);
      row.appendChild(cellAccion);

      historialTbody.appendChild(row);
    });
  }

  // Autocompletado de Responsables
  searchResponsable.addEventListener('input', (e) => {
    const query = e.target.value.trim().toUpperCase();
    if (!query) {
      responsableSuggestions.classList.add('hidden');
      return;
    }

    const matches = responsablesList.filter(name => name.includes(query)).slice(0, 10);
    if (matches.length === 0) {
      responsableSuggestions.classList.add('hidden');
      return;
    }

    responsableSuggestions.innerHTML = '';
    matches.forEach(name => {
      const div = document.createElement('div');
      div.className = 'p-2.5 hover:bg-slate-50 cursor-pointer text-xs transition-colors border-b border-slate-100 last:border-b-0 font-medium text-slate-700';
      div.textContent = name;
      div.addEventListener('click', () => {
        formResponsable.value = name;
        const info = responsablesDataMap[name];
        if (info) {
          formCargo.value = info.cargo;
          formUbicacion.value = info.ubicacion;
        }
        searchResponsable.value = '';
        responsableSuggestions.classList.add('hidden');
      });
      responsableSuggestions.appendChild(div);
    });
    responsableSuggestions.classList.remove('hidden');
  });

  // Cerrar sugerencias al hacer click fuera
  document.addEventListener('click', (e) => {
    if (e.target !== searchResponsable) {
      responsableSuggestions.classList.add('hidden');
    }
    if (e.target !== searchActivo) {
      activoSuggestions.classList.add('hidden');
    }
  });

  // Autocompletado de Activos
  searchActivo.addEventListener('input', (e) => {
    const query = e.target.value.trim().toUpperCase();
    if (!query) {
      activoSuggestions.classList.add('hidden');
      return;
    }

    const matches = activos.filter(item => {
      const code = item.cod_patrimonial || '';
      const denom = item.denominacion || '';
      const resp = item.responsable || '';
      return code.toUpperCase().includes(query) || 
             denom.toUpperCase().includes(query) ||
             resp.toUpperCase().includes(query);
    }).slice(0, 15);

    if (matches.length === 0) {
      activoSuggestions.classList.add('hidden');
      return;
    }

    activoSuggestions.innerHTML = '';
    matches.forEach(item => {
      const div = document.createElement('div');
      div.className = 'p-3 hover:bg-slate-50 cursor-pointer text-xs transition-colors border-b border-slate-100 last:border-b-0 flex flex-col gap-0.5';
      
      const codeSpan = document.createElement('span');
      codeSpan.className = 'font-bold text-brand-600';
      codeSpan.textContent = item.cod_patrimonial || 'SIN CÓDIGO';
      
      const denomSpan = document.createElement('span');
      denomSpan.className = 'text-slate-800 font-medium';
      denomSpan.textContent = item.denominacion || 'S/D';
      
      const respSpan = document.createElement('span');
      respSpan.className = 'text-slate-450 text-[0.7rem] font-semibold text-slate-500';
      respSpan.textContent = `Resp: ${item.responsable || 'Sin asignar'} | Color: ${item.color || 'NEGRO'} | Serie: ${item.numero_serie || 'S/S'}`;

      div.appendChild(codeSpan);
      div.appendChild(denomSpan);
      div.appendChild(respSpan);

      div.addEventListener('click', () => {
        addActivoToSelection(item);
        searchActivo.value = '';
        activoSuggestions.classList.add('hidden');
      });
      activoSuggestions.appendChild(div);
    });
    activoSuggestions.classList.remove('hidden');
  });

  // Agregar Activo seleccionado a la lista
  function addActivoToSelection(item) {
    const exists = bienesSeleccionados.some(b => b.cod_patrimonial === item.cod_patrimonial);
    if (exists) {
      alert('Este bien ya ha sido agregado a la orden de salida.');
      return;
    }

    bienesSeleccionados.push({
      cod_patrimonial: item.cod_patrimonial || '',
      denominacion: item.denominacion || '',
      color: item.color || 'NEGRO',
      marca: item.marca || 'S/M',
      modelo: item.modelo || 'S/M',
      numero_serie: item.numero_serie || 'S/S',
      estado_activo: item.estado_activo || 'BUENO',
      accesorios: ''
    });

    renderSelectedBienesTable();
  }

  // Renderizar la tabla de bienes seleccionados
  function renderSelectedBienesTable() {
    if (bienesSeleccionados.length === 0) {
      bienesTbody.innerHTML = `
        <tr id="empty-bienes-row">
          <td colspan="7" class="p-8 text-center text-slate-400 font-medium">
            <svg class="w-12 h-12 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
            </svg>
            No se han agregado bienes a la orden. Búscalos arriba para agregarlos.
          </td>
        </tr>
      `;
      selectedCountBadge.textContent = '0 Bienes Seleccionados';
      return;
    }

    bienesTbody.innerHTML = '';
    selectedCountBadge.textContent = `${bienesSeleccionados.length} Bienes Seleccionados`;

    bienesSeleccionados.forEach((bien, index) => {
      const row = document.createElement('tr');
      row.className = 'hover:bg-slate-50 transition-colors align-middle';

      // Nro
      const cellNro = document.createElement('td');
      cellNro.className = 'p-3 text-center font-bold text-slate-500';
      cellNro.textContent = index + 1;
      row.appendChild(cellNro);

      // Cod. Patrimonial
      const cellCod = document.createElement('td');
      cellCod.className = 'p-3 font-semibold text-slate-900 font-mono';
      cellCod.textContent = bien.cod_patrimonial || '—';
      row.appendChild(cellCod);

      // Denominación
      const cellDenom = document.createElement('td');
      cellDenom.className = 'p-3 font-medium text-slate-800';
      cellDenom.textContent = bien.denominacion;
      row.appendChild(cellDenom);

      // Características (Color, Marca, Modelo, Serie)
      const cellCaract = document.createElement('td');
      cellCaract.className = 'p-3';
      
      const gridDiv = document.createElement('div');
      gridDiv.className = 'grid grid-cols-2 gap-1.5';
      
      gridDiv.innerHTML = `
        <div class="flex flex-col">
          <span class="text-[0.6rem] font-bold text-slate-400 uppercase tracking-wide">Color</span>
          <input type="text" value="${bien.color}" class="border border-slate-200 rounded px-1.5 py-0.5 text-[0.7rem] focus:outline-none focus:border-brand-500 w-full" data-field="color" data-index="${index}">
        </div>
        <div class="flex flex-col">
          <span class="text-[0.6rem] font-bold text-slate-400 uppercase tracking-wide">Marca</span>
          <input type="text" value="${bien.marca}" class="border border-slate-200 rounded px-1.5 py-0.5 text-[0.7rem] focus:outline-none focus:border-brand-500 w-full" data-field="marca" data-index="${index}">
        </div>
        <div class="flex flex-col">
          <span class="text-[0.6rem] font-bold text-slate-400 uppercase tracking-wide">Modelo</span>
          <input type="text" value="${bien.modelo}" class="border border-slate-200 rounded px-1.5 py-0.5 text-[0.7rem] focus:outline-none focus:border-brand-500 w-full" data-field="modelo" data-index="${index}">
        </div>
        <div class="flex flex-col">
          <span class="text-[0.6rem] font-bold text-slate-400 uppercase tracking-wide">Serie</span>
          <input type="text" value="${bien.numero_serie}" class="border border-slate-200 rounded px-1.5 py-0.5 text-[0.7rem] focus:outline-none focus:border-brand-500 w-full" data-field="numero_serie" data-index="${index}">
        </div>
      `;

      cellCaract.appendChild(gridDiv);
      row.appendChild(cellCaract);

      // Estado
      const cellEstado = document.createElement('td');
      cellEstado.className = 'p-3';
      
      const selectEstado = document.createElement('select');
      selectEstado.className = 'border border-slate-200 rounded px-1.5 py-1 text-[0.7rem] focus:outline-none focus:border-brand-500 w-full';
      selectEstado.innerHTML = `
        <option value="BUENO" ${bien.estado_activo === 'BUENO' ? 'selected' : ''}>BUENO</option>
        <option value="REGULAR" ${bien.estado_activo === 'REGULAR' ? 'selected' : ''}>REGULAR</option>
        <option value="MALO" ${bien.estado_activo === 'MALO' ? 'selected' : ''}>MALO</option>
        <option value="NUEVO" ${bien.estado_activo === 'NUEVO' ? 'selected' : ''}>NUEVO</option>
      `;
      selectEstado.addEventListener('change', (e) => {
        bienesSeleccionados[index].estado_activo = e.target.value;
      });
      cellEstado.appendChild(selectEstado);
      row.appendChild(cellEstado);

      // Accesorios
      const cellAccesorios = document.createElement('td');
      cellAccesorios.className = 'p-3';
      
      const inputAccesorios = document.createElement('input');
      inputAccesorios.type = 'text';
      inputAccesorios.value = bien.accesorios;
      inputAccesorios.placeholder = 'Cargador, mouse, etc...';
      inputAccesorios.className = 'border border-slate-200 rounded px-2 py-1 text-[0.7rem] focus:outline-none focus:border-brand-500 w-full';
      inputAccesorios.addEventListener('input', (e) => {
        bienesSeleccionados[index].accesorios = e.target.value;
      });
      cellAccesorios.appendChild(inputAccesorios);
      row.appendChild(cellAccesorios);

      // Acciones
      const cellAccion = document.createElement('td');
      cellAccion.className = 'p-3 text-center';
      
      const btnDelete = document.createElement('button');
      btnDelete.type = 'button';
      btnDelete.className = 'p-1.5 hover:bg-red-50 text-red-500 rounded transition-colors cursor-pointer';
      btnDelete.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
      `;
      btnDelete.addEventListener('click', () => {
        bienesSeleccionados.splice(index, 1);
        renderSelectedBienesTable();
      });
      cellAccion.appendChild(btnDelete);
      row.appendChild(cellAccion);

      bienesTbody.appendChild(row);
    });

    // Registrar inputs
    const caractInputs = bienesTbody.querySelectorAll('input[data-field]');
    caractInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        const field = e.target.dataset.field;
        const index = parseInt(e.target.dataset.index, 10);
        bienesSeleccionados[index][field] = e.target.value;
      });
    });
  }

  // Limpiar Formulario completo
  btnLimpiar.addEventListener('click', () => {
    if (confirm('¿Está seguro de que desea limpiar todos los campos del formulario y vaciar la lista de bienes?')) {
      limpiarFormularioCompleto();
    }
  });

  function limpiarFormularioCompleto() {
    formMotivo.value = '';
    formResponsable.value = '';
    formCargo.value = '';
    formUbicacion.value = '';
    formRespTecnico.value = '';
    formObservaciones.value = '';
    formFecha.value = hoy;
    searchResponsable.value = '';
    searchActivo.value = '';
    bienesSeleccionados = [];
    renderSelectedBienesTable();
  }

  // Auxiliar para cargar imágenes dinámicamente
  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`No se pudo cargar la imagen: ${url}`));
      img.src = url;
    });
  }

  // Registrar orden en base de datos y descargar PDF
  btnGenerar.addEventListener('click', async (e) => {
    e.preventDefault();

    // Validar formulario básico
    if (!formFecha.value || !formResponsable.value.trim() || !formCargo.value.trim() || !formUbicacion.value.trim() || !formMotivo.value.trim()) {
      alert('Por favor complete todos los datos obligatorios del formulario (Fecha, Motivo, Responsable, Cargo y Ubicación).');
      return;
    }

    if (bienesSeleccionados.length === 0) {
      alert('Por favor agregue al menos un bien patrimonial a la orden de salida.');
      return;
    }

    const originalText = btnGenerar.innerHTML;
    btnGenerar.innerHTML = '⏳ Registrando en BD...';
    btnGenerar.disabled = true;

    try {
      // 1. Recopilar datos para la API
      const selectedTipo = document.querySelector('input[name="tipo_salida"]:checked').value;
      
      const payload = {
        fecha_orden: formFecha.value,
        tipo_salida: selectedTipo,
        motivo: formMotivo.value.trim(),
        responsable: formResponsable.value.trim(),
        cargo: formCargo.value.trim(),
        ubicacion: formUbicacion.value.trim(),
        resp_tecnico: formRespTecnico.value.trim() || null,
        observaciones: formObservaciones.value.trim() || null,
        bienes: bienesSeleccionados.map(b => ({
          cod_patrimonial: b.cod_patrimonial || null,
          denominacion: b.denominacion,
          color: b.color || null,
          marca: b.marca || null,
          modelo: b.modelo || null,
          numero_serie: b.numero_serie || null,
          estado_activo: b.estado_activo,
          accesorios: b.accesorios || null
        }))
      };

      // 2. Realizar petición POST al backend
      const response = await fetch('/api/activos/salidas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        let errMsg = '';
        if (errorData.detail && Array.isArray(errorData.detail)) {
          errorData.detail.forEach(err => {
            const field = err.loc[err.loc.length - 1];
            errMsg += `- Campo "${field}": ${err.msg}\n`;
          });
        } else {
          errMsg = errorData.detail || 'Fallo en la comunicación con el servidor.';
        }
        throw new Error(errMsg);
      }

      const dbSalidaResult = await response.json();

      // 3. Cargar imágenes y generar PDF
      btnGenerar.innerHTML = '⏳ Generando PDF...';
      const [logoImg, selloImg] = await Promise.all([
        loadImage('logo_eps2.png').catch(() => null),
        loadImage('Sello Post Firma - CP1.png').catch(() => null)
      ]);

      await generarOrdenSalidaPDF(dbSalidaResult, logoImg, selloImg);
      
      alert(`Orden de Salida ${dbSalidaResult.n_orden} registrada y descargada con éxito.`);
      
      // 4. Limpiar formulario
      limpiarFormularioCompleto();

    } catch (err) {
      console.error('Error al registrar/generar la orden:', err);
      alert(`Hubo un error al registrar la orden de salida: ${err.message || err}`);
    } finally {
      btnGenerar.innerHTML = originalText;
      btnGenerar.disabled = false;
    }
  });

  // Función reutilizable para generar el PDF de una orden de salida
  async function generarOrdenSalidaPDF(salidaData, logoImg, selloImg) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    
    const marginX = 15;
    let posY = 15;
    
    // 1. Encabezado de la Orden
    if (logoImg) {
      doc.addImage(logoImg, 'PNG', marginX, posY, 22, 11);
    }
    
    // Datos de Entidad
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(30, 41, 59);
    doc.text('E.P.S. "SELVA CENTRAL" S.A.', marginX + 24, posY + 2.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.text('CHANCHAMAYO - OXAPAMPA - SATIPO', marginX + 24, posY + 5);
    doc.text('RUC: N° 20121876290', marginX + 24, posY + 7.5);

    // Fecha en la esquina derecha superior
    const rawFecha = salidaData.fecha_orden;
    const dateParts = rawFecha.split('-');
    const fechaFormateada = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : rawFecha;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`FECHA: ${fechaFormateada}`, 195, posY + 5, { align: 'right' });

    // Título
    posY += 20;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("ORDEN DE SALIDA DE BIENES", 105, posY, { align: 'center' });
    
    // Subrayado
    const titleWidth = doc.getTextWidth("ORDEN DE SALIDA DE BIENES");
    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 0, 0);
    doc.line(105 - (titleWidth / 2), posY + 1.5, 105 + (titleWidth / 2), posY + 1.5);

    // 2. Solicito (Tipo de Salida)
    posY += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("SOLICITO", marginX, posY);
    
    posY += 5;
    const selectedTipo = salidaData.tipo_salida;
    const tipos = [
      { label: 'Mantenimiento', key: 'Mantenimiento' },
      { label: 'Trabajo de campo', key: 'Trabajo de campo' },
      { label: 'Evento institucional', key: 'Evento institucional' },
      { label: 'otros', key: 'otros' }
    ];

    let posX = marginX;
    tipos.forEach(t => {
      const isChecked = selectedTipo.toLowerCase() === t.key.toLowerCase();
      
      doc.setLineWidth(0.3);
      doc.setDrawColor(100, 100, 100);
      doc.setFillColor(255, 255, 255);
      doc.circle(posX + 2, posY - 1.5, 1.8, 'FD');

      if (isChecked) {
        doc.setFillColor(0, 176, 240); // Celeste
        doc.circle(posX + 2, posY - 1.5, 1, 'FD');
      }

      doc.setFont("helvetica", isChecked ? "bold" : "normal");
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text(t.label, posX + 6, posY - 0.5);

      posX += 44;
    });

    // 3. Motivo
    posY += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text("MOTIVO", marginX, posY);

    posY += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    const motivoText = salidaData.motivo.trim().toUpperCase();
    const splitMotivo = doc.splitTextToSize(motivoText, 180);
    doc.text(splitMotivo, marginX, posY);
    
    posY += (splitMotivo.length * 4) + 2;

    // 4. Titular del Bien
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text("TITULAR DEL BIEN", marginX, posY);

    posY += 3;
    const respName = salidaData.responsable.trim().toUpperCase();
    const respCargo = salidaData.cargo.trim().toUpperCase();
    const respUbicacion = salidaData.ubicacion.trim().toUpperCase();

    doc.autoTable({
      body: [
        [{ content: 'RESPONSABLE:', styles: { fillColor: [0, 176, 240], textColor: [255, 255, 255], fontStyle: 'bold', cellWidth: 42 } }, respName],
        [{ content: 'CARGO:', styles: { fillColor: [0, 176, 240], textColor: [255, 255, 255], fontStyle: 'bold', cellWidth: 42 } }, respCargo],
        [{ content: 'UBICACIÓN-DEPENDENCIA:', styles: { fillColor: [0, 176, 240], textColor: [255, 255, 255], fontStyle: 'bold', cellWidth: 42 } }, respUbicacion]
      ],
      startY: posY,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, valign: 'middle' },
      margin: { left: marginX, right: marginX }
    });
    
    posY = doc.lastAutoTable.finalY + 6;

    // 5. Descripción del Bien
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text("DESCRIPCIÓN DEL BIEN", marginX, posY);

    posY += 3;

    const headers = [
      [
        { content: 'NÚMERO', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' } },
        { content: 'DENOMINACIÓN', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' } },
        { content: 'CARACTERÍSTICAS DEL BIEN', colSpan: 4, styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'ESTADO', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' } },
        { content: 'ACCESORIOS', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' } }
      ],
      [
        { content: 'COLOR', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'MARCA', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'MODELO', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'SERIE', styles: { halign: 'center', fontStyle: 'bold' } }
      ]
    ];

    const tableData = salidaData.bienes.map((b, idx) => [
      idx + 1,
      b.denominacion.toUpperCase(),
      (b.color || 'NEGRO').toUpperCase(),
      (b.marca || 'S/M').toUpperCase(),
      (b.modelo || 'S/M').toUpperCase(),
      (b.numero_serie || 'S/S').toUpperCase(),
      (b.estado_activo || 'BUENO').toUpperCase(),
      (b.accesorios || '—').toUpperCase()
    ]);

    const columnStyles = {
      0: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 35 },
      2: { cellWidth: 18 },
      3: { cellWidth: 20 },
      4: { cellWidth: 22 },
      5: { cellWidth: 28 },
      6: { cellWidth: 18, halign: 'center' },
      7: { cellWidth: 24 }
    };

    doc.autoTable({
      head: headers,
      body: tableData,
      startY: posY,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2, valign: 'middle' },
      headStyles: { fillColor: [0, 176, 240], textColor: [255, 255, 255] },
      columnStyles: columnStyles,
      margin: { left: marginX, right: marginX }
    });

    posY = doc.lastAutoTable.finalY + 6;

    const pageHeight = doc.internal.pageSize.height;
    if (posY + 60 > pageHeight) {
      doc.addPage();
      posY = 20;
    }

    // 6. Observaciones
    const obsText = salidaData.observaciones ? salidaData.observaciones.trim().toUpperCase() : 'SIN OBSERVACIONES ADICIONALES.';
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text("OBSERVACIONES:", marginX, posY);
    
    posY += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    const splitObs = doc.splitTextToSize(obsText, 180);
    doc.text(splitObs, marginX, posY);
    
    posY += (splitObs.length * 4) + 6;

    // 7. Nota Legal
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    doc.text("NOTA", marginX, posY);

    posY += 3.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.setTextColor(30, 41, 59);
    const notaText = "EL TRABAJADOR ES RESPONSABLE DIRECTO Y ABSOLUTO DE LA EXISTENCIA, PERMANENCIA, CONSERVACIÓN DEL BIEN EN USO, EVITAR PERDIDA, SUSTRACCIÓN, DETERIODO ETC. EN CASO DE PÉRDIDA, EXTRAVIO O DETERIORO POR EL MAL USO DE LOS BIENES PATRIMONIALES DESCRITOS, ESTOS SERÁN REPUESTOS O REPARADOS POR EL TRABAJADOR RESPONSABLE DE LOS MISMOS. CUALQUIER MOVIMIENTOS DENTRO O FUERA DE LA ENTIDAD DEBERA SER COMUNICADO AL RESPONSABLE DE CONTROL PATRIMONIAL, BAJO RESPONSABILIDAD.";
    const splitNota = doc.splitTextToSize(notaText, 180);
    doc.text(splitNota, marginX, posY);

    // 8. Firmas
    const yLine = pageHeight - 35;
    
    if (posY + (splitNota.length * 3) + 5 > yLine - 10) {
      doc.addPage();
    }

    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.25);
    
    doc.line(15, yLine, 65, yLine);     // Titular
    doc.line(80, yLine, 130, yLine);    // Responsable a Cargo
    doc.line(145, yLine, 195, yLine);   // Control Patrimonial

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    
    doc.text("TITULAR DEL BIEN", 40, yLine + 4, { align: 'center' });
    
    const cargoSalidaText = salidaData.resp_tecnico ? salidaData.resp_tecnico.trim().toUpperCase() : 'ÁREA TÉCNICA';
    doc.text("RESPONSABLE A CARGO DE SALIDA", 105, yLine + 4, { align: 'center' });
    doc.setFont("helvetica", "normal");
    doc.text(`(${cargoSalidaText})`, 105, yLine + 7.5, { align: 'center' });

    doc.setFont("helvetica", "bold");
    doc.text("CONTROL PATRIMONIAL", 170, yLine + 4, { align: 'center' });

    // Sello digital
    if (selloImg) {
      doc.addImage(selloImg, 'PNG', 147, yLine - 22, 45, 20);
    }

    // Descargar PDF
    const sanitizeName = salidaData.responsable.replace(/\s+/g, '_').toUpperCase();
    doc.save(`Orden_Salida_Bienes_${salidaData.n_orden}_${sanitizeName}.pdf`);
  }

});
