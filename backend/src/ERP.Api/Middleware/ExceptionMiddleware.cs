using System.Net;
using System.Text.Json;
using Npgsql;

namespace ERP.Api.Middleware;

public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionMiddleware> _logger;

    public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An unhandled exception occurred: {Message}", ex.Message);
            await HandleExceptionAsync(context, ex);
        }
    }

    private static Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        // Map domain and known database failures to clean, human-readable API errors.
        // Business exceptions carry a safe message; DB/system errors get a generic message
        // (the full exception is already logged above) while the correct status code is
        // still returned so clients can react (e.g. 409 for constraint conflicts).
        var (statusCode, message) = exception switch
        {
            InvalidOperationException => (HttpStatusCode.BadRequest, exception.Message),
            ArgumentException => (HttpStatusCode.BadRequest, exception.Message),
            UnauthorizedAccessException => (HttpStatusCode.Unauthorized, exception.Message),
            KeyNotFoundException => (HttpStatusCode.NotFound, exception.Message),
            PostgresException { SqlState: PostgresErrorCodes.ForeignKeyViolation } =>
                (HttpStatusCode.Conflict, "The operation conflicts with existing data. Please check related records and try again."),
            PostgresException { SqlState: PostgresErrorCodes.UniqueViolation } =>
                (HttpStatusCode.Conflict, "A record with the same unique value already exists."),
            PostgresException { SqlState: PostgresErrorCodes.NotNullViolation } or
            PostgresException { SqlState: PostgresErrorCodes.CheckViolation } =>
                (HttpStatusCode.BadRequest, "The request violates a data constraint. Please check the submitted values."),
            _ => (HttpStatusCode.InternalServerError, "An internal server error occurred. Please try again later.")
        };

        context.Response.StatusCode = (int)statusCode;

        // Both `message` and `error` are populated so every existing frontend error
        // handler (whether it reads `.error` or `.message`) surfaces a useful message.
        var response = new
        {
            success = false,
            message,
            error = message
        };

        var jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        return context.Response.WriteAsync(JsonSerializer.Serialize(response, jsonOptions));
    }
}
