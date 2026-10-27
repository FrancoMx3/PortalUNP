 /* ══════════════════════════════════════════════════════════════════
   MAPA DE FUNCIONES QUE SE COMUNICAN CON LA BASE DE DATOS (MySQL)

   Busca estas etiquetas con Ctrl+F para encontrarlas rápido:
     [BD-ESCRIBE]  guarda datos nuevos en la base de datos
     [BD-LEE]      consulta datos que ya están en la base de datos
     [BD-SESIÓN]   solo maneja la sesión (cookies); no toca tablas
     [BD-NÚCLEO]   función que realiza todas las llamadas al servidor
     [SIN BD]      parece relacionada, pero NO envía nada al servidor

   FUNCIÓN / BLOQUE                       ETIQUETA       ENDPOINT
   ─────────────────────────────────────  ─────────────  ────────────────────────────
   api()                                  [BD-NÚCLEO]    (todas las llamadas)
   rf1 · submit  (Registro, paso 1)       [BD-ESCRIBE]   POST /api/registro/basico
   runPaymentProgress() · nextStage()     [BD-ESCRIBE]   POST /api/registro/pago   
   rf3 · submit  (Registro, paso 3)       [BD-ESCRIBE]   POST /api/registro/completar
   lf  · submit  (Inicio de sesión)       [BD-LEE]       POST /api/login
   setInterval() y carga inicial          [BD-LEE]       GET  /api/me
   adaptar()                              [BD-LEE]       GET  /api/me/foto (imagen)
   out · onclick (Cerrar sesión)          [BD-SESIÓN]    POST /api/logout

   Donde:
   api: Solicita al servidor y devuelve la respuesta en JSON. Si hay error, lanza un Error con .status y .message.

   adaptar: Convierte la respuesta del servidor (datos leídos de MySQL) al objeto "s" que usan enter() y 
    generatePDF(), y actualiza el tablero (rows) con el estado real de cada etapa.

   runPaymentProgress: Simula la animación de pago y al final llama a nextStage() para registrar el pago en la base de datos.

   rf1: Envía los datos básicos del postulante al servidor y guarda el borrador en la base de datos. Si ya pagó, salta al paso 3.

   rf3: Envía los datos finales del postulante al servidor y completa el registro en la base de datos. Genera el PDF con generatePDF().

   setInterval y carga inicial: Cada 30 segundos consulta al servidor el estado de las etapas y actualiza el tablero. 
    Al cargar la página, si hay sesión abierta entra directo al portal; si no, muestra el login.

   ══════════════════════════════════════════════════════════════════ */

var $ = function (i) {
    return document.getElementById(i);
};

/* ---------- Conexión con el servidor (reemplaza el almacenamiento en el navegador) ---------- */

var MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

var sesion = null; // datos del postulante con la sesión abierta

/* ══════════════════════════════════════════════════════════════════
   [BD-NÚCLEO] api(url, opts)
   Única función que hace fetch() al servidor. Todas las etiquetas
   [BD-ESCRIBE], [BD-LEE] y [BD-SESIÓN] de este archivo pasan por aquí.
   Si el servidor responde con error, lanza un Error con .status y .message.
   ══════════════════════════════════════════════════════════════════ */
function api(url, opts) {
    return fetch(url, Object.assign({ credentials: "same-origin" }, opts)).then(
        function (r) {
            return r
                .json()
                .catch(function () {
                    return {};
                })
                .then(function (data) {
                    if (!r.ok) {
                        var err = new Error(data.error || "No se pudo completar la operación.");
                        err.status = r.status;
                        throw err;
                    }
                    return data;
                });
        },
        function () {
            var err = new Error("No hay conexión con el servidor.");
            err.status = 0;
            throw err;
        }
    );
}

function fecha(s) {
    if (!s) return "—";
    var p = s.split("-");
    return +p[2] + " " + MESES[+p[1] - 1] + " " + p[0];
}

