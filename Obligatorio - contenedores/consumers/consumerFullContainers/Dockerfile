FROM python:3.11-slim

WORKDIR /app

# Copiar requirements y instalar dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el script del consumer
COPY consumerFullContainers.py .

# Ejecutar el consumer (con -u para no bufferizar stdout)
CMD ["python", "-u", "consumerFullContainers.py"]
