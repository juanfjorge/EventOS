import { useState, useEffect } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Title, Tooltip, Legend
} from "chart.js";
import emailjs from "@emailjs/browser";
import "./App.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const API = "https://eventos-production-24eb.up.railway.app";

// Mantener Railway despierto
setInterval(() => { fetch(`${API}/`).catch(() => {}); }, 300000);

// ── Fuentes ─────────────────────────────────────
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500&display=swap";
document.head.appendChild(fontLink);

// ── Helpers ──────────────────────────────────────
function Msg({ text }) {
  if (!text) return null;
  const isError = text.startsWith("❌");
  return (
    <div className={`msg ${isError ? "msg-error" : "msg-success"}`}>
      {text}
    </div>
  );
}

function Navbar({ usuario, onLogout, setPantalla }) {
  return (
    <nav className="navbar">
      <span
        className="navbar-logo"
        style={{ cursor: "pointer" }}
        onClick={() => setPantalla(usuario ? "eventos" : "inicio")}
      >
        Event<span>OS</span>
      </span>
      {usuario && (
        <div className="navbar-right">
          <div className="nav-user-badge">
            <div className={`nav-role-dot ${usuario.rol === "admin" ? "admin" : ""}`} />
            <strong>{usuario.nombre}</strong>
            <span className={`badge ${usuario.rol === "admin" ? "badge-warning" : "badge-teal"}`}>
              {usuario.rol}
            </span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onLogout}>
            Salir
          </button>
        </div>
      )}
    </nav>
  );
}

// ── APP ───────────────────────────────────────────
function App() {
  const usuarioGuardado = localStorage.getItem("usuario");
  const [usuario, setUsuario] = useState(usuarioGuardado ? JSON.parse(usuarioGuardado) : null);
  const params = new URLSearchParams(window.location.search);
  const status = params.get("status");
  const [pantalla, setPantalla] = useState(
    status === "approved" ? "cargando" : usuarioGuardado ? "eventos" : "inicio"
  );
  const [eventoSeleccionado, setEventoSeleccionado] = useState(null);
  const [qrFinal, setQrFinal] = useState(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const st = p.get("status");
    const usuario_id = p.get("usuario_id");
    const tipo_entrada_id = p.get("tipo_entrada_id");
    const evento_id = p.get("evento_id");

    if (st === "approved" && usuario_id && tipo_entrada_id) {
      setPantalla("compra_exitosa");
      fetch(`${API}/compras`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario_id: parseInt(usuario_id),
          tipo_entrada_id: parseInt(tipo_entrada_id),
        }),
      })
        .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
        .then((data) => {
          if (data.qr_codigo) {
            setQrFinal(data.qr_codigo);
            fetch(`${API}/eventos/${evento_id}`)
              .then((r) => r.json())
              .then((eventoData) => {
                const u = JSON.parse(localStorage.getItem("usuario"));
                emailjs.send(
                  "service_8ih75xn", "template_fygfwpl",
                  {
                    email: u.email, nombre: u.nombre,
                    evento: eventoData.nombre, fecha: eventoData.fecha,
                    lugar: eventoData.lugar, tipo_entrada: tipo_entrada_id,
                    qr_codigo: data.qr_codigo,
                  },
                  "T0Yu1bbO72jo4W-ve"
                ).catch(() => {});
              });
          }
        })
        .catch(() => setPantalla("eventos"));
    }
  }, []);

  const irA = (destino) => {
    if (["admin", "estadisticas", "validar"].includes(destino) && usuario?.rol !== "admin") return;
    setPantalla(destino);
  };

  const logout = () => {
    localStorage.removeItem("usuario");
    setUsuario(null);
    setPantalla("inicio");
    window.history.replaceState({}, "", "/");
  };

  const showNav = !["inicio", "login", "registro"].includes(pantalla);

  return (
    <div className="app-shell">
      {showNav && <Navbar usuario={usuario} onLogout={logout} setPantalla={irA} />}

      {pantalla === "inicio"        && <Inicio setPantalla={irA} />}
      {pantalla === "registro"      && <Registro setPantalla={irA} />}
      {pantalla === "login"         && <Login setPantalla={irA} setUsuario={setUsuario} />}
      {pantalla === "eventos"       && (
        <Eventos usuario={usuario} setPantalla={irA} setEventoSeleccionado={setEventoSeleccionado} />
      )}
      {pantalla === "comprar"       && (
        <Comprar usuario={usuario} evento={eventoSeleccionado} setPantalla={irA} />
      )}
      {pantalla === "admin"         && (
        <Admin usuario={usuario} setPantalla={irA} setEventoSeleccionado={setEventoSeleccionado} />
      )}
      {pantalla === "estadisticas"  && (
        <Estadisticas evento={eventoSeleccionado} setPantalla={irA} />
      )}
      {pantalla === "validar"       && <ValidarQR setPantalla={irA} />}
      {pantalla === "compra_exitosa" && (
        <CompraExitosa qr={qrFinal} setPantalla={irA} />
      )}
      {pantalla === "cargando"      && (
        <div className="loading-screen">
          <div className="spinner" />
          <p style={{ color: "var(--muted)" }}>Procesando tu compra...</p>
        </div>
      )}
    </div>
  );
}

