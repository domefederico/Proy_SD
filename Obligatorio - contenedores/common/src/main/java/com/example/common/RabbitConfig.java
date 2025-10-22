package com.example.common;

import com.rabbitmq.client.ConnectionFactory;

public class RabbitConfig {
    public static ConnectionFactory createFactory() {
        ConnectionFactory factory = new ConnectionFactory();
        factory.setHost("rabbitmq");
        factory.setUsername("user");
        factory.setPassword("pass");
        return factory;
    }
}
