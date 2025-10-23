package com.example.producers;

import com.rabbitmq.client.Channel;
import com.rabbitmq.client.ConnectionFactory;
import com.example.common.QueueNames;
import com.example.common.RabbitConfig;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class ProviderFullContainers {

    public static void main(String[] argv) throws Exception {


        // --- 1. Configurar conexión a RabbitMQ ---
        ConnectionFactory factory = RabbitConfig.createFactory();

        try (com.rabbitmq.client.Connection connection = factory.newConnection();
            Channel channel = connection.createChannel()) {

            channel.queueDeclare(QueueNames.FULL_CONTAINERS, false, false, false, null);

            // --- 2. Conectarse a la base de datos ---
            String url = "jdbc:postgresql://db:5432/mi_base";
            String user = "postgres";
            String pass = "1234";

            try (Connection dbConnection = DriverManager.getConnection(url, user, pass);
                Statement stmt = dbConnection.createStatement()) {

                System.out.println("═══════════════════════════════════════════════════════");
                System.out.println("  🔍 PROVEEDOR DE CONTENEDORES LLENOS - Consultando BD");
                System.out.println("═══════════════════════════════════════════════════════");

                // --- 3. Ejecutar la consulta ---
                String query = "SELECT id, latitud, longitud, porcentaje FROM contenedores WHERE porcentaje >= 75 ORDER BY id";
                ResultSet rs = stmt.executeQuery(query);

                int count = 0;
                // --- 4. Publicar cada resultado en la cola ---
                while (rs.next()) {
                    int id = rs.getInt("id");
                    double latitud = rs.getDouble("latitud");
                    double longitud = rs.getDouble("longitud");
                    int porcentaje = rs.getInt("porcentaje");

                    // Crear mensaje JSON para el consumer Python
                    String message = String.format("{\"id\": %d, \"latitud\": %.6f, \"longitud\": %.6f, \"porcentaje\": %d}", 
                                            id, latitud, longitud, porcentaje);
                    channel.basicPublish("", QueueNames.FULL_CONTAINERS, null, message.getBytes("UTF-8"));
                    System.out.printf(" [✓] Contenedor %2d | 🔴 %3d%% | (%.4f, %.4f) - Publicado%n",
                        id, porcentaje, latitud, longitud);
                    count++;
                }

                System.out.println("═══════════════════════════════════════════════════════");
                System.out.printf("  📤 Total publicados: %d contenedores a cola '%s'%n", count, QueueNames.FULL_CONTAINERS);
                System.out.println("═══════════════════════════════════════════════════════");
            }
        }
    }
}

