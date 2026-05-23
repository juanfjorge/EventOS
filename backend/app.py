from dotenv import load_dotenv
import os
import uuid
import io
import base64
import hashlib
from datetime import datetime

load_dotenv()

from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_mail import Mail, Message
import mercadopago

app = Flask(__name__)

# Configuración CORS
CORS(app, resources={r"/*": {"origins": "*"}})

# Configuración base de datos
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///eventos.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Configuración email
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')

db = SQLAlchemy(app)
mail = Mail(app)
sdk = mercadopago.SDK(os.environ.get("MP_ACCESS_TOKEN"))

# ========================
# MODELOS
# ========================

class Usuario(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    rol = db.Column(db.String(20), default='cliente')

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
    nombre = db.Column(db.String(50), nullable=False)
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
# RUTAS
# ========================

@app.route('/')
def index():
    return {'mensaje': 'EventOS API funcionando ✓'}

@app.route('/registro', methods=['POST'])
def registro():
    data = request.get_json()
    if Usuario.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'El email ya está registrado'}), 400
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
    usuario = Usuario.query.filter_by(email=data['email'], password=password_hash).first()
    if not usuario:
        return jsonify({'error': 'Email o contraseña incorrectos'}), 401
    return jsonify({
        'mensaje': 'Login exitoso',
        'usuario': {'id': usuario.id, 'nombre': usuario.nombre, 'email': usuario.email, 'rol': usuario.rol}
    }), 200

@app.route('/eventos', methods=['GET'])
def listar_eventos():
    eventos = Evento.query.all()
    return jsonify([{'id': e.id, 'nombre': e.nombre, 'fecha': e.fecha, 'lugar': e.lugar, 'capacidad': e.capacidad, 'descripcion': e.descripcion} for e in eventos]), 200

@app.route('/eventos', methods=['POST'])
def crear_evento():
    data = request.get_json()
    nuevo_evento = Evento(nombre=data['nombre'], fecha=data['fecha'], lugar=data['lugar'], capacidad=data['capacidad'], descripcion=data.get('descripcion', ''))
    db.session.add(nuevo_evento)
    db.session.commit()
    return jsonify({'mensaje': 'Evento creado correctamente', 'id': nuevo_evento.id}), 201

@app.route('/eventos/<int:id>', methods=['GET'])
def obtener_evento(id):
    evento = Evento.query.get_or_404(id)
    return jsonify({'id': evento.id, 'nombre': evento.nombre, 'fecha': evento.fecha, 'lugar': evento.lugar, 'capacidad': evento.capacidad, 'descripcion': evento.descripcion}), 200

@app.route('/eventos/<int:id>', methods=['DELETE'])
def eliminar_evento(id):
    evento = Evento.query.get_or_404(id)
    db.session.delete(evento)
    db.session.commit()
    return jsonify({'mensaje': 'Evento eliminado correctamente'}), 200

@app.route('/entradas', methods=['POST'])
def crear_entrada():
    data = request.get_json()
    nueva_entrada = TipoEntrada(evento_id=data['evento_id'], nombre=data['nombre'], precio=data['precio'], cupos=data['cupos'])
    db.session.add(nueva_entrada)
    db.session.commit()
    return jsonify({'mensaje': 'Tipo de entrada creado correctamente', 'id': nueva_entrada.id}), 201

@app.route('/entradas/<int:evento_id>', methods=['GET'])
def listar_entradas(evento_id):
    entradas = TipoEntrada.query.filter_by(evento_id=evento_id).all()
    return jsonify([{'id': e.id, 'nombre': e.nombre, 'precio': e.precio, 'cupos': e.cupos} for e in entradas]), 200

@app.route('/compras', methods=['POST'])
def crear_compra():
    data = request.get_json()
    entrada = TipoEntrada.query.get_or_404(data['tipo_entrada_id'])
    evento = Evento.query.get_or_404(entrada.evento_id)
    usuario = Usuario.query.get_or_404(data['usuario_id'])
    compras_realizadas = Compra.query.filter_by(tipo_entrada_id=entrada.id).count()
    if compras_realizadas >= entrada.cupos:
        return jsonify({'error': 'No hay cupos disponibles'}), 400
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

    import qrcode
    qr = qrcode.make(codigo_qr)
    buffer = io.BytesIO()
    qr.save(buffer, format='PNG')
    buffer.seek(0)

    try:
        msg = Message(
            subject=f"Tu entrada para {evento.nombre} 🎉",
            sender=os.environ.get('MAIL_USERNAME'),
            recipients=[usuario.email]
        )
        msg.body = f"Hola {usuario.nombre}!\n\nTu compra fue exitosa.\n\nEvento: {evento.nombre}\nFecha: {evento.fecha}\nLugar: {evento.lugar}\nTipo de entrada: {entrada.nombre}\n\nPresentá el QR adjunto en la puerta del evento.\n\nNos vemos ahí! 🎉\nEventOS"
        msg.attach("qr_entrada.png", "image/png", buffer.getvalue())
        mail.send(msg)
    except Exception as e:
        print("Error al enviar email:", e)

    return jsonify({'mensaje': 'Compra realizada correctamente', 'qr_codigo': codigo_qr, 'compra_id': nueva_compra.id}), 201

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

