document.addEventListener("DOMContentLoaded", function() {

    // --- MOTOR DE FECHAS ---
    function procesarFechaCheque(fechaStr) {
        if (!fechaStr) return { diffDays: 0, estado: "Pendiente", colorFondo: "#fef3c7", colorTexto: "#d97706", textoDias: "30 días" };
        
        const partes = fechaStr.split('/');
        const fechaPago = new Date(partes[2], partes[1] - 1, partes[0]);
        
        // Sumamos 30 días a la fecha de pago por ley para obtener la caducidad real
        const fechaVencimiento = new Date(fechaPago);
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);
        
        const hoy = new Date();
        hoy.setHours(0,0,0,0);
        fechaVencimiento.setHours(0,0,0,0);
        
        // Calculamos los días restantes basados en el vencimiento real
        const diffDays = Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));
        
        let estado = "Pendiente", colorFondo = "#fef3c7", colorTexto = "#d97706", textoDias = `${diffDays} días`;

        if (diffDays < 0) {
            estado = "Vencido"; 
            colorFondo = "#fee2e2"; 
            colorTexto = "#dc2626"; 
            textoDias = `Vencido (${Math.abs(diffDays)}d)`;
        } else if (diffDays === 0) {
            estado = "Próx. a vencer"; 
            colorFondo = "#ffedd5"; 
            colorTexto = "#ea580c";
            textoDias = "Vence HOY";
        } else if (diffDays <= 5) { // Avisa con 5 días de anticipación
            estado = "Próx. a vencer"; 
            colorFondo = "#ffedd5"; 
            colorTexto = "#ea580c";
        }
        return { diffDays, estado, colorFondo, colorTexto, textoDias };
    }

    // --- VARIABLES GLOBALES DE FILTROS ---
    let estadoSeleccionado = "Todos";
    let bancoSeleccionado = "Todos";
    const inputBusqueda = document.querySelector(".input-busqueda");

    // --- 1. LÓGICA DE CHEQUES ---
    const tablaCheques = document.getElementById("tabla-cheques");
    function cargarCheques() {
        if (!tablaCheques) return; 
        const chequesGuardados = JSON.parse(localStorage.getItem("agrocheq_cheques")) || [];
        const textoBuscado = inputBusqueda ? inputBusqueda.value.toLowerCase() : "";
        tablaCheques.innerHTML = "";
        let totalMonto = 0, cantVencer = 0, cantPendientes = 0;

        const chequesFiltrados = chequesGuardados.filter(cheque => {
            const infoF = procesarFechaCheque(cheque.fecha);
            const cumpleTexto = (cheque.numero && cheque.numero.toLowerCase().includes(textoBuscado)) ||
                                (cheque.proveedor && cheque.proveedor.toLowerCase().includes(textoBuscado)) ||
                                (cheque.banco && cheque.banco.toLowerCase().includes(textoBuscado));
            const cumpleBanco = bancoSeleccionado === "Todos" || cheque.banco === bancoSeleccionado;
            const cumpleEstado = estadoSeleccionado === "Todos" || infoF.estado === estadoSeleccionado;
            return cumpleTexto && cumpleBanco && cumpleEstado;
        });

        if (chequesFiltrados.length === 0) {
            tablaCheques.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 3rem; color: #64748b;">No se encontraron cheques.</td></tr>`;
        } else {
            chequesFiltrados.forEach(cheque => {
                const infoF = procesarFechaCheque(cheque.fecha);
                totalMonto += parseInt(cheque.monto.replace(/\./g, '') || 0);
                if (infoF.estado === "Próx. a vencer" || infoF.estado === "Vencido") cantVencer++;
                if (infoF.estado === "Pendiente") cantPendientes++;

                const fila = document.createElement("tr");
                fila.innerHTML = `
                    <td style="font-family: monospace; font-weight: bold; color: var(--texto-principal);">#${cheque.numero}</td>
                    <td style="font-weight: 500;">${cheque.proveedor}</td>
                    <td>${cheque.banco}</td>
                    <td>${cheque.fecha}</td>
                    <td style="font-weight: bold; color: var(--texto-principal);">$ ${cheque.monto}</td>
                    <td><span style="background: ${infoF.colorFondo}; color: ${infoF.colorTexto}; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">${infoF.estado}</span></td>
                    <td style="${infoF.diffDays < 0 ? 'color: #dc2626; font-weight: bold;' : ''}">${infoF.textoDias}</td>
                `;
                tablaCheques.appendChild(fila);
            });
        }

        const elTotal = document.getElementById("cheques-total"), elVencer = document.getElementById("cheques-vencer"), elPendientes = document.getElementById("cheques-pendientes"), elMonto = document.getElementById("cheques-monto");
        if (elTotal) elTotal.textContent = chequesFiltrados.length;
        if (elVencer) elVencer.textContent = cantVencer;
        if (elPendientes) elPendientes.textContent = cantPendientes;
        if (elMonto) elMonto.textContent = "$" + new Intl.NumberFormat('es-AR').format(totalMonto);
    }

    // --- 2. LÓGICA DE INICIO (DASHBOARD) ---
    const tablaInicio = document.getElementById("tabla-cheques-inicio");
    function cargarDashboard() {
        if (!tablaInicio) return; 
        const chequesGuardados = JSON.parse(localStorage.getItem("agrocheq_cheques")) || [];
        let cantVencer = 0, cantPendientes = 0;
        tablaInicio.innerHTML = "";
        
        if (chequesGuardados.length === 0) {
            tablaInicio.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem; color: var(--texto-secundario);">No hay cheques recientes.</td></tr>`;
        } else {
            const ultimosCheques = chequesGuardados.slice(0, 5);
            ultimosCheques.forEach(cheque => {
                const infoF = procesarFechaCheque(cheque.fecha);
                if (infoF.estado === "Próx. a vencer" || infoF.estado === "Vencido") cantVencer++;
                if (infoF.estado === "Pendiente") cantPendientes++;
                const fila = document.createElement("tr");
                fila.innerHTML = `
                    <td style="font-family: monospace; font-weight: bold; color: var(--texto-principal);">#${cheque.numero}</td>
                    <td style="font-weight: 500;">${cheque.proveedor}</td>
                    <td>${cheque.banco}</td>
                    <td>${cheque.fecha}</td>
                    <td style="font-weight: bold; color: var(--texto-principal);">$ ${cheque.monto}</td>
                    <td><span style="background: ${infoF.colorFondo}; color: ${infoF.colorTexto}; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">${infoF.estado}</span></td>
                    <td style="${infoF.diffDays < 0 ? 'color: #dc2626; font-weight: bold;' : ''}">${infoF.textoDias}</td>
                `;
                tablaInicio.appendChild(fila);
            });
        }
        const valCartera = document.getElementById("resumen-cartera"), valPendientes = document.getElementById("resumen-pendientes"), valVencer = document.getElementById("resumen-vencer");
        if (valCartera) valCartera.textContent = chequesGuardados.length;
        if (valPendientes) valPendientes.textContent = cantPendientes;
        if (valVencer) valVencer.textContent = cantVencer;
    }

    // --- 3. LÓGICA DE PROVEEDORES ---
    const tablaProveedores = document.getElementById("tabla-proveedores");
    function cargarProveedores() {
        if (!tablaProveedores) return;
        const proveedoresGuardados = JSON.parse(localStorage.getItem("agrocheq_proveedores")) || [];
        tablaProveedores.innerHTML = "";
        if (proveedoresGuardados.length === 0) {
            tablaProveedores.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 3rem; color: var(--texto-secundario);">No hay proveedores registrados.</td></tr>`;
            return;
        }
        proveedoresGuardados.forEach(prov => {
            const fila = document.createElement("tr");
            fila.innerHTML = `<td style="font-weight: 500; color: var(--texto-principal);">${prov.nombre}</td><td>${prov.cuit}<br><small style="color: var(--texto-secundario);">${prov.correo}</small></td><td>0</td><td style="font-weight: bold;">$ 0</td><td><span style="background: #dcfce7; color: #15803d; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">Activo</span></td>`;
            tablaProveedores.appendChild(fila);
        });
    }

    // --- 4. LÓGICA DE ALERTAS AUTOMÁTICAS ---
    const listaAlertas = document.getElementById("lista-alertas");
    function cargarAlertas() {
        if (!listaAlertas) return;
        const chequesGuardados = JSON.parse(localStorage.getItem("agrocheq_cheques")) || [];
        listaAlertas.innerHTML = "";
        let cantVencidos = 0, cantProx = 0;

        chequesGuardados.forEach(cheque => {
            const infoF = procesarFechaCheque(cheque.fecha);
            
            // Dispara la alerta si venció o vence en 5 días o menos
            if (infoF.diffDays <= 5) {
                let colorBorde = infoF.diffDays < 0 ? "#dc2626" : "#ea580c";
                let titulo = infoF.diffDays < 0 ? "Cheque Vencido" : "Próximo a Vencer";
                if(infoF.diffDays < 0) cantVencidos++; else cantProx++;

                // Lógica de texto para que se lea natural
                let textoTiempo = infoF.diffDays < 0 
                    ? `venció hace ${Math.abs(infoF.diffDays)} días.` 
                    : (infoF.diffDays === 0 ? "vence <b>HOY</b>." : `vence en ${infoF.diffDays} días.`);

                const alertaDiv = document.createElement("div");
                alertaDiv.style.cssText = `padding: 1rem; border-left: 4px solid ${colorBorde}; background: #f8fafc; margin-bottom: 1rem; border-radius: 4px; border-right: 1px solid var(--borde-suave); border-top: 1px solid var(--borde-suave); border-bottom: 1px solid var(--borde-suave);`;
                alertaDiv.innerHTML = `
                    <strong style="color: ${colorBorde}; display: block; margin-bottom: 5px;">⚠️ ${titulo}</strong>
                    <p style="margin: 0; color: var(--texto-principal);">El cheque <b>#${cheque.numero}</b> de <b>${cheque.proveedor}</b> por <b>$${cheque.monto}</b> del ${cheque.banco} ${textoTiempo}</p>
                `;
                listaAlertas.appendChild(alertaDiv);
            }
        });

        if (listaAlertas.innerHTML === "") listaAlertas.innerHTML = `<p style="text-align:center; padding: 2rem; color: var(--texto-secundario);">No hay alertas de vencimientos. ¡Todo al día! 🎉</p>`;

        const elVencidos = document.getElementById("alerta-vencidos"), elProx = document.getElementById("alerta-prox"), elTotal = document.getElementById("alerta-total");
        if (elVencidos) elVencidos.textContent = cantVencidos;
        if (elProx) elProx.textContent = cantProx;
        if (elTotal) elTotal.textContent = cantVencidos + cantProx;
    }

    // --- 5. LÓGICA DE REPORTES ESTADÍSTICOS ---
    const reporteEstados = document.getElementById("reporte-estados");
    const reporteBancos = document.getElementById("reporte-bancos");
    function cargarReportes() {
        if (!reporteEstados || !reporteBancos) return;
        const chequesGuardados = JSON.parse(localStorage.getItem("agrocheq_cheques")) || [];
        
        let porEstado = { "Vencido": 0, "Próx. a vencer": 0, "Pendiente": 0 };
        let porBanco = {};

        chequesGuardados.forEach(cheque => {
            const infoF = procesarFechaCheque(cheque.fecha);
            if (porEstado[infoF.estado] !== undefined) porEstado[infoF.estado]++;
            porBanco[cheque.banco] = (porBanco[cheque.banco] || 0) + 1;
        });

        reporteEstados.innerHTML = `
            <div style="margin-bottom: 15px; display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 5px;"><span>🔴 Vencidos:</span> <strong>${porEstado["Vencido"]}</strong></div>
            <div style="margin-bottom: 15px; display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 5px;"><span>🟠 Próx. a vencer:</span> <strong>${porEstado["Próx. a vencer"]}</strong></div>
            <div style="margin-bottom: 15px; display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 5px;"><span>🟡 Pendientes:</span> <strong>${porEstado["Pendiente"]}</strong></div>
        `;

        reporteBancos.innerHTML = "";
        if(Object.keys(porBanco).length === 0) {
            reporteBancos.innerHTML = "<p style='color: var(--texto-secundario);'>No hay datos.</p>";
        } else {
            for (let banco in porBanco) {
                reporteBancos.innerHTML += `<div style="margin-bottom: 15px; display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 5px;"><span>🏦 ${banco}:</span> <strong>${porBanco[banco]} cheques</strong></div>`;
            }
        }
    }

    // --- INICIALIZADOR GLOBAL ---
    cargarCheques();
    cargarDashboard();
    cargarProveedores();
    cargarAlertas();
    cargarReportes();

    // --- EVENTOS DE GUARDADO Y MODALES ---
    const modalCheque = document.getElementById("modal-nuevo-cheque"), btnAbrirCheque = document.getElementById("btn-nuevo-cheque"), formCheque = document.getElementById("form-cheque");
    if (modalCheque && btnAbrirCheque) {
        btnAbrirCheque.addEventListener("click", () => modalCheque.style.display = "block");
        formCheque.addEventListener("submit", function(e) {
            e.preventDefault(); 
            const inputs = formCheque.querySelectorAll("input");
            let fechaF = inputs[3].value;
            if(fechaF.includes("-")) { const f = fechaF.split("-"); fechaF = `${f[2]}/${f[1]}/${f[0]}`; }
            const nuevoCheque = { numero: inputs[0].value, banco: inputs[1].value, proveedor: inputs[2].value, fecha: fechaF, monto: inputs[4].value };
            const chequesGuardados = JSON.parse(localStorage.getItem("agrocheq_cheques")) || [];
            chequesGuardados.unshift(nuevoCheque);
            localStorage.setItem("agrocheq_cheques", JSON.stringify(chequesGuardados));
            modalCheque.style.display = "none"; formCheque.reset();
            cargarCheques(); cargarDashboard(); cargarAlertas(); cargarReportes();
        });
    }

    const modalProv = document.getElementById("modal-nuevo-proveedor"), btnAbrirProv = document.getElementById("btn-nuevo-proveedor"), formProv = document.getElementById("form-proveedor");
    if (modalProv && btnAbrirProv) {
        btnAbrirProv.addEventListener("click", () => modalProv.style.display = "block");
        formProv.addEventListener("submit", function(e) {
            e.preventDefault();
            const inputs = formProv.querySelectorAll("input");
            const nuevoProv = { nombre: inputs[0].value, cuit: inputs[1].value, correo: inputs[2].value };
            const proveedoresGuardados = JSON.parse(localStorage.getItem("agrocheq_proveedores")) || [];
            proveedoresGuardados.unshift(nuevoProv);
            localStorage.setItem("agrocheq_proveedores", JSON.stringify(proveedoresGuardados));
            modalProv.style.display = "none"; formProv.reset();
            cargarProveedores();
        });
    }

    const inputMonto = document.getElementById("monto-cheque");
    if (inputMonto) inputMonto.addEventListener("input", function(e) {
        let valor = this.value.replace(/\D/g, "");
        if (valor !== "") valor = new Intl.NumberFormat('es-AR').format(parseInt(valor));
        this.value = valor;
    });

    if (inputBusqueda) inputBusqueda.addEventListener("input", cargarCheques);

    function configurarMenuFiltro(items, tipo) {
        if (!items) return;
        items.forEach(item => {
            item.addEventListener("click", function(e) {
                e.preventDefault();
                let valorLimpio = this.textContent.replace("✓ ", "").trim();
                items.forEach(i => { i.classList.remove("seleccionado"); i.textContent = i.textContent.replace("✓ ", "").trim(); });
                this.classList.add("seleccionado"); this.textContent = "✓ " + valorLimpio;
                if (tipo === "estado") estadoSeleccionado = valorLimpio;
                if (tipo === "banco") bancoSeleccionado = valorLimpio;
                cargarCheques();
            });
        });
    }
    configurarMenuFiltro(document.querySelectorAll("#menu-estado a"), "estado");
    configurarMenuFiltro(document.querySelectorAll("#menu-banco a"), "banco");

    const btnFiltroEstado = document.getElementById("btn-filtro-estado"), menuEstado = document.getElementById("menu-estado"), btnFiltroBanco = document.getElementById("btn-filtro-banco"), menuBanco = document.getElementById("menu-banco");
    if(btnFiltroEstado && menuEstado) btnFiltroEstado.addEventListener("click", e => { e.stopPropagation(); menuEstado.classList.toggle("mostrar"); });
    if(btnFiltroBanco && menuBanco) btnFiltroBanco.addEventListener("click", e => { e.stopPropagation(); menuBanco.classList.toggle("mostrar"); });

    const btnMarcarLeidas = document.getElementById("btn-marcar-leidas");
    if (btnMarcarLeidas) btnMarcarLeidas.addEventListener("click", () => alert("Todas las alertas marcadas como leídas."));

    document.querySelectorAll(".tab").forEach(tab => {
        tab.addEventListener("click", function() {
            document.querySelectorAll(".tab").forEach(t => t.classList.remove("activa"));
            this.classList.add("activa");
        });
    });

    document.querySelectorAll("button").forEach(boton => {
        if (boton.textContent.includes("Exportar")) boton.addEventListener("click", () => alert("Generando archivo descargable... (Simulación)"));
    });

   // --- 6. LÓGICA DE MI CUENTA (Perfil) ---
    const formPerfil = document.getElementById("form-perfil");
    if (formPerfil) {
        // Cargar datos al abrir la página (o poner valores por defecto si es la primera vez)
        const perfilGuardado = JSON.parse(localStorage.getItem("agrocheq_perfil")) || {
            nombre: "Usuario de Prueba",
            correo: "usuario@agrocheq.com",
            empresa: "AgroGanadera S.A."
        };
        
        document.getElementById("perfil-nombre").value = perfilGuardado.nombre;
        document.getElementById("perfil-correo").value = perfilGuardado.correo;
        document.getElementById("perfil-empresa").value = perfilGuardado.empresa;

        // Guardar nuevos datos ingresados
        formPerfil.addEventListener("submit", function(e) {
            e.preventDefault();
            const btnGuardar = this.querySelector('button[type="submit"]');
            const textoOriginal = btnGuardar.textContent;

            const nuevoPerfil = {
                nombre: document.getElementById("perfil-nombre").value,
                correo: document.getElementById("perfil-correo").value,
                empresa: document.getElementById("perfil-empresa").value
            };
            
            localStorage.setItem("agrocheq_perfil", JSON.stringify(nuevoPerfil));

            btnGuardar.textContent = "Guardando..."; 
            btnGuardar.style.backgroundColor = "#059669"; // Color verde de éxito
            
            setTimeout(() => { 
                alert("¡Tu cuenta ha sido actualizada exitosamente!"); 
                btnGuardar.textContent = textoOriginal; 
                btnGuardar.style.backgroundColor = ""; 
            }, 800);
        });
    }

    window.addEventListener("click", function(e) {
        if (e.target === modalCheque || e.target.id === "cerrar-modal" || e.target.id === "btn-cancelar") { if(modalCheque) modalCheque.style.display = "none"; }
        if (e.target === modalProv || e.target.id === "cerrar-modal-prov" || e.target.id === "btn-cancelar-prov") { if(modalProv) modalProv.style.display = "none"; }
        if (menuEstado && menuEstado.classList.contains('mostrar') && e.target !== btnFiltroEstado) menuEstado.classList.remove('mostrar');
        if (menuBanco && menuBanco.classList.contains('mostrar') && e.target !== btnFiltroBanco) menuBanco.classList.remove('mostrar');
    });

});