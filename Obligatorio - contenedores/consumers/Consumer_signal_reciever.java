package com.example.consumers;

import com.rabbitmq.client.Channel;
import com.rabbitmq.client.Connection;
import com.rabbitmq.client.ConnectionFactory;
import com.rabbitmq.client.DeliverCallback;
import com.example.common.QueueNames;
import com.example.common.RabbitConfig;

/**
 * Consumer que recibe señales desde RabbitMQ.
 * Este consumidor escucha continuamente la cola de señales y procesa mensajes entrantes.
 */
public class Consumer_signal_reciever {

    public static void main(String[] argv) throws Exception {
        // Usamos la configuración centralizada de RabbitConfig para conectarnos
        // Esto asegura que todos los servicios usen la misma configuración (host, credenciales, etc.)
        ConnectionFactory factory = RabbitConfig.createFactory();
        
        // Creamos la conexión y el canal
        // NOTA: No usamos try-with-resources aquí porque necesitamos mantener la conexión abierta
        // para seguir recibiendo mensajes continuamente
        Connection connection = factory.newConnection();
        Channel channel = connection.createChannel();
        
        // Declaramos la cola de forma idempotente (si ya existe, no hace nada)
        // Parámetros: nombre, durable=false, exclusive=false, autoDelete=false, arguments=null
        // IMPORTANTE: Usamos QueueNames.SIGNALS para mantener consistencia en todo el proyecto
        channel.queueDeclare(QueueNames.SIGNALS, false, false, false, null);
        
        System.out.println(" [*] Esperando por mensajes. Para salir presione CTRL+C");

        // Definimos el callback que se ejecutará cada vez que llegue un mensaje
        DeliverCallback deliverCallback = (consumerTag, delivery) -> {
            String message = new String(delivery.getBody(), "UTF-8");
            System.out.println(" [x] Recibido '" + message + "'");
            
            // Aquí puedes agregar la lógica de procesamiento del mensaje
            // Por ejemplo: guardar en BD, procesar datos, enviar a otro servicio, etc.
        };
        
        // Iniciamos el consumo de mensajes
        // Parámetro autoAck=true: los mensajes se confirman automáticamente al recibirlos
        // Si necesitas mayor confiabilidad, usa autoAck=false y confirma manualmente con channel.basicAck()
        channel.basicConsume(QueueNames.SIGNALS, true, deliverCallback, consumerTag -> { });
        
        // El programa queda en espera indefinida recibiendo mensajes
        // Para detenerlo, usa CTRL+C
    }
}