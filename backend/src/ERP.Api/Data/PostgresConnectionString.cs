using Npgsql;

namespace ERP.Api.Data;

/// <summary>
/// Normalizes PostgreSQL connection strings for Npgsql.
/// Render Blueprint's "connectionString" property for Render Postgres is a URI
/// (postgresql://user:password@host:port/database), which Npgsql cannot parse.
/// URI-style values are converted to the key=value format Npgsql expects; strings
/// already in key=value format (e.g. appsettings.json) pass through unchanged.
/// </summary>
public static class PostgresConnectionString
{
    public static string ToNpgsqlFormat(string? connectionString)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return connectionString ?? string.Empty;
        }

        var trimmed = connectionString.Trim();
        if (!trimmed.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) &&
            !trimmed.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            return connectionString; // already Npgsql key=value format
        }

        var uri = new Uri(trimmed);
        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Database = uri.AbsolutePath.TrimStart('/')
        };

        if (uri.Port > 0)
        {
            builder.Port = uri.Port;
        }

        if (!string.IsNullOrEmpty(uri.UserInfo))
        {
            var separatorIndex = uri.UserInfo.IndexOf(':');
            builder.Username = Uri.UnescapeDataString(
                separatorIndex >= 0 ? uri.UserInfo[..separatorIndex] : uri.UserInfo);
            if (separatorIndex >= 0)
            {
                builder.Password = Uri.UnescapeDataString(uri.UserInfo[(separatorIndex + 1)..]);
            }
        }

        return builder.ConnectionString;
    }
}
