# Multi-stage Dockerfile for building and running ASP.NET Core (.NET 10.0)
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /app

# Copy project file and restore dependencies first (optimizes layer caching)
COPY src/ERP.Api/ERP.Api.csproj src/ERP.Api/
RUN dotnet restore src/ERP.Api/ERP.Api.csproj

# Copy the entire backend source code and build/publish Release bundle
COPY . .
WORKDIR /app/src/ERP.Api
RUN dotnet publish -c Release -o /out --no-restore

# Runtime stage using lightweight ASP.NET 10.0 image
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Copy published binaries from the build stage
COPY --from=build /out .

# Render exposes the port via the PORT environment variable (default 8000)
ENV ASPNETCORE_ENVIRONMENT=Production
ENV PORT=8000
EXPOSE 8000

# Start the Web API
ENTRYPOINT ["dotnet", "ERP.Api.dll"]
