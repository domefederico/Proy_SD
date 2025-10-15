# Etapa 1: Construcción (build stage)
FROM maven:3.8.6-openjdk-11-slim AS build

# Establecer directorio de trabajo
WORKDIR /app

# Copiar pom.xml primero (para aprovechar caché de Docker)
COPY producers/sender-signals/pom.xml /app/

# Copiar archivos fuente del productor
COPY producers/sender-signals/src /app/src

# Copiar archivos comunes desde la raíz del proyecto a la estructura Maven
COPY common/*.java /app/src/main/java/com/example/common/

# Compilar la aplicación
RUN mvn clean package -DskipTests

# Etapa 2: Ejecución (runtime stage)
FROM openjdk:11-jre-slim

# Establecer directorio de trabajo
WORKDIR /app

# Copiar el JAR compilado desde la etapa de build
COPY --from=build /app/target/sender-signals-1.0-SNAPSHOT.jar /app/sender-signals.jar

# Comando para ejecutar la aplicación
CMD ["java", "-jar", "sender-signals.jar"]
