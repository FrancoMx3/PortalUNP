var $ = function (i) {
    return document.getElementById(i);
};

var DB_KEYS = {
    ACCOUNTS: "unp_cuentas_v2",
    PAYMENTS: "unp_pagos_v1",
    SESSIONS: "unp_sesiones_v1"
};

var DAO = {
    _read: function (key) {
        try {
            return JSON.parse(localStorage.getItem(key) || "{}");
        } catch (e) {
            return {};
        }
    },

    _write: function (key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) { }
    },

    accounts: {
        findAll: function () {
            return DAO._read(DB_KEYS.ACCOUNTS);
        },
        findByEmail: function (email) {
            var all = DAO.accounts.findAll();
            return all[email] || null;
        },
        insert: function (email, record) {
            var all = DAO.accounts.findAll();
            all[email] = record;
            DAO._write(DB_KEYS.ACCOUNTS, all);
        },
        update: function (email, fields) {
            var all = DAO.accounts.findAll();
            if (all[email]) {
                for (var k in fields) {
                    if (fields.hasOwnProperty(k)) {
                        all[email][k] = fields[k];
                    }
                }
                DAO._write(DB_KEYS.ACCOUNTS, all);
            }
        },
        exists: function (email) {
            return !!DAO.accounts.findByEmail(email);
        }
    },

    payments: {
        findAll: function () {
            return DAO._read(DB_KEYS.PAYMENTS);
        },
        findByEmail: function (email) {
            var all = DAO.payments.findAll();
            return all[email] || null;
        },
        insert: function (email, record) {
            var all = DAO.payments.findAll();
            all[email] = record;
            DAO._write(DB_KEYS.PAYMENTS, all);
        }
    }
};

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

    var a = DAO.accounts.findByEmail(em);

    if (!a) {
        fld(
            $("emw"),
            $("eme"),
            "No encontramos esa cuenta. Regístrate en la pestaña \"Registro\"."
        );
        return;
    }

    if (a.pw !== pw) {
        fld($("pww"), $("pwe"), "Contraseña incorrecta.");
        return;
    }

    enter(a.s);
});

$("forgot").onclick = function () {
    toast(
        "Te enviaremos un enlace de recuperación a tu correo institucional."
    );
};

function enter(s) {
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
    $("app").classList.add("hidden");
    $("login").classList.remove("hidden");

    $("pw").value = "";

    lt(1);

    window.scrollTo(0, 0);
};

$("bell").onclick = function () {
    toast(
        "Tu pago fue validado. El ticket se emitirá al confirmarse."
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

setInterval(function () {
    if (!$("app").classList.contains("hidden")) {
        render();
    }
}, 30000);

var RL = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;

function gen() {
    var n = $("rn").value.toLowerCase().trim(),
        a = $("ra").value.toLowerCase().trim(),
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

$("rf1").addEventListener("submit", function (e) {
    e.preventDefault();

    var a = vN("rn", "rne", "El nombre"),
        b = vN("ra", "rae", "El apellido"),
        c = vEmail();

    if (!(a && b && c)) return;

    regData.nombres = cap($("rn").value);
    regData.apellidos = cap($("ra").value);
    regData.emailPersonal = $("rem").value.trim().toLowerCase();

    var now = new Date();
    rows[0][3] = now.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
    rows[0][4] = "Confirmado";

    wizardStep(2);
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
            $("pstatus").textContent = "Pago procesado exitosamente";
            $("pstatus").style.color = "var(--ok)";

            var now = new Date();

            regData.payDate = now.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
            regData.payRef = "TXN-" + now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + String(now.getDate()).padStart(2, "0") + "-" + Math.floor(Math.random() * 9000 + 1000);

            DAO.payments.insert(regData.emailPersonal, {
                date: regData.payDate,
                ref: regData.payRef,
                amount: 400,
                status: "Validado"
            });

            rows[1][3] = regData.payDate;
            rows[1][4] = "Validado";

            setTimeout(function () {
                wizardStep(3);
            }, 1200);

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

function foto(file, cb) {
    var r = new FileReader();

    r.onerror = function () {
        cb("");
    };

    r.onload = function () {
        var im = new Image();

        im.onerror = function () {
            cb("");
        };

        im.onload = function () {
            var c = document.createElement("canvas"),
                m = Math.min(im.width, im.height);

            c.width = c.height = 160;

            c.getContext("2d").drawImage(
                im,
                (im.width - m) / 2,
                (im.height - m) / 2,
                m,
                m,
                0,
                0,
                160,
                160
            );

            cb(c.toDataURL("image/jpeg", 0.8));
        };

        im.src = r.result;
    };

    r.readAsDataURL(file);
}

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

    if (DAO.accounts.exists(em)) {
        toast(
            "Ya existe una cuenta con " +
            em +
            ". Inicia sesión."
        );

        $("em").value = em;
        lt(1);

        return;
    }

    foto($("rph").files[0], function (img) {
        var tv = $("rt").value;

        var now = new Date();

        var s = {
            dni: $("rd").value,
            nombres: regData.nombres,
            apellidos: regData.apellidos,
            email: em,
            emailPersonal: regData.emailPersonal,
            tel: tv
                ? tv.replace(
                    /(\d{3})(\d{3})(\d{3})/,
                    "$1 $2 $3"
                )
                : "—",
            conv: "Admisión 2027-I",
            area: "Por elegir",
            turno: "Por elegir",
            foto: img,
            dniVerified: false,
            payRef: regData.payRef,
            payDate: regData.payDate,
            regDate: now.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })
        };

        rows[2][3] = s.regDate;
        rows[2][4] = "Confirmado";

        DAO.accounts.insert(em, {
            pw: $("rp").value,
            s: s
        });

        $("rf1").reset();
        $("rf3").reset();

        ["rd", "rn", "ra", "rt", "rp", "rem"].forEach(function (i) {
            $(i).classList.remove("ok", "err");
        });

        gen();

        generatePDF(s);

        toast(
            "Registro exitoso. Tu correo institucional: " +
            em
        );

        enter(s);
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
        ["Monto", "S/ 400.00"],
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

$("pdfBtn").onclick = function () {
    var sn = $("sn").textContent;
    if (sn && sn !== "—") {
        var allAccounts = DAO.accounts.findAll();
        for (var email in allAccounts) {
            if (allAccounts.hasOwnProperty(email)) {
                var acc = allAccounts[email];
                if (acc.s && (acc.s.nombres + " " + acc.s.apellidos) === sn) {
                    generatePDF(acc.s);
                    return;
                }
            }
        }
    }
    toast("No se encontraron datos para generar el PDF.");
};