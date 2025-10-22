# Etapa 1: Construcción (build stage)
FROM maven:3.8.6-openjdk-11-slim AS build

# Establecer directorio de trabajo
WORKDIR /app

# Copiar el POM raíz y el POM del módulo common
COPY pom.xml /app/
COPY common/pom.xml /app/common/
COPY common/src /app/common/src

# Primero compilar e instalar el módulo common en el repositorio local de Maven
RUN mvn -f common/pom.xml clean install -DskipTests

# Ahora copiar y compilar el consumer
COPY consumers/consumer-signals/pom.xml /app/consumer-signals/
COPY consumers/consumer-signals/src /app/consumer-signals/src

# Compilar la aplicación
WORKDIR /app/consumer-signals
RUN mvn clean package -DskipTests

# Etapa 2: Ejecución (runtime stage)
FROM openjdk:11-jre-slim

# Establecer directorio de trabajo
WORKDIR /app

# Copiar el JAR compilado desde la etapa de build
COPY --from=build /app/consumer-signals/target/consumer-signals-1.0-SNAPSHOT.jar /app/consumer-signals.jar

# Comando para ejecutar la aplicación
CMD ["java", "-jar", "consumer-signals.jar"]
