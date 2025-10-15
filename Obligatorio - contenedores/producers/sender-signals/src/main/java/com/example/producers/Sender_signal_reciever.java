package com.example.producers;

import com.rabbitmq.client.Channel;
import com.rabbitmq.client.Connection;
import com.rabbitmq.client.ConnectionFactory;
import com.example.common.QueueNames;
import com.example.common.RabbitConfig;
import java.nio.charset.StandardCharsets;

/**
 * Producer que envía señales a RabbitMQ.
 * Este productor envía un mensaje a la cola de señales y luego cierra la conexión.
 */
public class Sender_signal_reciever {

    public static void main(String[] argv) throws Exception {
        // Usamos la configuración centralizada de RabbitConfig
        // Esto asegura que usemos el host correcto ("rabbitmq") y las credenciales apropiadas
        ConnectionFactory factory = RabbitConfig.createFactory();
        
        // Usamos try-with-resources para asegurar que la conexión se cierre automáticamente
        // Esto es apropiado para un producer que envía un mensaje y termina
        try (Connection connection = factory.newConnection();
             Channel channel = connection.createChannel()) {
            
            // Declaramos la cola de forma idempotente
            // Esto asegura que la cola exista antes de enviar el mensaje
            // IMPORTANTE: Usamos QueueNames.SIGNALS para consistencia con el resto del proyecto
            channel.queueDeclare(QueueNames.SIGNALS, false, false, false, null);
            
            // Creamos el mensaje con timestamp para identificar cuándo fue enviado
            String message = "Señal enviada a las " + System.currentTimeMillis();
            
            // Publicamos el mensaje a la cola
            // Parámetros: exchange="" (default exchange), routingKey=nombre de la cola,
            //             props=null (sin propiedades especiales), body=mensaje en bytes
            channel.basicPublish("", QueueNames.SIGNALS, null, message.getBytes(StandardCharsets.UTF_8));
            
            System.out.println(" [x] Enviado '" + message + "'");
            
            // La conexión se cierra automáticamente al salir del try-with-resources
        }
    }
}
