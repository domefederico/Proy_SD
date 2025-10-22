import pika
import json
import openrouteservice
import numpy as np
from ortools.constraint_solver import pywrapcp, routing_enums_pb2

QUEUE_NAME = "fullContainers"
RABBITMQ_HOST = "rabbitmq"  # usa "localhost" si no estás en Docker
API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImQ5ODY2YmExYTMxZjQxNzlhMmQzMmJhOTE1NDRkYzM2IiwiaCI6Im11cm11cjY0In0="

# 📦 Almacén temporal de contenedores recibidos
ubicaciones = []

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
    message = body.decode("utf-8")
    try:
        data = json.loads(message)
        # Si el id = -1 → ejecutar cálculo de ruta
        if data.get("id") == -1:
            if len(ubicaciones) < 2:
                print("⚠️ No hay suficientes ubicaciones para calcular una ruta.")
                return
            print("\n🧭 Calculando ruta óptima...")
            try:
                matriz = matriz_tiempo_ors(API_KEY, ubicaciones)
                ruta, tiempo_total = ruta_optima(matriz)
                if ruta:
                    print("\n🗺️ Ruta óptima calculada:")
                    for i in ruta:
                        print(f"→ ID: {ubicaciones[i]['id']}")
                    print(f"\n⏱️ Tiempo total estimado: {tiempo_total/60:.2f} minutos\n")
                else:
                    print("❌ No se pudo resolver el TSP.")
            except Exception as e:
                print(f"⚠️ Error al calcular la ruta: {e}")
        else:
            # Guardar el contenedor recibido
            ubicaciones.append(data)
            print(f"📦 Contenedor recibido -> ID: {data['id']}, "
                  f"Latitud: {data['latitud']}, Longitud: {data['longitud']}")
    except json.JSONDecodeError:
        print(f"Mensaje recibido (no JSON): {message}")

# =============================
# FUNCIÓN PRINCIPAL
# =============================

def main():
    connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
    channel = connection.channel()
    channel.queue_declare(queue=QUEUE_NAME, durable=False)
    channel.basic_consume(queue=QUEUE_NAME, on_message_callback=callback, auto_ack=True)

    print(f" [*] Esperando mensajes en '{QUEUE_NAME}'. Presiona CTRL+C para salir.")
    channel.start_consuming()

if __name__ == "__main__":
    main()
