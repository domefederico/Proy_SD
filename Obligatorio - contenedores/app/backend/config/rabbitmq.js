// Configuración de RabbitMQ
export const RABBITMQ_URL = 'amqp://user:pass@rabbitmq:5672';

export const QUEUE_NAMES = {
  SIGNALS: 'signals',
  FULL_CONTAINERS: 'fullcontainers',
  CONTAINERS_TO_CLEAN: 'containerstoclean'
};
