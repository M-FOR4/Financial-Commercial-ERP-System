using ERP.Api.Domain.Entities;

namespace ERP.Api.DTOs;

/// <summary>General system settings view model.</summary>
public record SystemSettingsDto(bool AllowNegativeStock);

/// <summary>Payload for updating general system settings.</summary>
public record UpdateSystemSettingsRequest(bool AllowNegativeStock);

public static class SystemSettingMapper
{
    public static SystemSettingsDto ToDto(this SystemSetting s) => new(s.AllowNegativeStock);
}