// ── INICIO ────────────────────────────────────────
function Inicio({ setPantalla }) {
  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-grid" />

      {/* Hero text */}
      <div style={{ textAlign: "center", marginBottom: "2.5rem" }} className="fade-up">
        <div className="auth-logo">Event<span>OS</span></div>
        <h1 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: "clamp(2rem, 6vw, 3.2rem)",
          fontWeight: 900, lineHeight: 1.1, marginBottom: ".8rem"
        }}>
          Tu evento,<br /><em style={{ color: "var(--teal)", fontStyle: "normal" }}>perfectamente</em> organizado.
        </h1>
        <p style={{ color: "var(--muted)", maxWidth: 420, margin: "0 auto", lineHeight: 1.7, fontSize: ".95rem" }}>
          Vendé entradas, generá QRs automáticos y gestioná accesos en tiempo real.
        </p>
      </div>

      <div className="auth-card fade-up" style={{ animationDelay: ".1s" }}>
        <button className="btn btn-primary btn-full" style={{ marginBottom: ".8rem" }}
          onClick={() => setPantalla("login")}>
          Iniciar sesión →
        </button>
        <button className="btn btn-secondary btn-full" onClick={() => setPantalla("registro")}>
          Crear cuenta gratis
        </button>
      </div>

      {/* Features strip */}
      <div style={{
        display: "flex", gap: "1.5rem", flexWrap: "wrap", justifyContent: "center",
        marginTop: "2.5rem", maxWidth: 500
      }} className="fade-up">
        {["🎟️ Entradas online", "💳 MercadoPago", "📲 QR por email", "🔍 Validación en puerta"].map(f => (
          <span key={f} style={{
            fontSize: ".8rem", color: "var(--muted)",
            background: "var(--dark2)", border: "1px solid var(--border)",
            borderRadius: 50, padding: "5px 14px"
          }}>{f}</span>
        ))}
      </div>
    </div>
  );
}

