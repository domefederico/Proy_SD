import pika
import json
import openrouteservice
import numpy as np
from ortools.constraint_solver import pywrapcp, routing_enums_pb2

QUEUE_NAME = "fullcontainers"
OUTPUT_QUEUE_NAME = "containerstoclean"
RABBITMQ_HOST = "rabbitmq"  # usa "localhost" si no estás en Docker
RABBITMQ_USER = "user"
RABBITMQ_PASS = "pass"
API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImQ5ODY2YmExYTMxZjQxNzlhMmQzMmJhOTE1NDRkYzM2IiwiaCI6Im11cm11cjY0In0="

# 📦 Almacén temporal de contenedores recibidos
ubicaciones = []

# Variable global para el canal de RabbitMQ (para publicar la ruta)
channel = None

# =============================
# FUNCIONES AUXILIARES
# =============================

def matriz_tiempo_ors(api_key, ubicaciones):
    client = openrouteservice.Client(key=api_key)
    coords = [(u["longitud"], u["latitud"]) for u in ubicaciones]
    res = client.distance_matrix(
        locations=coords,
        profile="driving-car",
        metrics=["duration"],
        validate=False
    )
    return np.array(res["durations"])

def ruta_optima(matriz_tiempo, punto_inicio=0):
    n = len(matriz_tiempo)
    manager = pywrapcp.RoutingIndexManager(n, 1, [punto_inicio], [n - 1])
    routing = pywrapcp.RoutingModel(manager)

    def tiempo_callback(from_index, to_index):
        return int(matriz_tiempo[manager.IndexToNode(from_index)][manager.IndexToNode(to_index)])

    transit_callback_index = routing.RegisterTransitCallback(tiempo_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC

    solution = routing.SolveWithParameters(search_parameters)
    if not solution:
        return None, None

    ruta = []
    index = routing.Start(0)
    while not routing.IsEnd(index):
        ruta.append(manager.IndexToNode(index))
        index = solution.Value(routing.NextVar(index))
    ruta.append(manager.IndexToNode(index))
    tiempo_total = solution.ObjectiveValue()
    return ruta, tiempo_total

# =============================
# CALLBACK PRINCIPAL
# =============================

def callback(ch, method, properties, body):
    global channel
    message = body.decode("utf-8")
    try:
        data = json.loads(message)
        # Si el id = -1 → ejecutar cálculo de ruta
        if data.get("id") == -1:
            if len(ubicaciones) < 2:
                print("⚠️  No hay suficientes ubicaciones para calcular una ruta.")
                return
            
            print("\n═══════════════════════════════════════════════════════")
            print("  🧭 CALCULANDO RUTA ÓPTIMA")
            print(f"  📦 Contenedores a visitar: {len(ubicaciones)}")
            print("═══════════════════════════════════════════════════════")
            
            try:
                matriz = matriz_tiempo_ors(API_KEY, ubicaciones)
                ruta, tiempo_total = ruta_optima(matriz)
                if ruta:
                    print("\n🗺️  RUTA ÓPTIMA CALCULADA:")
                    ruta_optimizada = []
                    for idx, i in enumerate(ruta, 1):
                        porcentaje = ubicaciones[i].get('porcentaje', '?')
                        print(f"  {idx}. Contenedor {ubicaciones[i]['id']:2d} | {porcentaje}% | ({ubicaciones[i]['latitud']:.4f}, {ubicaciones[i]['longitud']:.4f})")
                        ruta_optimizada.append({
                            "id": ubicaciones[i]['id'],
                            "latitud": ubicaciones[i]['latitud'],
                            "longitud": ubicaciones[i]['longitud'],
                            "porcentaje": porcentaje
                        })
                    print(f"\n⏱️  Tiempo total estimado: {tiempo_total/60:.2f} minutos")
                    
                    # Publicar la ruta óptima a la cola containerstoclean
                    route_message = {
                        "ruta": ruta_optimizada,
                        "tiempo_total_segundos": tiempo_total,
                        "tiempo_total_minutos": round(tiempo_total/60, 2),
                        "cantidad_contenedores": len(ruta_optimizada)
                    }
                    channel.basic_publish(
                        exchange='',
                        routing_key=OUTPUT_QUEUE_NAME,
                        body=json.dumps(route_message)
                    )
                    print(f"\n✅ Ruta publicada a cola '{OUTPUT_QUEUE_NAME}'")
                    print("═══════════════════════════════════════════════════════\n")
                    
                    # ✅ CAMBIO: Limpiar ubicaciones DESPUÉS de publicar para estar listos para el próximo flujo
                    ubicaciones.clear()
                    print("🔄 Listo para recibir nuevo flujo de contenedores\n")
                else:
                    print("❌ No se pudo resolver el problema de optimización.")
            except Exception as e:
                print(f"⚠️  Error al calcular la ruta: {e}")
        else:
            # Guardar el contenedor recibido
            porcentaje = data.get('porcentaje', '?')
            ubicaciones.append(data)
            print(f" [✓] Contenedor {data['id']:2d} | {porcentaje}% | ({data['latitud']:.4f}, {data['longitud']:.4f}) - Recibido")
    except json.JSONDecodeError:
        print(f"Mensaje recibido (no JSON): {message}")

# =============================
# FUNCIÓN PRINCIPAL
# =============================

def main():
    global channel
    credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS)
    connection = pika.BlockingConnection(
        pika.ConnectionParameters(host=RABBITMQ_HOST, credentials=credentials)
    )
    channel = connection.channel()
    
    # Declarar las colas: entrada y salida
    channel.queue_declare(queue=QUEUE_NAME, durable=False)
    channel.queue_declare(queue=OUTPUT_QUEUE_NAME, durable=False)
    
    channel.basic_consume(queue=QUEUE_NAME, on_message_callback=callback, auto_ack=True)

    print("═══════════════════════════════════════════════════════")
    print("  🧭 CALCULADOR DE RUTA ÓPTIMA - Iniciado")
    print(f"  📥 Consumiendo de cola: {QUEUE_NAME}")
    print(f"  📤 Publicando rutas a cola: {OUTPUT_QUEUE_NAME}")
    print("═══════════════════════════════════════════════════════")
    channel.start_consuming()

if __name__ == "__main__":
    main()