function telFmt(t) {
    return t ? t.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3") : "—";
}

function sinTildes(t) {
    return t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/* [BD-LEE] Convierte la respuesta del servidor (datos leídos de MySQL) al objeto "s" que usan enter() y generatePDF(),
   y actualiza el tablero (rows) con el estado real de cada etapa. */
function adaptar(d) {
    var p = d.postulante;

    d.etapas.forEach(function (e) {
        for (var i = 0; i < rows.length; i++) {
            if (rows[i][0] === e.codigo) {
                rows[i][3] = e.fecha ? fecha(e.fecha) : "—";
                rows[i][4] = e.estado;
            }
        }
    });

    var pg = d.pago;

    return {
        dni: p.dni,
        nombres: p.nombres,
        apellidos: p.apellidos,
        email: p.email,
        emailPersonal: p.emailPersonal,
        tel: telFmt(p.telefono),
        conv: p.convocatoria,
        area: p.area,
        turno: p.turno,
        foto: "/api/me/foto?u=" + p.id, // [BD-LEE] el navegador pide la foto guardada en uploads/
        dniVerified: rows[2][4] === "Validado",
        payRef: pg ? pg.referencia : "",
        payDate: pg ? fecha(pg.fecha) : "",
        payMonto: pg ? pg.monto : "",
        regDate: rows[2][3]
    };
}

var regData = {};

function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[c];
    });
}

function cap(t) {
    return t
        .trim()
        .split(/\s+/)
        .map(function (w) {
            return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        })
        .join(" ");
}

function toast(t) {
    var e = $("toast");
    e.textContent = t;
    e.classList.remove("hidden");

    clearTimeout(toast.h);

    toast.h = setTimeout(function () {
        e.classList.add("hidden");
    }, 3600);
}

function fld(w, m, msg) {
    w.classList.toggle("err", !!msg);
    m.textContent = msg || "";
}

function lt(n) {
    $("lf").classList.toggle("hidden", n != 1);
    $("regWizard").classList.toggle("hidden", n != 2);

    $("lt1").classList.toggle("on", n == 1);
    $("lt2").classList.toggle("on", n == 2);

    if (n == 2) {
        wizardStep(1);
    }
}

$("lt1").onclick = function () {
    lt(1);
};

$("lt2").onclick = function () {
    lt(2);
};

function wizardStep(step) {
    $("rf1").classList.toggle("hidden", step != 1);
    $("rf2").classList.toggle("hidden", step != 2);
    $("rf3").classList.toggle("hidden", step != 3);

    var steps = ["wz1", "wz2", "wz3"];

    steps.forEach(function (id, i) {
        var el = $(id);
        el.classList.remove("active", "done");

        if (i + 1 < step) {
            el.classList.add("done");
        } else if (i + 1 === step) {
            el.classList.add("active");
        }
    });
}

/* ══════════════════════════════════════════════════════════════════
   [BD-LEE] INICIO DE SESIÓN
   Endpoint : POST /api/login
   Envía    : email y password (JSON)
   Tabla    : postulantes (solo consulta: compara la contraseña cifrada)
   Servidor : server/routes/auth.js → router.post('/login')
   ══════════════════════════════════════════════════════════════════ */
$("lf").addEventListener("submit", function (e) {
    e.preventDefault();

    var em = $("em").value.trim().toLowerCase(),
        pw = $("pw").value,
        ok = true;

    if (!em) {
        fld($("emw"), $("eme"), "Ingresa tu correo institucional.");
        ok = false;
    } else if (
        !/^[^\s@]+@alumnos\.unp\.edu\.pe$/.test(em)
    ) {
        fld(
            $("emw"),
            $("eme"),
            "Usa un correo válido @alumnos.unp.edu.pe."
        );
        ok = false;
    } else {
        fld($("emw"), $("eme"), "");
    }

    if (!pw) {
        fld($("pww"), $("pwe"), "Ingresa tu contraseña.");
        ok = false;
    } else {
        fld($("pww"), $("pwe"), "");
    }

    if (!ok) return;

    var btn = $("lf").querySelector("button[type=submit]");
    btn.disabled = true;

    // [BD-LEE] ← llamada al servidor: consulta la cuenta en MySQL
    api("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em, password: pw })
    })
        .then(function (d) {
            enter(adaptar(d));
        })
        .catch(function (err) {
            if (err.status === 401) fld($("pww"), $("pwe"), err.message);
            else toast(err.message);
        })
        .then(function () {
            btn.disabled = false;
        });
});

