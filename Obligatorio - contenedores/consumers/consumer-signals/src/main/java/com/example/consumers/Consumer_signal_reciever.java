package com.example.consumers;

import com.rabbitmq.client.Channel;
import com.rabbitmq.client.Connection;
import com.rabbitmq.client.ConnectionFactory;
import com.rabbitmq.client.DeliverCallback;
import com.example.common.QueueNames;
import com.example.common.RabbitConfig;
import org.json.JSONObject;

import java.sql.DriverManager;
import java.sql.PreparedStatement;

/**
 * Gestor de Contenedores: Consumer que recibe señales de sensores desde RabbitMQ
 * y actualiza el estado de los contenedores en la base de datos PostgreSQL.
 */
public class Consumer_signal_reciever {

    private static final String DB_URL = "jdbc:postgresql://db:5432/mi_base";
    private static final String DB_USER = "postgres";
    private static final String DB_PASS = "1234";

    public static void main(String[] argv) throws Exception {
        ConnectionFactory factory = RabbitConfig.createFactory();
        
        Connection connection = factory.newConnection();
        Channel channel = connection.createChannel();
        
        channel.queueDeclare(QueueNames.SIGNALS, false, false, false, null);
        
        System.out.println("═══════════════════════════════════════════════════════");
        System.out.println("  📦 GESTOR DE CONTENEDORES - Iniciado");
        System.out.println("  🔌 Conectado a: " + DB_URL);
        System.out.println("  📡 Escuchando cola: " + QueueNames.SIGNALS);
        System.out.println("═══════════════════════════════════════════════════════");

        DeliverCallback deliverCallback = (consumerTag, delivery) -> {
            String message = new String(delivery.getBody(), "UTF-8");
            
            try {
                // Parsear el mensaje JSON del sensor
                // Formato esperado: {"id": 1, "latitud": -34.9011, "longitud": -56.1645, "porcentaje": 85}
                JSONObject sensorData = new JSONObject(message);
                int containerId = sensorData.getInt("id");
                double latitud = sensorData.getDouble("latitud");
                double longitud = sensorData.getDouble("longitud");
                int porcentaje = sensorData.getInt("porcentaje");
                
                // Insertar o actualizar el contenedor en la base de datos
                // Si el ID existe, actualiza todos los campos (sobreescribe)
                try (java.sql.Connection dbConn = DriverManager.getConnection(DB_URL, DB_USER, DB_PASS);
                     PreparedStatement stmt = dbConn.prepareStatement(
                         "INSERT INTO contenedores (id, latitud, longitud, porcentaje) " +
                         "VALUES (?, ?, ?, ?) " +
                         "ON CONFLICT (id) DO UPDATE SET " +
                         "latitud = EXCLUDED.latitud, " +
                         "longitud = EXCLUDED.longitud, " +
                         "porcentaje = EXCLUDED.porcentaje")) {
                    
                    stmt.setInt(1, containerId);
                    stmt.setDouble(2, latitud);
                    stmt.setDouble(3, longitud);
                    stmt.setInt(4, porcentaje);
                    stmt.executeUpdate();
                    
                    String estado = porcentaje >= 75 ? "🔴 LLENO" : "🟢 OK";
                    System.out.printf(" [✓] Contenedor %2d | %s | %3d%% | (%.4f, %.4f) - Guardado en BD%n",
                        containerId, estado, porcentaje, latitud, longitud);
                }
            } catch (Exception e) {
                System.err.println(" [✗] Error procesando señal: " + e.getMessage());
                e.printStackTrace();
            }
        };
        
        channel.basicConsume(QueueNames.SIGNALS, true, deliverCallback, consumerTag -> { });
    }
}
