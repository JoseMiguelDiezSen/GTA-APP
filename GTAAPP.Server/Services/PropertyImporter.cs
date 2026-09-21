using System.Text.Json;
using GTAAPP.Server.Models;

namespace GTAAPP.Server.Services;

/// <summary>
/// Servicio para cargar y cachear el dataset de negocios y propiedades de GTA V y GTA Online.
/// Lee desde wwwroot/data/properties.json.
/// </summary>
public class PropertyImporter
{
    private readonly IWebHostEnvironment _env;
    private readonly object _lock = new();
    private IReadOnlyList<PropertyLocation>? _properties;
    private DateTime _lastLoadedTime = DateTime.MinValue;

    public PropertyImporter(IWebHostEnvironment env) => _env = env;

    public IReadOnlyList<PropertyLocation> GetProperties(string? gameMode = null, string? category = null)
    {
        var full = Path.Combine(_env.WebRootPath ?? "wwwroot", "data/properties.json");
        if (File.Exists(full))
        {
            var lastWrite = File.GetLastWriteTimeUtc(full);
            if (_properties is null || lastWrite > _lastLoadedTime)
            {
                lock (_lock)
                {
                    if (_properties is null || lastWrite > _lastLoadedTime)
                    {
                        try
                        {
                            using var stream = File.OpenRead(full);
                            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                            var list = JsonSerializer.Deserialize<List<PropertyLocation>>(stream, options) ?? [];
                            _properties = list;
                            _lastLoadedTime = lastWrite;
                        }
                        catch
                        {
                            _properties ??= [];
                        }
                    }
                }
            }
        }
        else
        {
            _properties ??= [];
        }

        IEnumerable<PropertyLocation> result = _properties;

        if (!string.IsNullOrWhiteSpace(gameMode))
        {
            result = result.Where(p => p.GameMode.Equals(gameMode, StringComparison.OrdinalIgnoreCase) || p.GameMode.Equals("both", StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(category))
        {
            result = result.Where(p => p.Category.Equals(category, StringComparison.OrdinalIgnoreCase));
        }

        return result.ToList();
    }
}