$("forgot").onclick = function () {
    toast(
        "Te enviaremos un enlace de recuperación a tu correo institucional."
    );
};

function enter(s) {
    sesion = s;

    $("login").classList.add("hidden");
    $("app").classList.remove("hidden");

    window.scrollTo(0, 0);

    $("hi").textContent = "Hola, " + s.nombres.split(" ")[0];
    $("sn").textContent = s.nombres + " " + s.apellidos;

    var av = $("av");

    if (s.foto) {
        av.innerHTML = '<img alt="" src="' + esc(s.foto) + '">';
    } else {
        av.textContent = (
            s.nombres[0] + s.apellidos[0]
        ).toUpperCase();
    }

    var d = [
        ["DNI", s.dni],
        ["Teléfono", s.tel],
        ["Correo institucional", s.email],
        ["Correo personal", s.emailPersonal || "—"],
        ["Convocatoria", s.conv],
        ["Área académica", s.area],
        ["Turno", s.turno],
        ["Código postulante", "UNP-" + s.dni.slice(-4) + "-27"]
    ];

    $("sd").innerHTML = d
        .map(function (x) {
            return (
                '<div class="kv">' +
                '<b>' +
                x[0] +
                '</b>' +
                '<span>' +
                esc(x[1]) +
                '</span>' +
                '</div>'
            );
        })
        .join("");

    render();
}

/* ══════════════════════════════════════════════════════════════════
   [BD-SESIÓN] CERRAR SESIÓN
   Endpoint : POST /api/logout
   No modifica tablas: solo borra las cookies de sesión.
   Servidor : server/routes/auth.js → router.post('/logout')
   ══════════════════════════════════════════════════════════════════ */
$("out").onclick = function () {
    api("/api/logout", { method: "POST" }).catch(function () { });
    sesion = null;
    regData = {};

    $("app").classList.add("hidden");
    $("login").classList.remove("hidden");

    $("pw").value = "";

    lt(1);

    window.scrollTo(0, 0);
};

$("bell").onclick = function () {
    toast(
        rows[3][4] !== "Pendiente"
            ? "Tu ticket ya está disponible."
            : rows[1][4] === "Validado"
                ? "Tu pago fue validado. El ticket se emitirá al confirmarse."
                : "Aún no registramos el pago de tu inscripción."
    );
};

var rows = [
    [
        "P01",
        "Registro básico",
        "Nombres, apellidos y correo personal",
        "—",
        "Pendiente",
        ""
    ],
    [
        "P02",
        "Pago de inscripción",
        "Tasa procesada por pasarela segura",
        "—",
        "Pendiente",
        "Descargar comprobante"
    ],
    [
        "P03",
        "Registro completo y verificación",
        "DNI, foto y datos de identidad",
        "—",
        "Pendiente",
        ""
    ],
    [
        "P04",
        "Confirmación y ticket digital",
        "QR, aula, pabellón y puerta de ingreso",
        "—",
        "Pendiente",
        "Descargar ticket"
    ]
];

function chip(s) {
    return (
        '<span class="chip c-' +
        s +
        '">' +
        s +
        '</span>'
    );
}

