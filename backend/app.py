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

def enviar_email_entrada(usuario, evento, entrada, codigo_qr):
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
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{
                    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background-color: #0d1117;
                    color: #e8edf5;
                    margin: 0;
                    padding: 0;
                    -webkit-font-smoothing: antialiased;
                }}
                .email-container {{
                    max-width: 500px;
                    margin: 20px auto;
                    background-color: #141c27;
                    border: 1px solid rgba(4,138,129,0.25);
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                }}
                .header {{
                    text-align: center;
                    padding: 30px 20px 20px;
                    background: linear-gradient(180deg, rgba(4,138,129,0.1) 0%, transparent 100%);
                }}
                .logo-img {{
                    width: 70px;
                    height: 70px;
                    border-radius: 14px;
                    border: 1px solid rgba(4,138,129,0.3);
                }}
                .content {{
                    padding: 0 30px 30px;
                }}
                h1 {{
                    font-family: 'Playfair Display', Georgia, serif;
                    font-size: 22px;
                    font-weight: 900;
                    margin-top: 15px;
                    margin-bottom: 5px;
                    color: #e8edf5;
                    text-align: center;
                }}
                .subtitle {{
                    color: #8899aa;
                    font-size: 14px;
                    text-align: center;
                    margin-bottom: 25px;
                }}
                .ticket-details {{
                    background-color: #1b2537;
                    border-radius: 12px;
                    border: 1px solid rgba(4,138,129,0.15);
                    padding: 20px;
                    margin-bottom: 25px;
                }}
                .detail-row {{
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid rgba(4,138,129,0.1);
                    font-size: 14px;
                }}
                .detail-row:last-child {{
                    border-bottom: none;
                    padding-bottom: 0;
                }}
                .detail-row:first-child {{
                    padding-top: 0;
                }}
                .label {{
                    color: #8899aa;
                }}
                .value {{
                    color: #e8edf5;
                    font-weight: 600;
                    text-align: right;
                }}
                .qr-container {{
                    text-align: center;
                    margin: 30px 0 15px;
                }}
                .qr-box {{
                    background-color: white;
                    padding: 16px;
                    border-radius: 16px;
                    display: inline-block;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.25);
                }}
                .qr-img {{
                    width: 180px;
                    height: 180px;
                    display: block;
                }}
                .qr-instructions {{
                    color: #8899aa;
                    font-size: 12px;
                    text-align: center;
                    margin-top: 10px;
                    line-height: 1.5;
                }}
                .footer {{
                    text-align: center;
                    padding: 20px;
                    background-color: #0d1117;
                    border-top: 1px solid rgba(4,138,129,0.15);
                    font-size: 11px;
                    color: #8899aa;
                }}
                .highlight {{
                    color: #05b8ad;
                }}
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                    <img src="cid:logo_e" class="logo-img" alt="EventOS Logo" />
                    <h1>¡Tu entrada está lista! 🎉</h1>
                    <div class="subtitle">Gracias por tu compra en <span class="highlight">EventOS</span></div>
                </div>
                <div class="content">
                    <div class="ticket-details">
                        <div class="detail-row">
                            <span class="label">Comprador</span>
                            <span class="value">{usuario.nombre}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Evento</span>
                            <span class="value">{evento.nombre}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Fecha</span>
                            <span class="value">{evento.fecha}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Lugar</span>
                            <span class="value">{evento.lugar}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Entrada</span>
                            <span class="value">{entrada.nombre}</span>
                        </div>
                    </div>
                    
                    <div class="qr-container">
                        <div class="qr-box">
                            <img src="cid:qr_entrada" class="qr-img" alt="Código QR" />
                        </div>
                        <div class="qr-instructions">
                            Presentá este código QR en la puerta del evento.<br/>
                            <strong>No es necesario imprimirlo.</strong>
                        </div>
                    </div>
                </div>
                <div class="footer">
                    © 2026 EventOS. Todos los derechos reservados.<br/>
                    Hecho con ❤️ en Mendoza, Argentina.
                </div>
            </div>
        </body>
        </html>
        """
        
        msg.html = html_content
        
        # Attach QR code inline
        msg.attach("qr_entrada.png", "image/png", buffer.getvalue(), headers={"Content-ID": "<qr_entrada>", "Content-Disposition": "inline"})
        
        # Attach logo inline
        logo_path = os.path.join(app.root_path, "logo_e.png")
        if os.path.exists(logo_path):
            with open(logo_path, "rb") as f:
                logo_data = f.read()
            msg.attach("logo_e.png", "image/png", logo_data, headers={"Content-ID": "<logo_e>", "Content-Disposition": "inline"})
            
        mail.send(msg)
        print("Email enviado correctamente")
    except Exception as e:
        import traceback
        print("Error al enviar email:", str(e))
        traceback.print_exc()

def enviar_email_entradas(usuario, evento, entradas_compradas):
    try:
        msg = Message(
            subject=f"Tus entradas para {evento.nombre} - EventOS",
            sender=app.config['MAIL_USERNAME'],
            recipients=[usuario.email]
        )
        
        # Generar bloques de tickets HTML
        tickets_html = ""
        for i, item in enumerate(entradas_compradas):
            tipo = item['tipo']
            qr = item['qr']
            tickets_html += f"""
            <div style="background: rgba(4,138,129,0.05); padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid rgba(4,138,129,0.2);">
                <h3 style="margin-top: 0; color: #05b8ad;">Entrada {i + 1}: {tipo.nombre}</h3>
                <div class="detail-row"><span class="label">Precio</span><span class="value">${tipo.precio}</span></div>
                <div class="qr-container" style="margin-top: 15px;">
                    <div class="qr-box">
                        <img src="cid:qr_entrada_{i}" class="qr-img" alt="Código QR" />
                    </div>
                    <div class="qr-instructions" style="margin-top: 10px;">
                        Código: {qr}
                    </div>
                </div>
            </div>
            """

        html_content = f"""
        <html>
        <head>
            <style>
                body {{
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    background-color: #06090f;
                    margin: 0;
                    padding: 0;
                    color: #e6edf3;
                }}
                .email-container {{
                    max-width: 600px;
                    margin: 40px auto;
                    background-color: #0d1117;
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                }}
                .header {{
                    background: linear-gradient(135deg, rgba(4,138,129,0.1) 0%, rgba(13,17,23,0) 100%);
                    padding: 40px 30px;
                    text-align: center;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                }}
                .logo-img {{
                    max-height: 40px;
                    margin-bottom: 20px;
                }}
                h1 {{
                    font-family: 'Playfair Display', Georgia, serif;
                    margin: 0 0 10px 0;
                    font-size: 28px;
                    font-weight: 600;
                    color: #ffffff;
                }}
                .subtitle {{
                    color: #8899aa;
                    font-size: 15px;
                }}
                .content {{
                    padding: 40px 30px;
                }}
                .detail-row {{
                    display: flex;
                    justify-content: space-between;
                    padding: 12px 0;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                }}
                .detail-row:last-child {{
                    border-bottom: none;
                }}
                .label {{
                    color: #8899aa;
                    font-size: 14px;
                }}
                .value {{
                    font-weight: 600;
                    color: #ffffff;
                    text-align: right;
                }}
                .qr-container {{
                    text-align: center;
                }}
                .qr-box {{
                    background-color: #ffffff;
                    padding: 15px;
                    border-radius: 12px;
                    display: inline-block;
                }}
                .qr-img {{
                    width: 180px;
                    height: 180px;
                    display: block;
                }}
                .qr-instructions {{
                    color: #8899aa;
                    font-size: 13px;
                    line-height: 1.5;
                }}
                .footer {{
                    text-align: center;
                    padding: 20px;
                    background-color: #0d1117;
                    border-top: 1px solid rgba(4,138,129,0.15);
                    font-size: 11px;
                    color: #8899aa;
                }}
                .highlight {{
                    color: #05b8ad;
                }}
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                    <img src="cid:logo_e" class="logo-img" alt="EventOS Logo" />
                    <h1>¡Tus entradas están listas! 🎉</h1>
                    <div class="subtitle">Gracias por tu compra en <span class="highlight">EventOS</span></div>
                </div>
                <div class="content">
                    <div style="margin-bottom: 30px;">
                        <div class="detail-row"><span class="label">Comprador</span><span class="value">{usuario.nombre}</span></div>
                        <div class="detail-row"><span class="label">Evento</span><span class="value">{evento.nombre}</span></div>
                        <div class="detail-row"><span class="label">Fecha</span><span class="value">{evento.fecha}</span></div>
                        <div class="detail-row"><span class="label">Lugar</span><span class="value">{evento.lugar}</span></div>
                    </div>
                    
                    {tickets_html}
                    
                    <div style="text-align: center; color: #8899aa; font-size: 13px; margin-top: 20px;">
                        Presentá estos códigos QR en la puerta del evento.<br/>
                        <strong>No es necesario imprimirlos.</strong>
                    </div>
                </div>
                <div class="footer">
                    © 2026 EventOS. Todos los derechos reservados.<br/>
                    Hecho con ❤️ en Mendoza, Argentina.
                </div>
            </div>
        </body>
        </html>
        """
        
        msg.html = html_content
        
        import qrcode
        from io import BytesIO
        
        # Generar adjuntos de QRs
        for i, item in enumerate(entradas_compradas):
            qr_img = qrcode.make(item['qr'])
            buffer = BytesIO()
            qr_img.save(buffer, format="PNG")
            msg.attach(f"qr_entrada_{i}.png", "image/png", buffer.getvalue(), headers={"Content-ID": f"<qr_entrada_{i}>", "Content-Disposition": "inline"})
        
        # Attach logo inline
        logo_path = os.path.join(app.root_path, "logo_e.png")
        if os.path.exists(logo_path):
            with open(logo_path, "rb") as f:
                logo_data = f.read()
            msg.attach("logo_e.png", "image/png", logo_data, headers={"Content-ID": "<logo_e>", "Content-Disposition": "inline"})
            
        mail.send(msg)
        print("Email múltiple enviado correctamente")
    except Exception as e:
        import traceback
        print("Error al enviar email múltiple:", str(e))
        traceback.print_exc()


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
def get_entradas(evento_id):
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

    enviar_email_entrada(usuario, evento, entrada, codigo_qr)

    return jsonify({'mensaje': 'Compra realizada correctamente', 'qr_codigo': codigo_qr, 'compra_id': nueva_compra.id}), 201

@app.route('/mis-entradas/<int:usuario_id>', methods=['GET'])
def mis_entradas(usuario_id):
    compras = Compra.query.filter_by(usuario_id=usuario_id).all()
    resultado = []
    for c in compras:
        entrada = TipoEntrada.query.get(c.tipo_entrada_id)
        if entrada:
            evento = Evento.query.get(entrada.evento_id)
            resultado.append({
                'compra_id': c.id,
                'fecha_compra': c.fecha_compra,
                'qr_codigo': c.qr_codigo,
                'qr_usado': c.qr_usado,
                'evento_nombre': evento.nombre if evento else 'Evento desconocido',
                'evento_fecha': evento.fecha if evento else '',
                'evento_lugar': evento.lugar if evento else '',
                'tipo_entrada': entrada.nombre,
                'precio': entrada.precio
            })
    return jsonify(resultado), 200

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

@app.route('/procesar-pago-brick', methods=['POST'])
def procesar_pago_brick():
    data = request.get_json()
    print("DATOS RECIBIDOS EN PROCESAR PAGO:", data, flush=True)
    carrito = data.get('carrito', [])
    usuario_id = data.get('usuario_id')
    usuario = Usuario.query.get_or_404(usuario_id)

    if not carrito:
        print("ERROR: Carrito vacío", flush=True)
        return jsonify({'error': 'Carrito vacío'}), 400

    total_amount = 0
    entradas_a_comprar = []
    
    evento = None
    for item in carrito:
        tipo_id = item.get('tipo_entrada_id')
        cantidad = int(item.get('cantidad', 1))
        tipo_entrada = TipoEntrada.query.get_or_404(tipo_id)
        if not evento:
            evento = Evento.query.get(tipo_entrada.evento_id)
        
        compras_realizadas = Compra.query.filter_by(tipo_entrada_id=tipo_entrada.id).count()
        print(f"Tipo Entrada: {tipo_entrada.nombre}, Cupos: {tipo_entrada.cupos}, Realizadas: {compras_realizadas}, A comprar: {cantidad}", flush=True)
        if compras_realizadas + cantidad > tipo_entrada.cupos:
            print(f"ERROR: Cupos insuficientes para {tipo_entrada.nombre}", flush=True)
            return jsonify({'error': f'No hay suficientes cupos para {tipo_entrada.nombre}'}), 400
        
        total_amount += tipo_entrada.precio * cantidad
        entradas_a_comprar.append((tipo_entrada, cantidad))

    payment_data = {
        "transaction_amount": float(total_amount),
        "token": data.get("token"),
        "description": f"Compra de entradas múltiples - EventOS",
        "installments": int(data.get("installments", 1)),
        "payment_method_id": data.get("payment_method_id"),
        "issuer_id": data.get("issuer_id"),
        "payer": {
            "email": data.get("payer", {}).get("email", usuario.email),
            "identification": {
                "type": data.get("payer", {}).get("identification", {}).get("type"),
                "number": data.get("payer", {}).get("identification", {}).get("number")
            }
        }
    }

    try:
        payment_response = sdk.payment().create(payment_data)
        print("MERCADOPAGO PAYMENT RESPONSE:", payment_response, flush=True)
        payment = payment_response.get("response", {})
        status = payment.get("status")
        
        if status == "approved":
            qr_codigos = []
            entradas_compradas = []
            for tipo_entrada, cantidad in entradas_a_comprar:
                for _ in range(cantidad):
                    codigo_qr = str(uuid.uuid4())
                    qr_codigos.append(codigo_qr)
                    entradas_compradas.append({'tipo': tipo_entrada, 'qr': codigo_qr})
                    nueva_compra = Compra(
                        usuario_id=usuario_id,
                        tipo_entrada_id=tipo_entrada.id,
                        fecha_compra=datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                        qr_codigo=codigo_qr,
                        qr_usado=False
                    )
                    db.session.add(nueva_compra)
            db.session.commit()
            
            enviar_email_entradas(usuario, evento, entradas_compradas)
            return jsonify({"status": status, "qr_codigos": qr_codigos}), 201
        else:
            return jsonify({"status": status, "message": payment.get("status_detail")}), 400
    except Exception as e:
        print("Error processing payment:", str(e), flush=True)
        return jsonify({"error": "Error interno del servidor"}), 500

@app.route('/generar-ticket', methods=['POST'])
def generar_ticket():
    data = request.get_json()
    tipo_entrada = TipoEntrada.query.get_or_404(data['tipo_entrada_id'])
    evento = Evento.query.get_or_404(tipo_entrada.evento_id)

    preference_data = {
        "items": [{"title": f"{evento.nombre} - {tipo_entrada.nombre}", "quantity": 1, "unit_price": float(tipo_entrada.precio)}],
        "external_reference": f"{data['usuario_id']}-{data['tipo_entrada_id']}",
        "back_urls": {
            "success": f"http://localhost:3000/?usuario_id={data['usuario_id']}&tipo_entrada_id={data['tipo_entrada_id']}&evento_id={tipo_entrada.evento_id}",
            "failure": "http://localhost:3000",
            "pending": "http://localhost:3000"
        },
        # "auto_return": "approved", # Comentado porque MP no permite localhost con auto_return
        "notification_url": "https://eventos-production-24eb.up.railway.app/webhook"
    }

    try:
        preference_response = sdk.preference().create(preference_data)
        print("MERCADOPAGO RESPONSE:", preference_response, flush=True)
        preference = preference_response.get("response", {})

        if "init_point" not in preference:
            print("init_point not found in preference!", flush=True)
            # Fallback local para simular pago exitoso si MP bloquea la cuenta
            mock_url = f"http://localhost:3000/?usuario_id={data['usuario_id']}&tipo_entrada_id={data['tipo_entrada_id']}&evento_id={tipo_entrada.evento_id}&status=approved"
            return jsonify({"init_point": mock_url, "preference_id": "mock_id"}), 200

        return jsonify({"init_point": preference["init_point"], "preference_id": preference["id"]}), 200
    except Exception as e:
        print("EXCEPTION IN MERCADOPAGO CREATION:", str(e), flush=True)
        import traceback
        traceback.print_exc()
        mock_url = f"http://localhost:3000/?usuario_id={data['usuario_id']}&tipo_entrada_id={data['tipo_entrada_id']}&evento_id={tipo_entrada.evento_id}&status=approved"
        return jsonify({"init_point": mock_url, "preference_id": "mock_id"}), 200

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
                    evento = Evento.query.get(entrada.evento_id)
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

                    enviar_email_entrada(usuario, evento, entrada, codigo_qr)

    return jsonify({'status': 'ok'}), 200

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        print("Base de datos creada ok")
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))