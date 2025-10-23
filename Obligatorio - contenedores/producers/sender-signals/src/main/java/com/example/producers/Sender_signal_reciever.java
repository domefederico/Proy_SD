package com.example.producers;

import com.rabbitmq.client.Channel;
import com.rabbitmq.client.Connection;
import com.rabbitmq.client.ConnectionFactory;
import com.example.common.QueueNames;
import com.example.common.RabbitConfig;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Simulador de sensores de contenedores.
 * Envía el estado inicial de múltiples contenedores a la cola 'signals'.
 * Cada mensaje contiene: id, latitud, longitud y porcentaje de llenado.
 */
public class Sender_signal_reciever {

    /**
     * Clase interna para representar un contenedor
     */
    static class Container {
        int id;
        double latitud;
        double longitud;
        int porcentaje;

        Container(int id, double latitud, double longitud, int porcentaje) {
            this.id = id;
            this.latitud = latitud;
            this.longitud = longitud;
            this.porcentaje = porcentaje;
        }

        String toJSON() {
            JSONObject json = new JSONObject();
            json.put("id", id);
            json.put("latitud", latitud);
            json.put("longitud", longitud);
            json.put("porcentaje", porcentaje);
            return json.toString();
        }
    }

    /**
     * Genera un estado inicial de contenedores (algunos llenos, otros no)
     */
    private static List<Container> generarEstadoInicial() {
        List<Container> contenedores = new ArrayList<>();
        Random random = new Random();
        
        // Base de coordenadas: Montevideo, Uruguay
        double latitudBase = -34.9011;
        double longitudBase = -56.1645;
        
        // Generamos 15 contenedores distribuidos por la ciudad
        for (int i = 1; i <= 15; i++) {
            // Variación aleatoria en las coordenadas (aprox ±0.02 grados = ~2km)
            double latitud = latitudBase + (random.nextDouble() - 0.5) * 0.04;
            double longitud = longitudBase + (random.nextDouble() - 0.5) * 0.04;
            
            // Porcentajes variados: algunos llenos (>=75%), otros no
            int porcentaje;
            if (i <= 8) {
                // 8 contenedores llenos (75-95%)
                porcentaje = 75 + random.nextInt(21);
            } else {
                // 7 contenedores no llenos (20-70%)
                porcentaje = 20 + random.nextInt(51);
            }
            
            contenedores.add(new Container(i, latitud, longitud, porcentaje));
        }
        
        return contenedores;
    }

    public static void main(String[] argv) throws Exception {
        ConnectionFactory factory = RabbitConfig.createFactory();
        
        try (Connection connection = factory.newConnection();
            Channel channel = connection.createChannel()) {
            
            // Declaramos la cola de señales
            channel.queueDeclare(QueueNames.SIGNALS, false, false, false, null);
            
            // Generamos el estado inicial de contenedores
            List<Container> contenedores = generarEstadoInicial();
            
            System.out.println("═══════════════════════════════════════════════════════");
            System.out.println("  🚮 SIMULADOR DE SENSORES - Estado Inicial");
            System.out.println("═══════════════════════════════════════════════════════");
            
            // Enviamos cada contenedor como un mensaje separado
            for (Container contenedor : contenedores) {
                String message = contenedor.toJSON();
                channel.basicPublish("", QueueNames.SIGNALS, null, message.getBytes(StandardCharsets.UTF_8));
                
                String estado = contenedor.porcentaje >= 75 ? "🔴 LLENO" : "🟢 OK";
                System.out.printf("[✓] Contenedor %2d | %s | %3d%% | (%.4f, %.4f)%n",
                    contenedor.id, estado, contenedor.porcentaje, 
                    contenedor.latitud, contenedor.longitud);
            }
            
            System.out.println("═══════════════════════════════════════════════════════");
            System.out.printf("  📤 Total enviados: %d mensajes a cola '%s'%n", 
                contenedores.size(), QueueNames.SIGNALS);
            System.out.println("═══════════════════════════════════════════════════════");
        }
    }
}