function render() {
    $("tb").innerHTML = rows
        .map(function (r) {
            var dis = r[4] === "Pendiente" ? " disabled" : "";

            return (
                "<tr>" +
                '<td class="pid">' +
                r[0] +
                "</td>" +
                "<td><b>" +
                r[1] +
                "</b><small>" +
                r[2] +
                "</small></td>" +
                "<td>" +
                r[3] +
                "</td>" +
                "<td>" +
                chip(r[4]) +
                "</td>" +
                "<td>" +
                (r[5]
                    ? '<button class="act" data-m="' +
                    r[5] +
                    '"' +
                    dis +
                    ">" +
                    r[5] +
                    "</button>"
                    : "—") +
                "</td>" +
                "</tr>"
            );
        })
        .join("");

    var lab = ["Registro", "Pago", "Verificación", "Ticket"];

    $("steps").innerHTML = rows
        .map(function (r, i) {
            return (
                '<div class="st' +
                (r[4] !== "Pendiente" ? " d" : "") +
                '"><em>' +
                (i + 1) +
                "</em>" +
                lab[i] +
                "</div>"
            );
        })
        .join("");

    $("hs").innerHTML =
        '<tr><td><b>Pago</b></td><td>Tasa de inscripción<small>Pasarela segura</small></td><td>' + (rows[1][3]) + '</td><td>' +
        chip(rows[1][4]) +
        '</td><td><button class="act" data-m="Descargar comprobante"' + (rows[1][4] === "Pendiente" ? " disabled" : "") + '>Comprobante</button></td></tr>' +

        '<tr><td><b>Ticket</b></td><td>Carnet digital con QR<small>Se habilita tras confirmar el pago</small></td><td>—</td><td>' +
        chip("Pendiente") +
        '</td><td><button class="act" disabled>Descargar PDF</button></td></tr>';

    document.querySelectorAll("[data-m]").forEach(function (b) {
        b.onclick = function () {
            toast(
                b.dataset.m +
                ": disponible en la versión con base de datos."
            );
        };
    });

    var t = new Date();

    $("up").textContent =
        "Actualizado " +
        t.toLocaleTimeString("es-PE", {
            hour: "2-digit",
            minute: "2-digit"
        });
}

/* ══════════════════════════════════════════════════════════════════
   [BD-LEE] ACTUALIZACIÓN AUTOMÁTICA DEL TABLERO (cada 30 s)
   Endpoint : GET /api/me
   Tablas   : postulantes, postulante_etapas, etapas, pagos (solo lectura)
   Servidor : server/routes/perfil.js → router.get('/me')
   ══════════════════════════════════════════════════════════════════ */
setInterval(function () {
    if ($("app").classList.contains("hidden")) return;

    api("/api/me")
        .then(function (d) {
            var y = window.scrollY;
            enter(adaptar(d));
            window.scrollTo(0, y);
        })
        .catch(function (err) {
            if (err.status === 401) {
                $("out").onclick();
                toast("Tu sesión expiró. Inicia sesión nuevamente.");
            }
        });
}, 30000);

/* ══════════════════════════════════════════════════════════════════
   [BD-LEE] RECUPERAR SESIÓN AL CARGAR LA PÁGINA
   Endpoint : GET /api/me   (mismos datos que arriba)
   Si hay sesión abierta entra directo al portal; si no, muestra el login.
   ══════════════════════════════════════════════════════════════════ */
api("/api/me")
    .then(function (d) {
        enter(adaptar(d));
    })
    .catch(function () { });

var RL = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;

function gen() {
    var n = sinTildes($("rn").value.toLowerCase().trim()),
        a = sinTildes($("ra").value.toLowerCase().trim()),
        d = $("rd").value.trim();

    $("ge").textContent =
        n && a && d.length >= 4
            ? (
                n[0] +
                a.split(" ")[0] +
                d.slice(-4) +
                "@alumnos.unp.edu.pe"
            ).replace(/\s/g, "")
            : "---@alumnos.unp.edu.pe";
}

function chk(el, m, ok, msg) {
    el.classList.toggle("err", !ok);
    el.classList.toggle("ok", ok && el.value !== "");

    $(m).textContent = ok ? "" : msg;

    return ok;
}

