using System.Text.Json.Serialization;

namespace GTAAPP.Server.Models;

public class PropertyBadge
{
    [JsonPropertyName("icon")]
    public string Icon { get; set; } = string.Empty;

    [JsonPropertyName("color")]
    public string Color { get; set; } = string.Empty;

    [JsonPropertyName("symbol")]
    public string Symbol { get; set; } = string.Empty;
}

public class PropertyPosition
{
    [JsonPropertyName("x")]
    public float X { get; set; }

    [JsonPropertyName("y")]
    public float Y { get; set; }

    [JsonPropertyName("z")]
    public float Z { get; set; }
}

public class PropertyLocation
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("category")]
    public string Category { get; set; } = string.Empty;

    [JsonPropertyName("categoryLabel")]
    public string CategoryLabel { get; set; } = string.Empty;

    [JsonPropertyName("gameMode")]
    public string GameMode { get; set; } = string.Empty;

    [JsonPropertyName("owner")]
    public string? Owner { get; set; }

    [JsonPropertyName("price")]
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
    public long Price { get; set; }

    [JsonPropertyName("priceFormatted")]
    public string PriceFormatted { get; set; } = string.Empty;

    [JsonPropertyName("imageUrl")]
    public string? ImageUrl { get; set; }

    [JsonPropertyName("zone")]
    public string Zone { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("features")]
    public List<string> Features { get; set; } = [];

    [JsonPropertyName("income")]
    public string? Income { get; set; }

    [JsonPropertyName("position")]
    public PropertyPosition Position { get; set; } = new();

    [JsonPropertyName("badge")]
    public PropertyBadge Badge { get; set; } = new();
}
