export const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';

export const QUEUE_NAMES = {
  SIGNALS: 'signals',
  FULL_CONTAINERS: 'fullcontainers',
  CONTAINERS_TO_CLEAN: 'containerstoclean'
};
