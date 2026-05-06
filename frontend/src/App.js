import { useState } from "react";

function App() {
  const [pantalla, setPantalla] = useState("inicio");
  const [usuario, setUsuario] = useState(null);

  return (
    <div style={{ fontFamily: "Arial", maxWidth: "500px", margin: "0 auto", padding: "20px" }}>
      {pantalla === "inicio" && (
        <Inicio setPantalla={setPantalla} />
      )}
      {pantalla === "registro" && (
        <Registro setPantalla={setPantalla} />
      )}
      {pantalla === "login" && (
        <Login setPantalla={setPantalla} setUsuario={setUsuario} />
      )}
      {pantalla === "eventos" && (
        <Eventos usuario={usuario} setPantalla={setPantalla} />
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
      <button onClick={() => setPantalla("login")}
        style={btnStyle("#2E4057")}>Iniciar sesión</button>
      <br /><br />
      <button onClick={() => setPantalla("registro")}
        style={btnStyle("#048A81")}>Registrarse</button>
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

function Eventos({ usuario, setPantalla }) {
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
      <h3>Eventos disponibles</h3>
      {eventos.length === 0 && <p>No hay eventos disponibles.</p>}
      {eventos.map(e => (
        <div key={e.id} style={cardStyle}>
          <h4>{e.nombre}</h4>
          <p>📅 {e.fecha}</p>
          <p>📍 {e.lugar}</p>
          <p>👥 Capacidad: {e.capacidad}</p>
          <p>{e.descripcion}</p>
        </div>
      ))}
      <br />
      <button onClick={() => setPantalla("inicio")} style={btnStyle("#aaa")}>Cerrar sesión</button>
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

export default App;