// ── REGISTRO ──────────────────────────────────────
function Registro({ setPantalla }) {
  const [form, setForm] = useState({ nombre: "", email: "", password: "", rol: "cliente" });
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.nombre || !form.email || !form.password) {
      setMensaje("❌ Completá todos los campos");
      return;
    }
    setLoading(true);
    const res = await fetch(`${API}/registro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setMensaje("✅ Cuenta creada. Redirigiendo...");
      setTimeout(() => setPantalla("login"), 1400);
    } else {
      setMensaje("❌ " + data.error);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg" /><div className="auth-grid" />
      <div className="auth-card fade-up">
        <span className="auth-logo">Event<span>OS</span></span>
        <h2 className="auth-title">Crear cuenta</h2>
        <p className="auth-sub">Empezá gratis. Sin tarjeta de crédito.</p>

        <div className="field">
          <label>Nombre completo</label>
          <input placeholder="Tu nombre" onChange={e => setForm({ ...form, nombre: e.target.value })} />
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" placeholder="tu@email.com" onChange={e => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="field">
          <label>Contraseña</label>
          <input type="password" placeholder="Mínimo 6 caracteres" onChange={e => setForm({ ...form, password: e.target.value })} />
        </div>
        <div className="field">
          <label>Tipo de cuenta</label>
          <select onChange={e => setForm({ ...form, rol: e.target.value })}>
            <option value="cliente">Cliente — Comprar entradas</option>
            <option value="admin">Organizador — Crear y gestionar eventos</option>
          </select>
        </div>

        <button className="btn btn-primary btn-full" onClick={handleSubmit} disabled={loading}>
          {loading ? "Creando cuenta..." : "Registrarse →"}
        </button>
        <Msg text={mensaje} />

        <div className="auth-footer">
          ¿Ya tenés cuenta?{" "}
          <span className="text-link" onClick={() => setPantalla("login")} style={{ cursor: "pointer" }}>
            Iniciá sesión
          </span>
          <br /><br />
          <span className="text-link" onClick={() => setPantalla("inicio")} style={{ cursor: "pointer" }}>
            ← Volver al inicio
          </span>
        </div>
      </div>
    </div>
  );
}

// ── LOGIN ─────────────────────────────────────────
function Login({ setPantalla, setUsuario }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setUsuario(data.usuario);
      localStorage.setItem("usuario", JSON.stringify(data.usuario));
      setPantalla("eventos");
    } else {
      setMensaje("❌ " + data.error);
    }
  };

  const handleKey = (e) => { if (e.key === "Enter") handleSubmit(); };

  return (
    <div className="auth-page">
      <div className="auth-bg" /><div className="auth-grid" />
      <div className="auth-card fade-up">
        <span className="auth-logo">Event<span>OS</span></span>
        <h2 className="auth-title">Bienvenido/a</h2>
        <p className="auth-sub">Ingresá con tu cuenta para continuar.</p>

        <div className="field">
          <label>Email</label>
          <input type="email" placeholder="tu@email.com"
            onChange={e => setForm({ ...form, email: e.target.value })} onKeyDown={handleKey} />
        </div>
        <div className="field">
          <label>Contraseña</label>
          <input type="password" placeholder="Tu contraseña"
            onChange={e => setForm({ ...form, password: e.target.value })} onKeyDown={handleKey} />
        </div>

        <button className="btn btn-primary btn-full" onClick={handleSubmit} disabled={loading}>
          {loading ? "Ingresando..." : "Iniciar sesión →"}
        </button>
        <Msg text={mensaje} />

        <div className="auth-footer">
          ¿No tenés cuenta?{" "}
          <span className="text-link" onClick={() => setPantalla("registro")} style={{ cursor: "pointer" }}>
            Registrate gratis
          </span>
          <br /><br />
          <span className="text-link" onClick={() => setPantalla("inicio")} style={{ cursor: "pointer" }}>
            ← Volver al inicio
          </span>
        </div>
      </div>
    </div>
  );
}

// ── EVENTOS ───────────────────────────────────────
function Eventos({ usuario, setPantalla, setEventoSeleccionado }) {
  const [eventos, setEventos] = useState([]);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    fetch(`${API}/eventos`)
      .then(r => r.json())
      .then(d => { setEventos(d); setCargado(true); });
  }, []);

  return (
    <div className="page wide fade-up">
      <div className="sec-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <span className="sec-tag">Próximos eventos</span>
          <h1 className="sec-title">Hola, {usuario?.nombre} 👋</h1>
          <p className="sec-sub">Explorá los eventos disponibles y comprá tus entradas.</p>
        </div>
        {usuario?.rol === "admin" && (
          <button className="btn btn-warning" onClick={() => setPantalla("admin")}>
            ⚙️ Panel admin
          </button>
        )}
      </div>

      {!cargado && (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
          <div className="spinner" />
        </div>
      )}

      {cargado && eventos.length === 0 && (
        <div className="empty">
          <div className="empty-icon">🎭</div>
          <p>No hay eventos disponibles por el momento.</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
        {eventos.map(e => (
          <div key={e.id} className="card" style={{ cursor: "pointer" }}>
            {/* Color accent bar */}
            <div style={{ height: 3, borderRadius: "3px 3px 0 0", background: "linear-gradient(90deg, var(--teal), var(--teal-light))", margin: "-1.5rem -1.5rem 1.2rem" }} />
            <div className="card-title">{e.nombre}</div>
            <div className="card-meta">
              <span className="card-meta-item">📅 {e.fecha}</span>
              <span className="card-meta-item">📍 {e.lugar}</span>
              <span className="card-meta-item">👥 {e.capacidad} personas</span>
            </div>
            {e.descripcion && <p className="card-desc">{e.descripcion}</p>}
            <div className="card-actions">
              <button className="btn btn-primary"
                onClick={() => { setEventoSeleccionado(e); setPantalla("comprar"); }}>
                🎟️ Ver entradas
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── COMPRAR ───────────────────────────────────────
function Comprar({ usuario, evento, setPantalla }) {
  const [entradas, setEntradas] = useState([]);
  const [cargado, setCargado] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    fetch(`${API}/entradas/${evento.id}`)
      .then(r => r.json())
      .then(d => { setEntradas(d); setCargado(true); });
  }, [evento.id]);

  const pagar = async (tipo_entrada_id) => {
    setLoadingId(tipo_entrada_id);
    await fetch(`${API}/`).catch(() => {});
    const res = await fetch(`${API}/crear-pago`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo_entrada_id, usuario_id: usuario.id }),
    });
    const data = await res.json();
    if (res.ok) {
      window.location.href = data.init_point;
    } else {
      setMensaje("❌ Error al procesar el pago");
      setLoadingId(null);
    }
  };

  return (
    <div className="page fade-up">
      <button className="btn btn-secondary btn-sm" onClick={() => setPantalla("eventos")}
        style={{ marginBottom: "1.5rem" }}>
        ← Volver
      </button>

      {/* Evento hero */}
      <div className="evento-hero">
        <div className="evento-hero-title">{evento.nombre}</div>
        <div className="card-meta">
          <span className="card-meta-item">📅 {evento.fecha}</span>
          <span className="card-meta-item">📍 {evento.lugar}</span>
          <span className="card-meta-item">👥 {evento.capacidad} personas</span>
        </div>
        {evento.descripcion && (
          <p style={{ color: "var(--muted)", fontSize: ".9rem", marginTop: ".8rem", lineHeight: 1.6 }}>
            {evento.descripcion}
          </p>
        )}
      </div>

      <div className="sec-header">
        <span className="sec-tag">Entradas disponibles</span>
        <h2 className="sec-title">Elegí tu entrada</h2>
      </div>

      {!cargado && <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}><div className="spinner" /></div>}

      {cargado && entradas.length === 0 && (
        <div className="empty"><div className="empty-icon">🎫</div><p>No hay entradas disponibles.</p></div>
      )}

      {entradas.map(e => {
        const vendidas = e.cupos - Math.max(0, e.cupos); // placeholder; cupos = disponibles
        return (
          <div key={e.id} className="entrada-card">
            <div className="entrada-info">
              <div className="entrada-nombre">{e.nombre}</div>
              <div className="entrada-precio">${e.precio.toLocaleString("es-AR")}</div>
              <div className="entrada-cupos">🎟️ {e.cupos} cupos disponibles</div>
              <div className="cupos-bar">
                <div className="cupos-fill" style={{ width: "60%" }} />
              </div>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => pagar(e.id)}
              disabled={loadingId === e.id || e.cupos === 0}
            >
              {loadingId === e.id ? "Redirigiendo..." : e.cupos === 0 ? "Agotado" : "💳 Comprar"}
            </button>
          </div>
        );
      })}

      <Msg text={mensaje} />
    </div>
  );
}

// ── COMPRA EXITOSA ────────────────────────────────
function QRImagen({ codigo }) {
  const [imagen, setImagen] = useState(null);
  useEffect(() => {
    fetch(`${API}/qr/${codigo}`)
      .then(r => r.json())
      .then(d => setImagen(d.imagen));
  }, [codigo]);

  return (
    <div className="qr-box">
      {imagen
        ? <img src={imagen} alt="QR" style={{ width: 180, height: 180, display: "block" }} />
        : <div style={{ width: 180, height: 180, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="spinner" />
          </div>
      }
    </div>
  );
}

function CompraExitosa({ qr, setPantalla }) {
  return (
    <div className="page fade-up">
      <div className="qr-success-page">
        <div className="qr-check">🎉</div>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.8rem", marginBottom: ".5rem" }}>
          ¡Pago exitoso!
        </h1>
        <p style={{ color: "var(--muted)", marginBottom: "1.5rem", lineHeight: 1.6 }}>
          Tu entrada fue confirmada. Te enviamos el QR a tu email.
        </p>

        {qr && <QRImagen codigo={qr} />}
        {qr && <p className="qr-code-text">{qr}</p>}

        <div style={{ height: 24 }} />
        <button className="btn btn-primary btn-full" onClick={() => {
          setPantalla("eventos");
          window.history.replaceState({}, "", "/");
        }}>
          Ver más eventos →
        </button>
      </div>
    </div>
  );
}

// ── ADMIN ─────────────────────────────────────────
function Admin({ usuario, setPantalla, setEventoSeleccionado }) {
  const [tab, setTab] = useState("eventos");
  const [eventos, setEventos] = useState([]);
  const [cargado, setCargado] = useState(false);
  const [formEvento, setFormEvento] = useState({ nombre: "", fecha: "", lugar: "", capacidad: "", descripcion: "" });
  const [formEntrada, setFormEntrada] = useState({ evento_id: "", nombre: "", precio: "", cupos: "" });
  const [msgEvento, setMsgEvento] = useState("");
  const [msgEntrada, setMsgEntrada] = useState("");

  useEffect(() => {
    fetch(`${API}/eventos`)
      .then(r => r.json())
      .then(d => { setEventos(d); setCargado(true); });
  }, [cargado]);

  const crearEvento = async () => {
    const res = await fetch(`${API}/eventos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formEvento, capacidad: parseInt(formEvento.capacidad) }),
    });
    if (res.ok) {
      setMsgEvento("✅ Evento creado correctamente");
      setCargado(false);
      setFormEvento({ nombre: "", fecha: "", lugar: "", capacidad: "", descripcion: "" });
    } else setMsgEvento("❌ Error al crear evento");
  };

  const eliminarEvento = async (id) => {
    if (!window.confirm("¿Seguro que querés eliminar este evento?")) return;
    const res = await fetch(`${API}/eventos/${id}`, { method: "DELETE" });
    if (res.ok) setCargado(false);
  };

  const crearEntrada = async () => {
    const res = await fetch(`${API}/entradas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        evento_id: parseInt(formEntrada.evento_id),
        nombre: formEntrada.nombre,
        precio: parseFloat(formEntrada.precio),
        cupos: parseInt(formEntrada.cupos),
      }),
    });
    if (res.ok) {
      setMsgEntrada("✅ Tipo de entrada creado");
      setFormEntrada({ evento_id: "", nombre: "", precio: "", cupos: "" });
    } else setMsgEntrada("❌ Error al crear entrada");
  };

  return (
    <div className="page wide fade-up">
      <div className="sec-header">
        <span className="sec-tag">Panel</span>
        <h1 className="sec-title">⚙️ Administración</h1>
        <p className="sec-sub">Gestión de eventos, entradas y accesos.</p>
      </div>

      {/* Stats mini */}
      <div className="admin-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
        <div className="stat-mini">
          <div className="stat-mini-val">{eventos.length}</div>
          <div className="stat-mini-label">Eventos activos</div>
        </div>
        <div className="stat-mini">
          <div className="stat-mini-val" style={{ color: "var(--warning)" }}>—</div>
          <div className="stat-mini-label">Entradas vendidas</div>
        </div>
      </div>

      <div className="tabs">
        {[
          { id: "eventos", label: "📋 Mis eventos" },
          { id: "crear_evento", label: "➕ Crear evento" },
          { id: "crear_entrada", label: "🎟️ Agregar entrada" },
          { id: "validar", label: "🔍 Validar QR" },
        ].map(t => (
          <button key={t.id} className={`tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* TAB: Eventos */}
      {tab === "eventos" && (
        <>
          {!cargado && <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}><div className="spinner" /></div>}
          {cargado && eventos.length === 0 && (
            <div className="empty"><div className="empty-icon">📭</div><p>No creaste ningún evento aún.</p></div>
          )}
          {eventos.map(e => (
            <div key={e.id} className="admin-evento-row">
              <div className="admin-evento-info">
                <div className="admin-evento-nombre">{e.nombre}</div>
                <div className="admin-evento-meta">📅 {e.fecha} &nbsp;·&nbsp; 📍 {e.lugar} &nbsp;·&nbsp; 👥 {e.capacidad}</div>
              </div>
              <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                <button className="btn btn-secondary btn-sm"
                  onClick={() => { setEventoSeleccionado(e); setPantalla("estadisticas"); }}>
                  📊 Stats
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => eliminarEvento(e.id)}>
                  🗑️ Borrar
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* TAB: Crear evento */}
      {tab === "crear_evento" && (
        <div style={{ maxWidth: 480 }}>
          <div className="field"><label>Nombre del evento</label>
            <input placeholder="Ej: Fiesta de verano 2026" value={formEvento.nombre}
              onChange={e => setFormEvento({ ...formEvento, nombre: e.target.value })} /></div>
          <div className="field"><label>Fecha</label>
            <input type="date" value={formEvento.fecha}
              onChange={e => setFormEvento({ ...formEvento, fecha: e.target.value })} /></div>
          <div className="field"><label>Lugar</label>
            <input placeholder="Dirección o nombre del lugar" value={formEvento.lugar}
              onChange={e => setFormEvento({ ...formEvento, lugar: e.target.value })} /></div>
          <div className="field"><label>Capacidad total</label>
            <input type="number" placeholder="Ej: 500" value={formEvento.capacidad}
              onChange={e => setFormEvento({ ...formEvento, capacidad: e.target.value })} /></div>
          <div className="field"><label>Descripción</label>
            <textarea placeholder="Contá de qué se trata el evento..." value={formEvento.descripcion}
              onChange={e => setFormEvento({ ...formEvento, descripcion: e.target.value })} /></div>
          <button className="btn btn-primary" onClick={crearEvento}>Crear evento →</button>
          <Msg text={msgEvento} />
        </div>
      )}

      {/* TAB: Crear entrada */}
      {tab === "crear_entrada" && (
        <div style={{ maxWidth: 480 }}>
          <div className="field"><label>Evento</label>
            <select value={formEntrada.evento_id}
              onChange={e => setFormEntrada({ ...formEntrada, evento_id: e.target.value })}>
              <option value="">Seleccioná un evento</option>
              {eventos.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select></div>
          <div className="field"><label>Tipo de entrada</label>
            <input placeholder="Ej: General, VIP, Early Bird" value={formEntrada.nombre}
              onChange={e => setFormEntrada({ ...formEntrada, nombre: e.target.value })} /></div>
          <div className="field"><label>Precio ($)</label>
            <input type="number" placeholder="Ej: 3500" value={formEntrada.precio}
              onChange={e => setFormEntrada({ ...formEntrada, precio: e.target.value })} /></div>
          <div className="field"><label>Cupos disponibles</label>
            <input type="number" placeholder="Ej: 100" value={formEntrada.cupos}
              onChange={e => setFormEntrada({ ...formEntrada, cupos: e.target.value })} /></div>
          <button className="btn btn-primary" onClick={crearEntrada}>Agregar entrada →</button>
          <Msg text={msgEntrada} />
        </div>
      )}

      {/* TAB: Validar QR */}
      {tab === "validar" && <ValidarQR inline />}

      <div className="divider" />
      <button className="btn btn-secondary" onClick={() => setPantalla("eventos")}>
        ← Volver a eventos
      </button>
    </div>
  );
}

// ── ESTADÍSTICAS ──────────────────────────────────
function Estadisticas({ evento, setPantalla }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch(`${API}/estadisticas/${evento.id}`)
      .then(r => r.json())
      .then(setStats);
  }, [evento.id]);

  return (
    <div className="page wide fade-up">
      <button className="btn btn-secondary btn-sm" onClick={() => setPantalla("admin")}
        style={{ marginBottom: "1.5rem" }}>
        ← Volver al panel
      </button>

      <div className="sec-header">
        <span className="sec-tag">Estadísticas</span>
        <h1 className="sec-title">{evento.nombre}</h1>
      </div>

      {!stats && <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}><div className="spinner" /></div>}

      {stats && (
        <>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
            {[
              { val: stats.total_compras, label: "Entradas vendidas", icon: "🎟️" },
              { val: `$${stats.total_recaudado.toLocaleString("es-AR")}`, label: "Total recaudado", icon: "💰" },
              { val: stats.total_accesos, label: "Accesos validados", icon: "✅" },
            ].map(s => (
              <div key={s.label} className="stat-mini">
                <div style={{ fontSize: "1.3rem", marginBottom: ".3rem" }}>{s.icon}</div>
                <div className="stat-mini-val">{s.val}</div>
                <div className="stat-mini-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <Bar
              data={{
                labels: stats.detalle.map(d => d.tipo),
                datasets: [
                  { label: "Vendidas", data: stats.detalle.map(d => d.vendidas), backgroundColor: "rgba(4,138,129,.7)", borderRadius: 6 },
                  { label: "Accesos", data: stats.detalle.map(d => d.accesos), backgroundColor: "rgba(46,64,87,.8)", borderRadius: 6 },
                ],
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: { labels: { color: "#8899aa" } },
                  title: { display: false },
                },
                scales: {
                  x: { ticks: { color: "#8899aa" }, grid: { color: "rgba(4,138,129,.08)" } },
                  y: { ticks: { color: "#8899aa" }, grid: { color: "rgba(4,138,129,.08)" } },
                },
              }}
            />
          </div>

          {/* Detail rows */}
          {stats.detalle.map((d, i) => (
            <div key={i} className="stats-row">
              <div className="stats-row-title">{d.tipo}</div>
              <div className="stats-cols">
                <div className="stats-col">
                  <div className="stats-col-val">${d.precio.toLocaleString("es-AR")}</div>
                  <div className="stats-col-label">Precio</div>
                </div>
                <div className="stats-col">
                  <div className="stats-col-val">{d.vendidas}/{d.cupos}</div>
                  <div className="stats-col-label">Vendidas</div>
                </div>
                <div className="stats-col">
                  <div className="stats-col-val">{d.accesos}</div>
                  <div className="stats-col-label">Accesos</div>
                </div>
                <div className="stats-col">
                  <div className="stats-col-val">${d.recaudado.toLocaleString("es-AR")}</div>
                  <div className="stats-col-label">Recaudado</div>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ── VALIDAR QR ────────────────────────────────────
function ValidarQR({ setPantalla, inline = false }) {
  const [resultado, setResultado] = useState(null);
  const [codigo, setCodigo] = useState("");
  const [scannerActivo, setScannerActivo] = useState(false);

  const iniciarEscaner = () => {
    setScannerActivo(true);
    const html5QrCode = new window.Html5Qrcode("lector-qr");
    html5QrCode.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      async (cod) => {
        html5QrCode.stop();
        setScannerActivo(false);
        await validarCodigo(cod);
      },
      () => {}
    );
  };

  const validarCodigo = async (cod) => {
    const res = await fetch(`${API}/validar-qr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qr_codigo: cod }),
    });
    const data = await res.json();
    setResultado({ ok: res.ok, mensaje: data.mensaje || data.error });
  };

  const content = (
    <>
      <div style={{ display: "flex", gap: ".8rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        <button className="btn btn-primary" onClick={iniciarEscaner} disabled={scannerActivo}>
          📷 {scannerActivo ? "Escaneando..." : "Escanear con cámara"}
        </button>
      </div>

      <div id="lector-qr" style={{ width: "100%", borderRadius: 12, overflow: "hidden" }} />

      <div className="divider" />

      <p style={{ color: "var(--muted)", fontSize: ".88rem", marginBottom: ".8rem" }}>
        O ingresá el código manualmente:
      </p>
      <div style={{ display: "flex", gap: ".8rem" }}>
        <input
          className="field"
          placeholder="Código QR"
          style={{
            flex: 1, padding: "10px 14px",
            background: "var(--dark3)", border: "1px solid var(--border)",
            borderRadius: 10, color: "var(--text)", fontFamily: "inherit", fontSize: ".9rem", outline: "none"
          }}
          onChange={e => setCodigo(e.target.value)}
          onKeyDown={e => e.key === "Enter" && validarCodigo(codigo)}
        />
        <button className="btn btn-primary" onClick={() => validarCodigo(codigo)}>Validar</button>
      </div>

      {resultado && (
        <div className={`qr-result ${resultado.ok ? "ok" : "fail"}`}>
          <div className="qr-result-icon">{resultado.ok ? "✅" : "❌"}</div>
          <div className="qr-result-msg">{resultado.mensaje}</div>
        </div>
      )}
    </>
  );

  if (inline) return <div>{content}</div>;

  return (
    <div className="page fade-up">
      <button className="btn btn-secondary btn-sm" onClick={() => setPantalla("admin")}
        style={{ marginBottom: "1.5rem" }}>
        ← Volver
      </button>
      <div className="sec-header">
        <span className="sec-tag">Control de acceso</span>
        <h1 className="sec-title">🔍 Validar QR</h1>
        <p className="sec-sub">Escaneá el QR del asistente para validar su acceso al evento.</p>
      </div>
      {content}
    </div>
  );
}

export default App;
