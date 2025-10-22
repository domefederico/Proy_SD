
import com.rabbitmq.client.Channel;
import com.rabbitmq.client.Connection;
import com.rabbitmq.client.ConnectionFactory;

import java.sql.Connection as SQLConnection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class ProviderFullContainers {

    private final static String QUEUE_NAME = "fullContainers";

    public static void main(String[] argv) throws Exception {

        // --- 1. Configurar conexión a RabbitMQ ---
        ConnectionFactory factory = new ConnectionFactory();
        factory.setHost("rabbitmq"); // o "localhost" si corrés sin Docker

        try (Connection connection = factory.newConnection();
             Channel channel = connection.createChannel()) {

            channel.queueDeclare(QUEUE_NAME, false, false, false, null);

            // --- 2. Conectarse a la base de datos ---
            String url = "jdbc:postgresql://db:5432/mi_base";
            String user = "root";
            String pass = "1234";

            try (SQLConnection dbConnection = DriverManager.getConnection(url, user, pass);
                 Statement stmt = dbConnection.createStatement()) {

                // --- 3. Ejecutar la consulta ---
                String query = "SELECT id, latitud, longitud FROM contenedores WHERE porcentaje >= 75 ";
                ResultSet rs = stmt.executeQuery(query);

                // --- 4. Publicar cada resultado en la cola ---
                while (rs.next()) {
                    int id = rs.getInt("id");
                    int latitud = rs.getInt("latitud");
                    int longitud = rs.getInt("longitud")

                    String message = String.format(id, " ", latitud, " ", longitud);
                    channel.basicPublish("", QUEUE_NAME, null, message.getBytes("UTF-8"));
                    System.out.println(" [x] Sent '" + message + "'");
                }

                System.out.println(" [✔] Finalizado: todos los contenedores publicados.");
            }
        }
    }
}

