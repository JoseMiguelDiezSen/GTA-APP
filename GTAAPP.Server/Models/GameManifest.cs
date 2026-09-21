namespace GTAAPP.Server.Models;

public class MapTypeInfo
{
    public string Id { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
}

public class GameMapInfo
{
    public string TilePath { get; set; } = string.Empty;
    public List<MapTypeInfo> MapTypes { get; set; } = new();
    public int ImageSize { get; set; }
    public int MaxZoom { get; set; }
}

public class GameManifest
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public GameMapInfo? Map { get; set; }
}