function vD() {
    var v = $("rd").value = $("rd").value.replace(/\D/g, "");

    return chk(
        $("rd"),
        "rde",
        v.length === 8,
        "El DNI debe tener exactamente 8 dígitos."
    );
}

function vN(i, m, t) {
    var v = $(i).value.trim();

    return chk(
        $(i),
        m,
        RL.test(v) && v.length >= 2,
        t + " solo debe contener letras (mín. 2)."
    );
}

function vT() {
    var v = $("rt").value = $("rt").value.replace(/\D/g, "");

    return chk(
        $("rt"),
        "rte",
        v === "" || /^9\d{8}$/.test(v),
        "El teléfono debe tener 9 dígitos y empezar con 9."
    );
}

function vP() {
    return chk(
        $("rp"),
        "rpe",
        $("rp").value.length >= 8,
        "La contraseña debe tener al menos 8 caracteres."
    );
}

function vEmail() {
    var v = $("rem").value.trim();
    return chk(
        $("rem"),
        "reme",
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        "Ingresa un correo electrónico válido."
    );
}

$("rn").oninput = function () {
    if ($("rn").value) vN("rn", "rne", "El nombre");
};

$("ra").oninput = function () {
    if ($("ra").value) vN("ra", "rae", "El apellido");
};

$("rem").oninput = function () {
    if ($("rem").value) vEmail();
};

/* ══════════════════════════════════════════════════════════════════
   [BD-ESCRIBE] REGISTRO · PASO 1 · Datos básicos
   Endpoint : POST /api/registro/basico
   Envía    : nombres, apellidos, emailPersonal (JSON)
   Tablas   : postulantes (INSERT del borrador)
              postulante_etapas (P01 → Confirmado)
   Servidor : server/routes/registro.js → "PASO 1"
   ══════════════════════════════════════════════════════════════════ */
$("rf1").addEventListener("submit", function (e) {
    e.preventDefault();

    var a = vN("rn", "rne", "El nombre"),
        b = vN("ra", "rae", "El apellido"),
        c = vEmail();

    if (!(a && b && c)) return;

    var btn = $("rf1").querySelector("button[type=submit]");
    btn.disabled = true;

    // [BD-ESCRIBE] ← llamada al servidor: guarda el paso 1 en MySQL
    api("/api/registro/basico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            nombres: $("rn").value,
            apellidos: $("ra").value,
            emailPersonal: $("rem").value.trim().toLowerCase()
        })
    })
        .then(function (d) {
            regData.nombres = cap($("rn").value);
            regData.apellidos = cap($("ra").value);
            regData.emailPersonal = $("rem").value.trim().toLowerCase();

            if (d.pagado) {
                toast("Ya registramos tu pago. Completa tu verificación.");
                wizardStep(3);
            } else {
                wizardStep(2);
            }
        })
        .catch(function (err) {
            toast(err.message);

            if (err.status === 409 && /Inicia sesión/.test(err.message)) {
                lt(1);
            }
        })
        .then(function () {
            btn.disabled = false;
        });
});

$("pcard").oninput = function () {
    var v = $("pcard").value.replace(/\D/g, "");
    var formatted = v.replace(/(.{4})/g, "$1 ").trim();
    $("pcard").value = formatted;
};

$("pexp").oninput = function () {
    var v = $("pexp").value.replace(/\D/g, "");
    if (v.length >= 2) {
        $("pexp").value = v.slice(0, 2) + "/" + v.slice(2, 4);
    } else {
        $("pexp").value = v;
    }
};

$("pcvv").oninput = function () {
    $("pcvv").value = $("pcvv").value.replace(/\D/g, "");
};

/* ══════════════════════════════════════════════════════════════════
   [SIN BD] Botón "Procesar pago"
   Solo valida el formato de la tarjeta y arranca la animación de progreso.
   Los datos de tarjeta NUNCA se envían ni se guardan. El registro del pago
   en la base de datos ocurre al final de la animación (ver nextStage()).
   ══════════════════════════════════════════════════════════════════ */
