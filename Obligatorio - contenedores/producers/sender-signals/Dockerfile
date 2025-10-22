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

# Ahora copiar y compilar el producer
COPY producers/sender-signals/pom.xml /app/sender-signals/
COPY producers/sender-signals/src /app/sender-signals/src

# Compilar la aplicación
WORKDIR /app/sender-signals
RUN mvn clean package -DskipTests

# Etapa 2: Ejecución (runtime stage)
FROM openjdk:11-jre-slim

# Establecer directorio de trabajo
WORKDIR /app

# Copiar el JAR compilado desde la etapa de build
COPY --from=build /app/sender-signals/target/sender-signals-1.0-SNAPSHOT.jar /app/sender-signals.jar

# Comando para ejecutar la aplicación
CMD ["java", "-jar", "sender-signals.jar"]
