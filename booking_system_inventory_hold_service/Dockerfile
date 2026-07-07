# Runtime base image is overridable so the e2e stack can build a native
# (non-amd64) image and skip QEMU emulation. Must be declared before the first
# FROM to be usable in the runtime stage's FROM. Defaults to the prod Alpine JRE,
# so prod builds are unchanged.
ARG RUNTIME_IMAGE=eclipse-temurin:17-jre-alpine

# Build stage
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Copy pom.xml and download dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build
COPY src ./src
RUN mvn clean package -DskipTests

# Runtime stage
FROM ${RUNTIME_IMAGE}
WORKDIR /app

# Copy the built executable war from build stage
COPY --from=build /app/target/*.war app.war

# Create directory for SQLite database
RUN mkdir -p /app/data

# Expose port
EXPOSE 8080

# Set environment variables
ENV SPRING_DATASOURCE_URL=jdbc:sqlite:/app/data/holds.db
ENV PYTHON_BACKEND_URL=http://python-backend:8000

# Run the application
ENTRYPOINT ["java", "-jar", "app.war"]
