
var $ = function (i) {
    return document.getElementById(i);
};


var MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

var sesion = null;

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

function adaptar(d) {
    var p = d.postulante;

    d.etapas.forEach(function (e) {
        for (var i = 0; i < rows.length; i++) {
            if (rows[i][0] === e.codigo) {
                rows[i][1] = e.nombre;
                rows[i][2] = e.descripcion;
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
        foto: "/api/me/foto?u=" + p.id,
        payRef: pg ? pg.referencia : "",
        payDate: pg ? fecha(pg.fecha) : "",
        payMonto: pg ? pg.monto : "",
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
        "La recuperación de contraseña aún no está habilitada."
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
            ? "La confirmación de la etapa del ticket está registrada."
            : rows[1][4] === "Validado"
                ? "Tu pago simulado está registrado. La emisión del ticket sigue pendiente."
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
        "Registro de pago simulado",
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
        ""
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
                    ? '<button class="act" data-action="receipt"' + dis + '>Descargar comprobante</button>'
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
        '<tr><td><b>Pago</b></td><td>Inscripción<small>Pago simulado · S/ ' +
        (sesion && sesion.payMonto ? Number(sesion.payMonto).toFixed(2) : "400.00") +
        '</small></td><td>' + esc(rows[1][3]) + '</td><td>' +
        chip(rows[1][4]) +
        '</td><td><button class="act" data-action="receipt"' +
        (rows[1][4] === "Pendiente" ? " disabled" : "") +
        '>Descargar comprobante</button></td></tr>' +
        '<tr><td><b>Ticket</b></td><td>Ticket digital<small>Emisión pendiente</small></td><td>—</td><td>' +
        chip(rows[3][4]) +
        '</td><td><button class="act" disabled>No disponible</button></td></tr>';
    var ultimaEtapa = rows.slice().reverse().find(function (r) {
        return r[4] !== "Pendiente";
    });
    var estadoActual = ultimaEtapa ? ultimaEtapa[4] : "Pendiente";
    $("cur").textContent = estadoActual;
    $("cur").className = "chip c-" + estadoActual;
    $("currentStage").textContent = ultimaEtapa
        ? ultimaEtapa[0] + " · " + ultimaEtapa[1]
        : "Sin etapas completadas";

    document.querySelectorAll("[data-action='receipt']").forEach(function (button) {
        button.onclick = function () {
            generatePaymentReceipt(sesion);
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

api("/api/me")
    .then(function (d) {
        enter(adaptar(d));
    })
    .catch(function () { });

var RL = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;

function gen() {
    var n = sinTildes((regData.nombres || $("rn").value).toLowerCase().trim()),
        a = sinTildes((regData.apellidos || $("ra").value).toLowerCase().trim()),
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
        RL.test(v) && v.length >= 2 && v.length <= 80,
        t + " debe contener entre 2 y 80 letras."
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
    var password = $("rp").value;
    var bytes = new TextEncoder().encode(password).length;

    return chk(
        $("rp"),
        "rpe",
        password.length >= 8 && bytes <= 72,
        "La contraseña debe tener al menos 8 caracteres y no superar 72 bytes."
    );
}

function vEmail() {
    var v = $("rem").value.trim();
    return chk(
        $("rem"),
        "reme",
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 120,
        "Ingresa un correo válido de hasta 120 caracteres."
    );
}

function vImagen(i, m, etiqueta) {
    var input = $(i);
    var archivo = input.files[0];
    var tipos = ["image/jpeg", "image/png", "image/webp"];
    var error = !archivo
        ? etiqueta + " es obligatoria."
        : archivo.size > 5 * 1024 * 1024
            ? etiqueta + " no debe superar 5 MB."
            : archivo.type && tipos.indexOf(archivo.type) === -1
                ? etiqueta + " debe ser JPG, PNG o WEBP."
                : "";

    input.classList.toggle("err", !!error);
    input.classList.toggle("ok", !!archivo && !error);
    $(m).textContent = error || etiqueta + " cargada.";
    $(m).style.color = error ? "#e5484d" : "var(--ok)";
    return !error;
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

$("rf1").addEventListener("submit", function (e) {
    e.preventDefault();

    var a = vN("rn", "rne", "El nombre"),
        b = vN("ra", "rae", "El apellido"),
        c = vEmail();

    if (!(a && b && c)) return;

    var btn = $("rf1").querySelector("button[type=submit]");
    btn.disabled = true;

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

$("payBtn").onclick = function () {
    $("payBtn").disabled = true;
    $("payBtn").textContent = "Registrando...";
    setTimeout(function () {
        document.querySelector(".pay-container").classList.add("hidden");
        $("payProgress").classList.remove("hidden");
        runPaymentProgress();
    }, 300);
};
function reiniciarPago() {
    document.querySelector(".pay-container").classList.remove("hidden");
    $("payProgress").classList.add("hidden");

    $("payBtn").disabled = false;
    $("payBtn").textContent = "Simular pago S/ 400.00";

    $("pbar").style.width = "0%";
    $("pstatus").textContent = "Iniciando...";
    $("pstatus").style.color = "";

    ["ps1", "ps2", "ps3", "ps4"].forEach(function (id) {
        $(id).querySelector("td:last-child").innerHTML = '<span class="chip c-Pendiente">Pendiente</span>';
    });
}

function runPaymentProgress() {
    var stages = [
        { id: "ps1", label: "Inicio de simulación", pct: 25 },
        { id: "ps2", label: "Registro del pago", pct: 50 },
        { id: "ps3", label: "Confirmación del estado", pct: 75 },
        { id: "ps4", label: "Preparación del comprobante", pct: 100 }
    ];

    var current = 0;

    function nextStage() {
        if (current >= stages.length) {
            $("pstatus").textContent = "Registrando el pago...";

            api("/api/registro/pago", { method: "POST" })
                .then(function () {
                    $("pstatus").textContent = "Pago simulado registrado correctamente";
                    $("pstatus").style.color = "var(--ok)";


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

["rph", "rdni_front", "rdni_back"].forEach(function (id) {
    $(id).onchange = function () {
        var messages = { rph: "La foto", rdni_front: "La foto frontal del DNI", rdni_back: "La foto del reverso del DNI" };
        var messageIds = { rph: "rphe", rdni_front: "rdni_fronte", rdni_back: "rdni_backe" };
        vImagen(id, messageIds[id], messages[id]);
    };
});

$("rf3").addEventListener("submit", function (e) {
    e.preventDefault();

    var a = vD(),
        t = vT(),
        d = vP(),
        f = vImagen("rph", "rphe", "La foto"),
        df = vImagen("rdni_front", "rdni_fronte", "La foto frontal del DNI"),
        db = vImagen("rdni_back", "rdni_backe", "La foto del reverso del DNI");

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

function writePdfField(doc, label, value, xLabel, xValue, y, width, lineHeight) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(107, 115, 133);
    doc.text(label + ":", xLabel, y);

    var lines = doc.splitTextToSize(String(value), width);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(29, 36, 51);
    doc.text(lines, xValue, y);

    return y + Math.max(lines.length, 1) * lineHeight;
}

function generatePDF(s) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        toast("No se pudo cargar el generador de PDF. Comprueba tu conexión e inténtalo de nuevo.");
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

    doc.setFontSize(11);
    fields.forEach(function (f) {
        y = writePdfField(doc, f[0], f[1], 20, 80, y, 108, 8);
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
        ["Estado", "Validado (pago simulado)"]
    ];

    payFields.forEach(function (f) {
        y = writePdfField(doc, f[0], f[1], 20, 80, y, 108, 8);
    });

    y += 6;
    if (y > 194) {
        doc.addPage();
        y = 24;
    }

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

function generatePaymentReceipt(s) {
    if (!s || !s.payRef) {
        toast("No se encontró un pago para descargar.");
        return;
    }
    if (!window.jspdf || !window.jspdf.jsPDF) {
        toast("No se pudo cargar el generador de PDF. Comprueba tu conexión e inténtalo de nuevo.");
        return;
    }

    var doc = new window.jspdf.jsPDF();
    doc.setFillColor(30, 55, 90);
    doc.rect(0, 0, 210, 42, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Universidad Nacional de Piura", 105, 17, { align: "center" });
    doc.setFontSize(13);
    doc.setFont("helvetica", "normal");
    doc.text("Comprobante de pago de inscripción", 105, 29, { align: "center" });

    doc.setTextColor(29, 36, 51);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Datos del postulante", 20, 61);
    doc.setDrawColor(239, 90, 99);
    doc.line(20, 66, 190, 66);

    var fields = [
        ["Nombres", s.nombres + " " + s.apellidos],
        ["DNI", s.dni],
        ["Correo institucional", s.email],
        ["Referencia", s.payRef],
        ["Fecha", s.payDate || "—"],
        ["Monto", "S/ " + Number(s.payMonto || 400).toFixed(2)],
        ["Estado", "Validado (pago simulado)"]
    ];

    var y = 80;
    fields.forEach(function (field) {
        y = writePdfField(doc, field[0], field[1], 22, 75, y, 113, 11);
    });

    doc.setFontSize(9);
    doc.setTextColor(107, 115, 133);
    doc.text("Este documento acredita un registro de demostración y no un cobro real.", 105, y + 10, { align: "center" });
    doc.save("comprobante_pago_UNP_" + s.dni + ".pdf");
}

$("pdfBtn").onclick = function () {
    if (sesion) {
        generatePDF(sesion);
    } else {
        toast("No se encontraron datos para generar el PDF.");
    }
};
