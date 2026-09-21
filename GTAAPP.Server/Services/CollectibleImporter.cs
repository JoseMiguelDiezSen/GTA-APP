using System.Text.Json;
using GTAAPP.Server.Models;

namespace GTAAPP.Server.Services;

/// <summary>
/// Servicio para cargar y cachear el dataset de coleccionables de GTA Online.
/// Lee desde wwwroot/data/collectibles.json.
/// </summary>
public class CollectibleImporter
{
    private readonly IWebHostEnvironment _env;
    private readonly object _lock = new();
    private IReadOnlyList<CollectibleItem>? _collectibles;

    public CollectibleImporter(IWebHostEnvironment env) => _env = env;

    public IReadOnlyList<CollectibleItem> GetCollectibles(string? category = null)
    {
        if (_collectibles is null)
        {
            lock (_lock)
            {
                if (_collectibles is null)
                {
                    const string relPath = "data/collectibles.json";
                    var full = Path.Combine(_env.WebRootPath ?? "wwwroot", relPath);

                    if (File.Exists(full))
                    {
                        using var stream = File.OpenRead(full);
                        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                        var list = JsonSerializer.Deserialize<List<CollectibleItem>>(stream, options) ?? [];
                        _collectibles = list;
                    }
                    else
                    {
                        _collectibles = [];
                    }
                }
            }
        }

        IEnumerable<CollectibleItem> result = _collectibles;

        if (!string.IsNullOrWhiteSpace(category))
        {
            result = result.Where(c => c.Category.Equals(category, StringComparison.OrdinalIgnoreCase));
        }

        return result.ToList();
    }
}
