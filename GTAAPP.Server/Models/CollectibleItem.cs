using System.Text.Json.Serialization;

namespace GTAAPP.Server.Models;

public class CollectibleBadge
{
    [JsonPropertyName("icon")]
    public string Icon { get; set; } = string.Empty;

    [JsonPropertyName("color")]
    public string Color { get; set; } = string.Empty;

    [JsonPropertyName("symbol")]
    public string Symbol { get; set; } = string.Empty;
}

public class CollectibleItem
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("category")]
    public string Category { get; set; } = string.Empty;

    [JsonPropertyName("categoryLabel")]
    public string CategoryLabel { get; set; } = string.Empty;

    [JsonPropertyName("number")]
    public int Number { get; set; }

    [JsonPropertyName("total")]
    public int Total { get; set; }

    [JsonPropertyName("zone")]
    public string Zone { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("hint")]
    public string Hint { get; set; } = string.Empty;

    [JsonPropertyName("reward")]
    public string Reward { get; set; } = string.Empty;

    [JsonPropertyName("position")]
    public PropertyPosition Position { get; set; } = new();

    [JsonPropertyName("badge")]
    public CollectibleBadge Badge { get; set; } = new();
}