$("payBtn").onclick = function () {
    var card = $("pcard").value.replace(/\s/g, ""),
        exp = $("pexp").value,
        cvv = $("pcvv").value,
        ok = true;

    if (card.length < 13) {
        $("pcarde").textContent = "Número de tarjeta inválido.";
        $("pcard").classList.add("err");
        ok = false;
    } else {
        $("pcarde").textContent = "";
        $("pcard").classList.remove("err");
    }

    if (!/^\d{2}\/\d{2}$/.test(exp)) {
        $("pexpe").textContent = "Formato MM/AA.";
        $("pexp").classList.add("err");
        ok = false;
    } else {
        $("pexpe").textContent = "";
        $("pexp").classList.remove("err");
    }

    if (cvv.length < 3) {
        $("pcvve").textContent = "CVV inválido.";
        $("pcvv").classList.add("err");
        ok = false;
    } else {
        $("pcvve").textContent = "";
        $("pcvv").classList.remove("err");
    }

    if (!ok) return;

    $("payBtn").disabled = true;
    $("payBtn").textContent = "Procesando...";

    setTimeout(function () {
        document.querySelector(".pay-container").classList.add("hidden");
        $("payProgress").classList.remove("hidden");
        runPaymentProgress();
    }, 600);
};

function reiniciarPago() {
    document.querySelector(".pay-container").classList.remove("hidden");
    $("payProgress").classList.add("hidden");

    $("payBtn").disabled = false;
    $("payBtn").textContent = "Procesar pago S/ 400.00";

    $("pbar").style.width = "0%";
    $("pstatus").textContent = "Iniciando...";
    $("pstatus").style.color = "";

    ["ps1", "ps2", "ps3", "ps4"].forEach(function (id) {
        $(id).querySelector("td:last-child").innerHTML = '<span class="chip c-Pendiente">Pendiente</span>';
    });
}

/* ══════════════════════════════════════════════════════════════════
   [BD-ESCRIBE] REGISTRO · PASO 2 · Pago de inscripción
   Se ejecuta al terminar la animación (dentro de nextStage()).
   Endpoint : POST /api/registro/pago   (sin cuerpo: no envía datos de tarjeta)
   Tablas   : pagos (INSERT: referencia, monto, estado)
              postulante_etapas (P02 → Validado)
   El monto y la referencia los define el SERVIDOR, no este archivo.
   Servidor : server/routes/registro.js → "PASO 2"
   ══════════════════════════════════════════════════════════════════ */
function runPaymentProgress() {
    var stages = [
        { id: "ps1", label: "Conexión con pasarela", pct: 25 },
        { id: "ps2", label: "Verificación de fondos", pct: 50 },
        { id: "ps3", label: "Autorización del banco", pct: 75 },
        { id: "ps4", label: "Generación de comprobante", pct: 100 }
    ];

    var current = 0;

    function nextStage() {
        if (current >= stages.length) {
            $("pstatus").textContent = "Registrando el pago...";

            // [BD-ESCRIBE] ← llamada al servidor: guarda el pago en MySQL
            // No se envían datos de tarjeta: el servidor fija el monto y genera la referencia
            api("/api/registro/pago", { method: "POST" })
                .then(function (p) {
                    $("pstatus").textContent = "Pago procesado exitosamente";
                    $("pstatus").style.color = "var(--ok)";

                    regData.payDate = fecha(p.fecha);
                    regData.payRef = p.referencia;

                    $("pcard").value = "";
                    $("pexp").value = "";
                    $("pcvv").value = "";

                    setTimeout(function () {
                        wizardStep(3);
                    }, 1200);
                })
                .catch(function (err) {
                    toast(err.message);
                    reiniciarPago();

                    if (err.status === 401) wizardStep(1);
                });

            return;
        }

        var stage = stages[current];

        $("pbar").style.width = stage.pct + "%";
        $("pstatus").textContent = stage.label + "...";

        var row = $(stage.id);
        row.querySelector("td:last-child").innerHTML = '<span class="chip c-Procesando">Procesando</span>';

        setTimeout(function () {
            row.querySelector("td:last-child").innerHTML = '<span class="chip c-Confirmado">Confirmado</span>';
            current++;
            setTimeout(nextStage, 400);
        }, 800 + Math.random() * 600);
    }

    nextStage();
}

