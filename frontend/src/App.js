import { useState } from "react";

function App() {
  const [pantalla, setPantalla] = useState("inicio");
  const [usuario, setUsuario] = useState(null);
  const [eventoSeleccionado, setEventoSeleccionado] = useState(null);

  return (
    <div style={{ fontFamily: "Arial", maxWidth: "500px", margin: "0 auto", padding: "20px" }}>
      {pantalla === "inicio" && <Inicio setPantalla={setPantalla} />}
      {pantalla === "registro" && <Registro setPantalla={setPantalla} />}
      {pantalla === "login" && <Login setPantalla={setPantalla} setUsuario={setUsuario} />}
      {pantalla === "eventos" && (
        <Eventos usuario={usuario} setPantalla={setPantalla} setEventoSeleccionado={setEventoSeleccionado} />
      )}
      {pantalla === "comprar" && (
        <Comprar usuario={usuario} evento={eventoSeleccionado} setPantalla={setPantalla} />
      )}
      {pantalla === "admin" && (
        <Admin usuario={usuario} setPantalla={setPantalla} />
      )}
    </div>
  );
}

function Inicio({ setPantalla }) {
  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <h1>🎉 EventOS</h1>
      <p>Plataforma de gestión de eventos</p>
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
      <h2>Bienvenido, {usuario?.nombre} 👋</h2>
      <p>Rol: {usuario?.rol}</p>

      {usuario?.rol === "admin" && (
        <button onClick={() => setPantalla("admin")} style={btnStyle("#e67e22")}>
          ⚙️ Panel de Administrador
        </button>
      )}

      <br /><br />
      <h3>Eventos disponibles</h3>
      {eventos.length === 0 && <p>No hay eventos disponibles.</p>}
      {eventos.map(e => (
        <div key={e.id} style={cardStyle}>
          <h4>{e.nombre}</h4>
          <p>📅 {e.fecha}</p>
          <p>📍 {e.lugar}</p>
          <p>👥 Capacidad: {e.capacidad}</p>
          <p>{e.descripcion}</p>
          <button onClick={() => { setEventoSeleccionado(e); setPantalla("comprar"); }}
            style={btnStyle("#048A81")}>Ver entradas</button>
        </div>
      ))}
      <br />
      <button onClick={() => setPantalla("inicio")} style={btnStyle("#aaa")}>Cerrar sesión</button>
    </div>
  );
}

function Comprar({ usuario, evento, setPantalla }) {
  const [entradas, setEntradas] = useState([]);
  const [cargado, setCargado] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [qr, setQr] = useState("");

  const cargarEntradas = async () => {
    const res = await fetch(`http://127.0.0.1:5000/entradas/${evento.id}`);
    const data = await res.json();
    setEntradas(data);
    setCargado(true);
  };

  if (!cargado) cargarEntradas();

  const comprar = async (tipo_entrada_id) => {
    const res = await fetch("http://127.0.0.1:5000/compras", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario_id: usuario.id, tipo_entrada_id })
    });
    const data = await res.json();
    if (res.ok) {
      setMensaje("✅ Compra exitosa!");
      setQr(data.qr_codigo);
    } else {
      setMensaje("❌ " + data.error);
    }
  };

  return (
    <div>
      <h2>{evento.nombre}</h2>
      <p>📅 {evento.fecha} — 📍 {evento.lugar}</p>
      <h3>Tipos de entrada</h3>
      {entradas.map(e => (
        <div key={e.id} style={cardStyle}>
          <h4>{e.nombre}</h4>
          <p>💰 ${e.precio}</p>
          <p>🎟️ Cupos disponibles: {e.cupos}</p>
          <button onClick={() => comprar(e.id)} style={btnStyle("#2E4057")}>Comprar</button>
        </div>
      ))}
      {mensaje && <p>{mensaje}</p>}
      {qr && <QRImagen codigo={qr} />} #muestra la imagen del qr
      <br />
      <button onClick={() => setPantalla("eventos")} style={btnStyle("#aaa")}>Volver</button>
    </div>
  );
}

function Admin({ usuario, setPantalla }) {
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
    const data = await res.json();
    if (res.ok) {
      setMensajeEvento("✅ Evento creado correctamente");
      setCargado(false);
    } else {
      setMensajeEvento("❌ Error al crear evento");
    }
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
          <h4>{e.nombre}</h4>
          <p>📅 {e.fecha} — 📍 {e.lugar}</p>
          <p>👥 Capacidad: {e.capacidad}</p>
        </div>
      ))}

      <br />
      <button onClick={() => setPantalla("eventos")} style={btnStyle("#aaa")}>Volver</button>
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

const cardStyle = {
  border: "1px solid #ddd", borderRadius: "8px",
  padding: "15px", marginBottom: "10px", backgroundColor: "#f9f9f9"
};

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

export default App;