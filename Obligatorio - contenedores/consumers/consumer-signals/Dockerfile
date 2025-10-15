# Etapa 1: Construcción (build stage)
FROM maven:3.8.6-openjdk-11-slim AS build

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos comunes primero (common)
COPY ../../common /app/common

# Copiar pom.xml y archivos fuente del consumidor
COPY pom.xml /app/
COPY src /app/src

# Compilar la aplicación
RUN mvn clean package -DskipTests

# Etapa 2: Ejecución (runtime stage)
FROM openjdk:11-jre-slim

# Establecer directorio de trabajo
WORKDIR /app

# Copiar el JAR compilado desde la etapa de build
COPY --from=build /app/target/consumer-signals-1.0-SNAPSHOT.jar /app/consumer-signals.jar

# Comando para ejecutar la aplicación
CMD ["java", "-jar", "consumer-signals.jar"]