$("rd").oninput = function () {
    if ($("rd").value) vD();
    gen();
};

$("rt").oninput = vT;

$("rp").oninput = function () {
    if ($("rp").value) vP();
};

/* ══════════════════════════════════════════════════════════════════
   [BD-ESCRIBE] REGISTRO · PASO 3 · Verificación y creación de la cuenta
   Endpoint : POST /api/registro/completar
   Envía    : FormData → dni, telefono, password, foto, dni_frente, dni_reverso
   Tablas   : postulantes (UPDATE: DNI, teléfono, correo institucional,
                           contraseña cifrada, nombres de los archivos)
              postulante_etapas (P03 → Confirmado)
   Archivos : las 3 imágenes se guardan en la carpeta uploads/
   Servidor : server/routes/registro.js → "PASO 3"
   ══════════════════════════════════════════════════════════════════ */
$("rf3").addEventListener("submit", function (e) {
    e.preventDefault();

    var a = vD(),
        t = vT(),
        d = vP(),
        f = $("rph").files.length > 0,
        df = $("rdni_front").files.length > 0,
        db = $("rdni_back").files.length > 0;

    $("rphe").textContent = f
        ? "Foto cargada."
        : "La foto es obligatoria.";

    $("rphe").style.color = f
        ? "var(--ok)"
        : "#e5484d";

    $("rdni_fronte").textContent = df
        ? "Foto frontal cargada."
        : "La foto frontal del DNI es obligatoria.";

    $("rdni_fronte").style.color = df
        ? "var(--ok)"
        : "#e5484d";

    $("rdni_backe").textContent = db
        ? "Foto reverso cargada."
        : "La foto del reverso del DNI es obligatoria.";

    $("rdni_backe").style.color = db
        ? "var(--ok)"
        : "#e5484d";

    if (!(a && t && d && f && df && db)) return;

    gen();

    var em = $("ge").textContent;

    var fd = new FormData();
    fd.append("dni", $("rd").value);
    fd.append("telefono", $("rt").value);
    fd.append("password", $("rp").value);
    fd.append("foto", $("rph").files[0]);
    fd.append("dni_frente", $("rdni_front").files[0]);
    fd.append("dni_reverso", $("rdni_back").files[0]);

    var btn = $("rf3").querySelector("button[type=submit]");
    btn.disabled = true;

    // [BD-ESCRIBE] ← llamada al servidor: completa el registro en MySQL
    api("/api/registro/completar", { method: "POST", body: fd })
        .then(function (d) {
            var s = adaptar(d);

            $("rf1").reset();
            $("rf3").reset();

            ["rd", "rn", "ra", "rt", "rp", "rem"].forEach(function (i) {
                $(i).classList.remove("ok", "err");
            });

            gen();
            regData = {};
            reiniciarPago();

            generatePDF(s);

            toast("Registro exitoso. Tu correo institucional: " + s.email);

            enter(s);
        })
        .catch(function (err) {
            toast(err.message);

            if (err.status === 409) {
                $("em").value = em;
                lt(1);
            } else if (err.status === 403) {
                wizardStep(2);
            } else if (err.status === 401) {
                wizardStep(1);
            }
        })
        .then(function () {
            btn.disabled = false;
        });
});

