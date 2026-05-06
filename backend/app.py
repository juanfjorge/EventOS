from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Configuración de la base de datos
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///eventos.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# ========================
# MODELOS (tablas)
# ========================

class Usuario(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    rol = db.Column(db.String(20), default='cliente')  # 'admin' o 'cliente'

class Evento(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(150), nullable=False)
    fecha = db.Column(db.String(50), nullable=False)
    lugar = db.Column(db.String(150), nullable=False)
    capacidad = db.Column(db.Integer, nullable=False)
    descripcion = db.Column(db.Text)

class TipoEntrada(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    evento_id = db.Column(db.Integer, db.ForeignKey('evento.id'), nullable=False)
    nombre = db.Column(db.String(50), nullable=False)  # general, vip, early bird
    precio = db.Column(db.Float, nullable=False)
    cupos = db.Column(db.Integer, nullable=False)

class Compra(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=False)
    tipo_entrada_id = db.Column(db.Integer, db.ForeignKey('tipo_entrada.id'), nullable=False)
    fecha_compra = db.Column(db.String(50), nullable=False)
    qr_codigo = db.Column(db.String(200), unique=True, nullable=False)
    qr_usado = db.Column(db.Boolean, default=False)

# ========================
# RUTA DE PRUEBA
# ========================

@app.route('/')
def index():
    return {'mensaje': 'EventOS API funcionando ✓'}

# ========================
# INICIAR
# ========================

from flask import request, jsonify
import hashlib
from datetime import datetime

# ========================
# RUTAS DE USUARIOS
# ========================

@app.route('/registro', methods=['POST'])
def registro():
    data = request.get_json()

    # Verificar si el email ya existe
    if Usuario.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'El email ya está registrado'}), 400

    # Encriptar contraseña
    password_hash = hashlib.sha256(data['password'].encode()).hexdigest()

    nuevo_usuario = Usuario(
        nombre=data['nombre'],
        email=data['email'],
        password=password_hash,
        rol=data.get('rol', 'cliente')
    )

    db.session.add(nuevo_usuario)
    db.session.commit()

    return jsonify({'mensaje': 'Usuario registrado correctamente', 'id': nuevo_usuario.id}), 201


@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    password_hash = hashlib.sha256(data['password'].encode()).hexdigest()

    usuario = Usuario.query.filter_by(
        email=data['email'],
        password=password_hash
    ).first()

    if not usuario:
        return jsonify({'error': 'Email o contraseña incorrectos'}), 401

    return jsonify({
        'mensaje': 'Login exitoso',
        'usuario': {
            'id': usuario.id,
            'nombre': usuario.nombre,
            'email': usuario.email,
            'rol': usuario.rol
        }
    }), 200

# ========================
# RUTAS DE EVENTOS
# ========================

@app.route('/eventos', methods=['GET'])
def listar_eventos():
    eventos = Evento.query.all()
    return jsonify([{
        'id': e.id,
        'nombre': e.nombre,
        'fecha': e.fecha,
        'lugar': e.lugar,
        'capacidad': e.capacidad,
        'descripcion': e.descripcion
    } for e in eventos]), 200


@app.route('/eventos', methods=['POST'])
def crear_evento():
    data = request.get_json()

    nuevo_evento = Evento(
        nombre=data['nombre'],
        fecha=data['fecha'],
        lugar=data['lugar'],
        capacidad=data['capacidad'],
        descripcion=data.get('descripcion', '')
    )

    db.session.add(nuevo_evento)
    db.session.commit()

    return jsonify({'mensaje': 'Evento creado correctamente', 'id': nuevo_evento.id}), 201


@app.route('/eventos/<int:id>', methods=['GET'])
def obtener_evento(id):
    evento = Evento.query.get_or_404(id)
    return jsonify({
        'id': evento.id,
        'nombre': evento.nombre,
        'fecha': evento.fecha,
        'lugar': evento.lugar,
        'capacidad': evento.capacidad,
        'descripcion': evento.descripcion
    }), 200


@app.route('/eventos/<int:id>', methods=['DELETE'])
def eliminar_evento(id):
    evento = Evento.query.get_or_404(id)
    db.session.delete(evento)
    db.session.commit()
    return jsonify({'mensaje': 'Evento eliminado correctamente'}), 200

# ========================
# RUTAS DE TIPOS DE ENTRADA
# ========================

@app.route('/entradas', methods=['POST'])
def crear_entrada():
    data = request.get_json()

    nueva_entrada = TipoEntrada(
        evento_id=data['evento_id'],
        nombre=data['nombre'],
        precio=data['precio'],
        cupos=data['cupos']
    )

    db.session.add(nueva_entrada)
    db.session.commit()

    return jsonify({'mensaje': 'Tipo de entrada creado correctamente', 'id': nueva_entrada.id}), 201


@app.route('/entradas/<int:evento_id>', methods=['GET'])
def listar_entradas(evento_id):
    entradas = TipoEntrada.query.filter_by(evento_id=evento_id).all()
    return jsonify([{
        'id': e.id,
        'nombre': e.nombre,
        'precio': e.precio,
        'cupos': e.cupos
    } for e in entradas]), 200
    
    # ========================
# RUTAS DE COMPRAS Y QR
# ========================
import uuid

@app.route('/compras', methods=['POST'])
def crear_compra():
    data = request.get_json()

    # Verificar que haya cupos disponibles
    entrada = TipoEntrada.query.get_or_404(data['tipo_entrada_id'])
    compras_realizadas = Compra.query.filter_by(tipo_entrada_id=entrada.id).count()

    if compras_realizadas >= entrada.cupos:
        return jsonify({'error': 'No hay cupos disponibles'}), 400

    # Generar código QR único
    codigo_qr = str(uuid.uuid4())

    nueva_compra = Compra(
        usuario_id=data['usuario_id'],
        tipo_entrada_id=data['tipo_entrada_id'],
        fecha_compra=datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        qr_codigo=codigo_qr,
        qr_usado=False
    )

    db.session.add(nueva_compra)
    db.session.commit()

    return jsonify({
        'mensaje': 'Compra realizada correctamente',
        'qr_codigo': codigo_qr,
        'compra_id': nueva_compra.id
    }), 201


@app.route('/validar-qr', methods=['POST'])
def validar_qr():
    data = request.get_json()

    compra = Compra.query.filter_by(qr_codigo=data['qr_codigo']).first()

    if not compra:
        return jsonify({'error': 'QR no válido'}), 404

    if compra.qr_usado:
        return jsonify({'error': 'QR ya utilizado'}), 400

    compra.qr_usado = True
    db.session.commit()

    return jsonify({'mensaje': 'Acceso permitido ✓', 'compra_id': compra.id}), 200

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        print("Base de datos creada ✓")
    app.run(debug=True)