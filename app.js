var $ = function (i) {
    return document.getElementById(i);
};

var KEY = "unp_cuentas_v1",
    accounts = {};

try {
    accounts = JSON.parse(localStorage.getItem(KEY) || "{}");
} catch (e) {
    accounts = {};
}

function save() {
    try {
        localStorage.setItem(KEY, JSON.stringify(accounts));
    } catch (e) {}
}

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
    $("rf").classList.toggle("hidden", n != 2);

    $("lt1").classList.toggle("on", n == 1);
    $("lt2").classList.toggle("on", n == 2);
}

$("lt1").onclick = function () {
    lt(1);
};

$("lt2").onclick = function () {
    lt(2);
};

/* Login */

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

    var a = accounts[em];

    if (!a) {
        fld(
            $("emw"),
            $("eme"),
            "No encontramos esa cuenta. Regístrate en la pestaña “Registro”."
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
        ["Convocatoria", s.conv],
        ["Área académica", s.area],
        ["Turno", s.turno],
        ["Aula / pabellón", "Por asignar"],
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

/* Estado (según Excel: P01–P04, tablero P05) */

var rows = [
    [
        "P01",
        "Registro y autenticación",
        "Cuenta creada con DNI, correo y contraseña",
        "12 sep 2026",
        "Confirmado",
        ""
    ],
    [
        "P02",
        "Selección de examen y turno",
        "Convocatoria, área académica y turno con cupo",
        "14 sep 2026",
        "Confirmado",
        ""
    ],
    [
        "P03",
        "Pago electrónico de inscripción",
        "Tasa de inscripción por pasarela segura",
        "15 sep 2026",
        "Validado",
        "Descargar comprobante"
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

    var lab = ["Registro", "Turno", "Pago", "Ticket"];

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
    '<tr><td><b>Pago</b></td><td>Tasa de inscripción<small>Pasarela segura · sin datos de tarjeta</small></td><td>15 sep 2026</td><td>' +
    chip("Validado") +
    '</td><td><button class="act" data-m="Descargar comprobante">Comprobante</button></td></tr>' +

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

/* Registro */

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

$("rd").oninput = function () {
    if ($("rd").value) vD();
    gen();
};

$("rn").oninput = function () {
    if ($("rn").value) vN("rn", "rne", "El nombre");
    gen();
};

$("ra").oninput = function () {
    if ($("ra").value) vN("ra", "rae", "El apellido");
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

$("rf").addEventListener("submit", function (e) {
    e.preventDefault();

    var a = vD(),
        b = vN("rn", "rne", "El nombre"),
        c = vN("ra", "rae", "El apellido"),
        t = vT(),
        d = vP(),
        f = $("rph").files.length > 0,
        g = $("rcred").files.length > 0;

    $("rphe").textContent = f
        ? "Foto cargada."
        : "La foto es obligatoria.";

    $("rcrede").textContent = g
        ? "Documento cargado."
        : "La validación de credenciales es obligatoria.";

    $("rcrede").style.color = g
        ? "var(--ok)"
        : "#e5484d";

    $("rphe").style.color = f
        ? "var(--ok)"
        : "#e5484d";

    if (!(a && b && c && t && d && f && g)) return;

    var em = $("ge").textContent;

    if (accounts[em]) {
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

        var s = {
            dni: $("rd").value,
            nombres: cap($("rn").value),
            apellidos: cap($("ra").value),
            email: em,
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
            credencial: $("rcred").files[0].name
        };

        accounts[em] = {
            pw: $("rp").value,
            s: s
        };

        save();

        $("rf").reset();

        ["rd", "rn", "ra", "rt", "rp"].forEach(function (i) {
            $(i).classList.remove("ok", "err");
        });

        gen();

        toast(
            "Registro exitoso. Tu correo institucional: " +
                em
        );

        enter(s);
    });
});