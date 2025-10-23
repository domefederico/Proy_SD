import pika
import json

QUEUE_NAME = "containerstoclean"
RABBITMQ_HOST = "rabbitmq"
RABBITMQ_USER = "user"
RABBITMQ_PASS = "pass"

def callback(ch, method, properties, body):
    """
    Gestor de Conductores: Recibe la ruta óptima y la muestra al conductor.
    """
    message = body.decode("utf-8")
    try:
        route_data = json.loads(message)
        
        print("\n" + "═"*70)
        print("  🚛 NUEVA RUTA ÓPTIMA ASIGNADA AL CONDUCTOR")
        print("═"*70)
        print(f"  � Contenedores a recoger: {route_data['cantidad_contenedores']}")
        print(f"  ⏱️  Tiempo estimado: {route_data['tiempo_total_minutos']} minutos ({route_data['tiempo_total_segundos']} segundos)")
        print("─"*70)
        print("  📍 SECUENCIA DE RECOLECCIÓN:")
        print("─"*70)
        
        for idx, contenedor in enumerate(route_data['ruta'], 1):
            porcentaje = contenedor.get('porcentaje', '?')
            print(f"  {idx:2d}. Contenedor #{contenedor['id']:2d} | Llenado: {porcentaje}%")
            print(f"      📍 GPS: ({contenedor['latitud']:.6f}, {contenedor['longitud']:.6f})")
        
        print("═"*70)
        print("  ✅ Ruta confirmada. Iniciar recolección.")
        print("═"*70 + "\n")
        
    except json.JSONDecodeError:
        print(f"⚠️  Mensaje recibido (no JSON): {message}")
    except Exception as e:
        print(f"❌ Error procesando ruta: {e}")

def main():
    credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS)
    connection = pika.BlockingConnection(
        pika.ConnectionParameters(host=RABBITMQ_HOST, credentials=credentials)
    )
    channel = connection.channel()
    
    # Declarar la cola
    channel.queue_declare(queue=QUEUE_NAME, durable=False)
    channel.basic_consume(queue=QUEUE_NAME, on_message_callback=callback, auto_ack=True)

    print("═"*70)
    print("  🚛 GESTOR DE CONDUCTORES - Iniciado")
    print(f"  📥 Esperando rutas de la cola: {QUEUE_NAME}")
    print("  ℹ️  Presiona CTRL+C para salir")
    print("═"*70 + "\n")
    channel.start_consuming()

if __name__ == "__main__":
    main()
