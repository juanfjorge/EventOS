import { useState } from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function App() {
  const [pantalla, setPantalla] = useState("inicio");
  const [usuario, setUsuario] = useState(null);
  const [eventoSeleccionado, setEventoSeleccionado] = useState(null);

  const irA = (destino) => {
    if (destino === "admin" && usuario?.rol !== "admin") return;
    if (destino === "estadisticas" && usuario?.rol !== "admin") return;
    if (destino === "validar" && usuario?.rol !== "admin") return;
    setPantalla(destino);
  };

  return (
    <div style={{ fontFamily: "Arial", maxWidth: "480px", margin: "0 auto", padding: "20px", boxSizing: "border-box" }}>
      {pantalla === "inicio" && <Inicio setPantalla={irA} />}
      {pantalla === "registro" && <Registro setPantalla={irA} />}
      {pantalla === "login" && <Login setPantalla={irA} setUsuario={setUsuario} />}
      {pantalla === "eventos" && (
        <Eventos usuario={usuario} setPantalla={irA} setEventoSeleccionado={setEventoSeleccionado} />
      )}
      {pantalla === "comprar" && (
        <Comprar usuario={usuario} evento={eventoSeleccionado} setPantalla={irA} />
      )}
      {pantalla === "admin" && (
        <Admin usuario={usuario} setPantalla={irA} setEventoSeleccionado={setEventoSeleccionado} />
      )}
      {pantalla === "estadisticas" && (
        <Estadisticas evento={eventoSeleccionado} setPantalla={irA} />
      )}
      {pantalla === "validar" && (
        <ValidarQR setPantalla={irA} />
      )}
    </div>
  );
}

function Inicio({ setPantalla }) {
  return (
    <div style={{ textAlign: "center", marginTop: "80px" }}>
      <h1 style={{ fontSize: "2.5em" }}>🎉 EventOS</h1>
      <p style={{ color: "#666" }}>Plataforma de gestión de eventos</p>
      <br />
      <button onClick={() => setPantalla("login")} style={btnStyle("#2E4057")}>Iniciar sesión</button>
      <br /><br />
      <button onClick={() => setPantalla("registro")} style={btnStyle("#048A81")}>Registrarse</button>
    </div>
  );
}

