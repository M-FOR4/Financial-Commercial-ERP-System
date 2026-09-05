namespace ERP.Api.Common;

public static class DateTimeExtensions
{
    /// <summary>
    /// Normalizes a <see cref="DateTime"/> to UTC before it reaches EF Core / Npgsql.
    ///
    /// Npgsql rejects <see cref="DateTimeKind.Unspecified"/> values when writing to or
    /// comparing against PostgreSQL "timestamp with time zone" columns, so values parsed
    /// from query strings or JSON without an offset (which deserialize as Unspecified)
    /// must be interpreted as UTC rather than the server's local timezone. A Local value
    /// (e.g. a JSON timestamp carrying an offset) is converted to UTC properly.
    /// </summary>
    public static DateTime ToUtc(this DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => value,
        DateTimeKind.Local => value.ToUniversalTime(),
        _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
    };

    public static DateTime? ToUtc(this DateTime? value) => value.HasValue ? value.Value.ToUtc() : null;
}