function generatePDF(s) {
    if (typeof window.jspdf === "undefined") {
        toast("Cargando generador de PDF...");
        return;
    }

    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF();

    doc.setFillColor(239, 90, 99);
    doc.rect(0, 0, 210, 45, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Universidad Nacional de Piura", 105, 18, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Ficha de Registro de Postulante - Admisión 2027-I", 105, 28, { align: "center" });

    doc.setFontSize(9);
    doc.text("Sistema Integrado de Gestión Académica", 105, 36, { align: "center" });

    doc.setTextColor(29, 36, 51);

    var y = 58;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Datos del Postulante", 20, y);
    y += 4;

    doc.setDrawColor(239, 90, 99);
    doc.setLineWidth(0.8);
    doc.line(20, y, 190, y);
    y += 10;

    doc.setFontSize(11);

    var fields = [
        ["DNI", s.dni],
        ["Nombres", s.nombres],
        ["Apellidos", s.apellidos],
        ["Correo institucional", s.email],
        ["Correo personal", s.emailPersonal || "—"],
        ["Teléfono", s.tel],
        ["Convocatoria", s.conv],
        ["Código postulante", "UNP-" + s.dni.slice(-4) + "-27"]
    ];

    fields.forEach(function (f) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(107, 115, 133);
        doc.text(f[0] + ":", 20, y);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(29, 36, 51);
        doc.text(String(f[1]), 80, y);
        y += 8;
    });

    y += 6;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(29, 36, 51);
    doc.text("Información de Pago", 20, y);
    y += 4;

    doc.setDrawColor(239, 90, 99);
    doc.line(20, y, 190, y);
    y += 10;

    doc.setFontSize(11);

    var payFields = [
        ["Referencia", s.payRef || "—"],
        ["Fecha de pago", s.payDate || "—"],
        ["Monto", "S/ " + (s.payMonto || "400.00")],
        ["Estado", "Validado"]
    ];

    payFields.forEach(function (f) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(107, 115, 133);
        doc.text(f[0] + ":", 20, y);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(29, 36, 51);
        doc.text(String(f[1]), 80, y);
        y += 8;
    });

    y += 6;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(29, 36, 51);
    doc.text("Estado del Proceso", 20, y);
    y += 4;

    doc.setDrawColor(239, 90, 99);
    doc.line(20, y, 190, y);
    y += 10;

    doc.setFontSize(10);

    doc.setFillColor(238, 243, 251);
    doc.rect(20, y - 5, 170, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(107, 115, 133);
    doc.text("ETAPA", 22, y);
    doc.text("FECHA", 90, y);
    doc.text("ESTADO", 140, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(29, 36, 51);

    rows.forEach(function (r) {
        doc.text(r[1], 22, y);
        doc.text(r[3], 90, y);
        doc.text(r[4], 140, y);
        y += 7;
    });

    y += 10;

    doc.setFillColor(228, 238, 252);
    doc.roundedRect(20, y - 4, 170, 14, 3, 3, "F");
    doc.setFontSize(9);
    doc.setTextColor(28, 95, 184);
    doc.text("La verificación de documentos de identidad será realizada por el administrador del sistema.", 25, y + 4);

    y += 20;

    doc.setDrawColor(231, 233, 239);
    doc.setLineWidth(0.3);
    doc.line(20, y, 190, y);
    y += 8;

    doc.setFontSize(8);
    doc.setTextColor(107, 115, 133);
    doc.text("Documento generado el " + new Date().toLocaleString("es-PE") + " · Universidad Nacional de Piura", 105, y, { align: "center" });
    doc.text("Este documento es una constancia de registro. No constituye un ticket de examen.", 105, y + 5, { align: "center" });

    doc.save("ficha_registro_UNP_" + s.dni + ".pdf");
}

// [SIN BD] Genera el PDF en el navegador (jsPDF) con los datos ya cargados en "sesion".
$("pdfBtn").onclick = function () {
    if (sesion) {
        generatePDF(sesion);
    } else {
        toast("No se encontraron datos para generar el PDF.");
    }
};