function Registro({ setPantalla }) {
  const [form, setForm] = useState({ nombre: "", email: "", password: "", rol: "cliente" });
  const [mensaje, setMensaje] = useState("");

  const handleSubmit = async () => {
    const res = await fetch("http://127.0.0.1:5000/registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const data = await res.json();
    if (res.ok) {
      setMensaje("✅ Registrado correctamente");
      setTimeout(() => setPantalla("login"), 1500);
    } else {
      setMensaje("❌ " + data.error);
    }
  };

  return (
    <div>
      <h2>Registro</h2>
      <input placeholder="Nombre" style={inputStyle} onChange={e => setForm({ ...form, nombre: e.target.value })} />
      <input placeholder="Email" style={inputStyle} onChange={e => setForm({ ...form, email: e.target.value })} />
      <input placeholder="Contraseña" type="password" style={inputStyle} onChange={e => setForm({ ...form, password: e.target.value })} />
      <select style={inputStyle} onChange={e => setForm({ ...form, rol: e.target.value })}>
        <option value="cliente">Cliente</option>
        <option value="admin">Administrador</option>
      </select>
      <button onClick={handleSubmit} style={btnStyle("#048A81")}>Registrarse</button>
      <br /><br />
      <button onClick={() => setPantalla("inicio")} style={btnStyle("#aaa")}>Volver</button>
      {mensaje && <p>{mensaje}</p>}
    </div>
  );
}

function Login({ setPantalla, setUsuario }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [mensaje, setMensaje] = useState("");

  const handleSubmit = async () => {
    const res = await fetch("http://127.0.0.1:5000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const data = await res.json();
    if (res.ok) {
      setUsuario(data.usuario);
      setPantalla("eventos");
    } else {
      setMensaje("❌ " + data.error);
    }
  };

  return (
    <div>
      <h2>Iniciar sesión</h2>
      <input placeholder="Email" style={inputStyle} onChange={e => setForm({ ...form, email: e.target.value })} />
      <input placeholder="Contraseña" type="password" style={inputStyle} onChange={e => setForm({ ...form, password: e.target.value })} />
      <button onClick={handleSubmit} style={btnStyle("#2E4057")}>Entrar</button>
      <br /><br />
      <button onClick={() => setPantalla("inicio")} style={btnStyle("#aaa")}>Volver</button>
      {mensaje && <p>{mensaje}</p>}
    </div>
  );
}

function Eventos({ usuario, setPantalla, setEventoSeleccionado }) {
  const [eventos, setEventos] = useState([]);
  const [cargado, setCargado] = useState(false);

  const cargarEventos = async () => {
    const res = await fetch("http://127.0.0.1:5000/eventos");
    const data = await res.json();
    setEventos(data);
    setCargado(true);
  };

  if (!cargado) cargarEventos();

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Hola, {usuario?.nombre} 👋</h2>
        <span style={{ backgroundColor: usuario?.rol === "admin" ? "#e67e22" : "#048A81", color: "white", padding: "4px 10px", borderRadius: "12px", fontSize: "12px" }}>
          {usuario?.rol}
        </span>
      </div>

      {usuario?.rol === "admin" && (
        <button onClick={() => setPantalla("admin")} style={btnStyle("#e67e22")}>⚙️ Panel de Administrador</button>
      )}

      <br /><br />
      <h3>Eventos disponibles</h3>
      {eventos.length === 0 && <p>No hay eventos disponibles.</p>}
      {eventos.map(e => (
        <div key={e.id} style={cardStyle}>
          <h4 style={{ margin: "0 0 8px 0" }}>{e.nombre}</h4>
          <p style={pStyle}>📅 {e.fecha}</p>
          <p style={pStyle}>📍 {e.lugar}</p>
          <p style={pStyle}>👥 Capacidad: {e.capacidad}</p>
          <p style={pStyle}>{e.descripcion}</p>
          <button onClick={() => { setEventoSeleccionado(e); setPantalla("comprar"); }}
            style={btnStyle("#048A81")}>🎟️ Ver entradas</button>
        </div>
      ))}
      <br />
      <button onClick={() => setPantalla("inicio")} style={btnStyle("#aaa")}>Cerrar sesión</button>
    </div>
  );
}



function QRImagen({ codigo }) {
  const [imagen, setImagen] = useState(null);

  const cargarQR = async () => {
    const res = await fetch(`http://127.0.0.1:5000/qr/${codigo}`);
    const data = await res.json();
    setImagen(data.imagen);
  };

  if (!imagen) cargarQR();

  return (
    <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#f0f0f0", borderRadius: "8px", textAlign: "center" }}>
      <p><strong>Tu código QR:</strong></p>
      {imagen
        ? <img src={imagen} alt="QR" style={{ width: "200px", height: "200px" }} />
        : <p>Cargando QR...</p>
      }
      <p style={{ fontSize: "11px", color: "#888", wordBreak: "break-all" }}>{codigo}</p>
    </div>
  );
}

function Admin({ usuario, setPantalla, setEventoSeleccionado }) {
  const [eventos, setEventos] = useState([]);
  const [cargado, setCargado] = useState(false);
  const [formEvento, setFormEvento] = useState({ nombre: "", fecha: "", lugar: "", capacidad: "", descripcion: "" });
  const [formEntrada, setFormEntrada] = useState({ evento_id: "", nombre: "", precio: "", cupos: "" });
  const [mensajeEvento, setMensajeEvento] = useState("");
  const [mensajeEntrada, setMensajeEntrada] = useState("");

  const cargarEventos = async () => {
    const res = await fetch("http://127.0.0.1:5000/eventos");
    const data = await res.json();
    setEventos(data);
    setCargado(true);
  };

  if (!cargado) cargarEventos();

  const crearEvento = async () => {
    const res = await fetch("http://127.0.0.1:5000/eventos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formEvento, capacidad: parseInt(formEvento.capacidad) })
    });
    if (res.ok) {
      setMensajeEvento("✅ Evento creado correctamente");
      setCargado(false);
    } else {
      setMensajeEvento("❌ Error al crear evento");
    }
  };

  const eliminarEvento = async (id) => {
    if (!window.confirm("¿Seguro que querés eliminar este evento?")) return;
    const res = await fetch(`http://127.0.0.1:5000/eventos/${id}`, { method: "DELETE" });
    if (res.ok) setCargado(false);
  };

  const crearEntrada = async () => {
    const res = await fetch("http://127.0.0.1:5000/entradas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        evento_id: parseInt(formEntrada.evento_id),
        nombre: formEntrada.nombre,
        precio: parseFloat(formEntrada.precio),
        cupos: parseInt(formEntrada.cupos)
      })
    });
    if (res.ok) {
      setMensajeEntrada("✅ Tipo de entrada creado correctamente");
    } else {
      setMensajeEntrada("❌ Error al crear entrada");
    }
  };

  return (
    <div>
      <h2>⚙️ Panel de Administrador</h2>
      <p>Hola, {usuario?.nombre}</p>

      <hr />
      <h3>Crear nuevo evento</h3>
      <input placeholder="Nombre del evento" style={inputStyle} onChange={e => setFormEvento({ ...formEvento, nombre: e.target.value })} />
      <input placeholder="Fecha (ej: 2026-12-15)" style={inputStyle} onChange={e => setFormEvento({ ...formEvento, fecha: e.target.value })} />
      <input placeholder="Lugar" style={inputStyle} onChange={e => setFormEvento({ ...formEvento, lugar: e.target.value })} />
      <input placeholder="Capacidad" type="number" style={inputStyle} onChange={e => setFormEvento({ ...formEvento, capacidad: e.target.value })} />
      <input placeholder="Descripción" style={inputStyle} onChange={e => setFormEvento({ ...formEvento, descripcion: e.target.value })} />
      <button onClick={crearEvento} style={btnStyle("#e67e22")}>Crear evento</button>
      {mensajeEvento && <p>{mensajeEvento}</p>}

      <hr />
      <h3>Agregar tipo de entrada</h3>
      <select style={inputStyle} onChange={e => setFormEntrada({ ...formEntrada, evento_id: e.target.value })}>
        <option value="">Seleccionar evento</option>
        {eventos.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
      </select>
      <input placeholder="Tipo (General, VIP, Early Bird)" style={inputStyle} onChange={e => setFormEntrada({ ...formEntrada, nombre: e.target.value })} />
      <input placeholder="Precio" type="number" style={inputStyle} onChange={e => setFormEntrada({ ...formEntrada, precio: e.target.value })} />
      <input placeholder="Cupos" type="number" style={inputStyle} onChange={e => setFormEntrada({ ...formEntrada, cupos: e.target.value })} />
      <button onClick={crearEntrada} style={btnStyle("#2E4057")}>Agregar entrada</button>
      {mensajeEntrada && <p>{mensajeEntrada}</p>}

      <hr />
      <h3>Eventos creados</h3>
      {eventos.map(e => (
        <div key={e.id} style={cardStyle}>
          <h4 style={{ margin: "0 0 8px 0" }}>{e.nombre}</h4>
          <p style={pStyle}>📅 {e.fecha} — 📍 {e.lugar}</p>
          <p style={pStyle}>👥 Capacidad: {e.capacidad}</p>
          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button onClick={() => { setEventoSeleccionado(e); setPantalla("estadisticas"); }}
              style={{ ...btnStyle("#8e44ad"), width: "auto", padding: "8px 12px" }}>📊 Estadísticas</button>
            <button onClick={() => eliminarEvento(e.id)}
              style={{ ...btnStyle("#e74c3c"), width: "auto", padding: "8px 12px" }}>🗑️ Eliminar</button>
          </div>
        </div>
      ))}

      <br />
      <button onClick={() => setPantalla("validar")} style={btnStyle("#c0392b")}>🔍 Validar QR en puerta</button>
      <br /><br />
      <button onClick={() => setPantalla("eventos")} style={btnStyle("#aaa")}>Volver</button>
    </div>
  );
}




  const cargarStats = async () => {
    const res = await fetch(`http://127.0.0.1:5000/estadisticas/${evento.id}`);
    const data = await res.json();
    setStats(data);
  };

  if (!stats) cargarStats();

  const datosGrafico = stats?.detalle.map(d => ({
    tipo: d.tipo,
    Vendidas: d.vendidas,
    Accesos: d.accesos,
    Recaudado: d.recaudado
  }));

  return (
    <div>
      <h2>📊 Estadísticas</h2>
      <h3>{evento.nombre}</h3>
      {stats ? (
        <div>
          <div style={cardStyle}>
            <p>🎟️ <strong>Total vendidas:</strong> {stats.total_compras}</p>
            <p>💰 <strong>Total recaudado:</strong> ${stats.total_recaudado}</p>
            <p>✅ <strong>Accesos validados:</strong> {stats.total_accesos}</p>
          </div>

          <h3>Ventas por tipo de entrada</h3>
          <Bar
  data={{
    labels: stats.detalle.map(d => d.tipo),
    datasets: [
      {
        label: "Vendidas",
        data: stats.detalle.map(d => d.vendidas),
        backgroundColor: "#2E4057"
      },
      {
        label: "Accesos",
        data: stats.detalle.map(d => d.accesos),
        backgroundColor: "#048A81"
      }
    ]
  }}
  options={{ responsive: true }}
/>

          <h3>Detalle por tipo</h3>
          {stats.detalle.map((d, i) => (
            <div key={i} style={cardStyle}>
              <h4>{d.tipo}</h4>
              <p style={pStyle}>💰 Precio: ${d.precio}</p>
              <p style={pStyle}>🎟️ Vendidas: {d.vendidas} / {d.cupos}</p>
              <p style={pStyle}>✅ Accesos: {d.accesos}</p>
              <p style={pStyle}>💵 Recaudado: ${d.recaudado}</p>
            </div>
          ))}
        </div>
      ) : (
        <p>Cargando estadísticas...</p>
      )}
      <br />
      <button onClick={() => setPantalla("admin")} style={btnStyle("#aaa")}>Volver</button>
    </div>
  );
}