@app.route('/qr/<codigo>', methods=['GET'])
def generar_qr(codigo):
    import qrcode
    qr = qrcode.make(codigo)
    buffer = io.BytesIO()
    qr.save(buffer, format='PNG')
    buffer.seek(0)
    img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    return jsonify({'imagen': f'data:image/png;base64,{img_base64}'})

@app.route('/estadisticas/<int:evento_id>', methods=['GET'])
def estadisticas(evento_id):
    evento = Evento.query.get_or_404(evento_id)
    entradas = TipoEntrada.query.filter_by(evento_id=evento_id).all()
    total_compras = 0
    total_recaudado = 0
    total_accesos = 0
    detalle = []
    for entrada in entradas:
        compras = Compra.query.filter_by(tipo_entrada_id=entrada.id).all()
        cantidad = len(compras)
        accesos = sum(1 for c in compras if c.qr_usado)
        recaudado = cantidad * entrada.precio
        total_compras += cantidad
        total_recaudado += recaudado
        total_accesos += accesos
        detalle.append({'tipo': entrada.nombre, 'precio': entrada.precio, 'cupos': entrada.cupos, 'vendidas': cantidad, 'accesos': accesos, 'recaudado': recaudado})
    return jsonify({'evento': evento.nombre, 'total_compras': total_compras, 'total_recaudado': total_recaudado, 'total_accesos': total_accesos, 'detalle': detalle}), 200

@app.route('/crear-pago', methods=['POST'])
def crear_pago():
    data = request.get_json()
    tipo_entrada = TipoEntrada.query.get_or_404(data['tipo_entrada_id'])
    evento = Evento.query.get_or_404(tipo_entrada.evento_id)

    preference_data = {
        "items": [{"title": f"{evento.nombre} - {tipo_entrada.nombre}", "quantity": 1, "unit_price": float(tipo_entrada.precio)}],
        "external_reference": f"{data['usuario_id']}-{data['tipo_entrada_id']}",
        "back_urls": {
            "success": f"https://event-os-beta.vercel.app/?usuario_id={data['usuario_id']}&tipo_entrada_id={data['tipo_entrada_id']}",
            "failure": "https://event-os-beta.vercel.app",
            "pending": "https://event-os-beta.vercel.app"
        },
        "auto_return": "approved",
        "notification_url": "https://eventos-production-24eb.up.railway.app/webhook"
    }

    preference_response = sdk.preference().create(preference_data)
    preference = preference_response["response"]

    if "init_point" not in preference:
        return jsonify({"error": "Error de MercadoPago", "detalle": preference}), 500

    return jsonify({"init_point": preference["init_point"], "preference_id": preference["id"]}), 200

@app.route('/webhook', methods=['POST'])
def webhook():
    data = request.get_json()
    print("WEBHOOK RECIBIDO:", data)

    if data and data.get('type') == 'payment':
        payment_id = data['data']['id']
        payment = sdk.payment().get(payment_id)
        payment_info = payment["response"]

        if payment_info['status'] == 'approved':
            external_reference = payment_info.get('external_reference')
            if external_reference:
                usuario_id, tipo_entrada_id = external_reference.split('-')
                entrada = TipoEntrada.query.get(int(tipo_entrada_id))
                usuario = Usuario.query.get(int(usuario_id))

                if entrada and usuario:
                    codigo_qr = str(uuid.uuid4())
                    nueva_compra = Compra(
                        usuario_id=int(usuario_id),
                        tipo_entrada_id=int(tipo_entrada_id),
                        fecha_compra=datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                        qr_codigo=codigo_qr,
                        qr_usado=False
                    )
                    db.session.add(nueva_compra)
                    db.session.commit()

                    import qrcode
                    qr = qrcode.make(codigo_qr)
                    buffer = io.BytesIO()
                    qr.save(buffer, format='PNG')
                    buffer.seek(0)

                    try:
                        msg = Message(
                            subject=f"Tu entrada para {entrada.evento.nombre} 🎉",
                            sender=os.environ.get('MAIL_USERNAME'),
                            recipients=[usuario.email]
                        )
                        msg.body = f"Hola {usuario.nombre}!\n\nTu pago fue aprobado.\n\nPresentá el QR adjunto en la puerta.\n\nEventOS"
                        msg.attach("qr_entrada.png", "image/png", buffer.getvalue())
                        mail.send(msg)
                    except Exception as e:
                        print("Error al enviar email:", e)

    return jsonify({'status': 'ok'}), 200

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        print("Base de datos creada ✓")
app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))