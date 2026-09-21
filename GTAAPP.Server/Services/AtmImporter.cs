using System.Text.Json;
using GTAAPP.Server.Models;

namespace GTAAPP.Server.Services;

/// <summary>
/// Importador de ATMs desde el dump oficial "worldAtms.json" de DurtyFree/gta-v-data-dumps.
/// El fichero vive en wwwroot/data/ y es un array de objetos con Name + Position{X,Y,Z} + Rotation.
/// Los ATMs se cachean en memoria tras la primera lectura y se ordenan por nombre.
/// </summary>
public class AtmImporter
{
    private readonly IWebHostEnvironment _env;
    private readonly object _lock = new();
    private IReadOnlyList<Location>? _atms;

    public AtmImporter(IWebHostEnvironment env) => _env = env;

    public IReadOnlyList<Location> GetAtms()
    {
        if (_atms is null)
        {
            lock (_lock)
            {
                const string relPath = "data/worldAtms.json";
                var full = Path.Combine(_env.WebRootPath ?? "wwwroot", relPath);

                using var stream = File.OpenRead(full);
                using var doc = JsonDocument.Parse(stream);
                var root = doc.RootElement;

                var list = new List<Location>();
                if (root.ValueKind == JsonValueKind.Array)
                {
                    foreach (var e in root.EnumerateArray())
                    {
                        list.Add(ParseEntry(e));
                    }
                }

                list.Sort((a, b) => string.CompareOrdinal(a.Name, b.Name));
                _atms = list;
            }
        }

        return _atms!;
    }

    private static Location ParseEntry(JsonElement e)
    {
        Location loc = new()
        {
            Name = e.TryGetProperty("Name", out var n) ? n.GetString() ?? string.Empty : string.Empty,
            Type = "atm",
            X = GetFloat(e, "Position", "X"),
            Y = GetFloat(e, "Position", "Y"),
            Z = GetFloat(e, "Position", "Z")
        };

        // Giro en el eje Z (los ATMs del dump apuntan a orientaciones distintas)
        loc.RotationZ = GetFloat(e, "Rotation", "Z");

        return loc;
    }

    private static float GetFloat(JsonElement obj, string groupProp, string prop)
    {
        if (obj.ValueKind == JsonValueKind.Object && obj.TryGetProperty(groupProp, out var group) &&
            group.ValueKind == JsonValueKind.Object && group.TryGetProperty(prop, out var v) &&
            v.ValueKind == JsonValueKind.Number)
        {
            return v.GetSingle();
        }
        return 0f;
    }
}