function ValidarQR({ setPantalla }) {
  const [resultado, setResultado] = useState(null);
  const [codigo, setCodigo] = useState("");

  const iniciarEscaner = () => {
    const html5QrCode = new window.Html5Qrcode("lector-qr");
    html5QrCode.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      async (codigoDetectado) => {
        html5QrCode.stop();
        await validarCodigo(codigoDetectado);
      },
      (error) => {}
    );
  };

  const validarCodigo = async (cod) => {
    const res = await fetch("http://127.0.0.1:5000/validar-qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qr_codigo: cod })
    });
    const data = await res.json();
    setResultado({ ok: res.ok, mensaje: data.mensaje || data.error });
  };

  const validarManual = async () => {
    await validarCodigo(codigo);
  };

  return (
    <div>
      <h2>🔍 Validar QR en puerta</h2>

      <button onClick={iniciarEscaner} style={btnStyle("#2E4057")}>
        📷 Escanear con cámara
      </button>

      <br /><br />
      <div id="lector-qr" style={{ width: "100%" }}></div>

      <hr />
      <p>O ingresá el código manualmente:</p>
      <input
        placeholder="Código QR"
        style={inputStyle}
        onChange={e => setCodigo(e.target.value)}
      />
      <button onClick={validarManual} style={btnStyle("#048A81")}>Validar</button>

      {resultado && (
        <div style={{
          marginTop: "20px",
          padding: "20px",
          borderRadius: "8px",
          textAlign: "center",
          backgroundColor: resultado.ok ? "#d4edda" : "#f8d7da",
          color: resultado.ok ? "#155724" : "#721c24"
        }}>
          <h2>{resultado.ok ? "✅" : "❌"}</h2>
          <p><strong>{resultado.mensaje}</strong></p>
        </div>
      )}

      <br />
      <button onClick={() => setPantalla("admin")} style={btnStyle("#aaa")}>Volver</button>
    </div>
  );
}

const inputStyle = {
  display: "block", width: "100%", padding: "10px",
  marginBottom: "10px", fontSize: "16px", borderRadius: "6px",
  border: "1px solid #ccc", boxSizing: "border-box"
};

const btnStyle = (color) => ({
  backgroundColor: color, color: "white", border: "none",
  padding: "10px 20px", borderRadius: "6px", fontSize: "16px",
  cursor: "pointer", width: "100%"
});

const pStyle = { margin: "4px 0", fontSize: "14px", color: "#555" };

const cardStyle = {
  border: "1px solid #ddd", borderRadius: "8px",
  padding: "15px", marginBottom: "10px", backgroundColor: "#f9f9f9"
};

export default App;