# Etapa 1: Construcción (build stage)
FROM maven:3.9.9-eclipse-temurin-21-alpine AS build

# Directorio de trabajo
WORKDIR /app

# Copiar el POM raíz (si existe, opcional)
COPY pom.xml /app/

# Copiar el módulo common primero (para usar su caché)
COPY common/pom.xml /app/common/
COPY common/src /app/common/src

# Compilar e instalar el módulo common
RUN mvn -f common/pom.xml clean install -DskipTests

# Copiar el código del producer
COPY producers/providerFullContainers/pom.xml /app/provider-full-containers/
COPY producers/providerFullContainers/src /app/provider-full-containers/src

# Compilar la aplicación
WORKDIR /app/provider-full-containers
RUN mvn clean package -DskipTests

# Etapa 2: Ejecución (runtime stage)
FROM eclipse-temurin:21-jre-alpine

# Directorio de trabajo
WORKDIR /app

# Copiar el JAR desde la etapa de build
COPY --from=build /app/provider-full-containers/target/provider-full-containers-1.0-SNAPSHOT.jar /app/provider-full-containers.jar

# Comando para ejecutar la aplicación
CMD ["java", "-jar", "provider-full-containers.jar"]
