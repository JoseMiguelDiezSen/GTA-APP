using System.Text.Json.Serialization;

namespace GTAAPP.Server.Models;

/// <summary>
/// Perfil del jugador y datos sincronizados con Rockstar Games Social Club (SCAPI).
/// </summary>
public class UserProfile
{
    [JsonPropertyName("rockstarId")]
    public string? RockstarId { get; set; }

    [JsonPropertyName("nickname")]
    public string Nickname { get; set; } = "Jugador de Los Santos";

    [JsonPropertyName("avatarUrl")]
    public string? AvatarUrl { get; set; }

    [JsonPropertyName("platform")]
    public string Platform { get; set; } = "pc"; // pc, ps5, xboxsx

    [JsonPropertyName("characterSlot")]
    public int CharacterSlot { get; set; } = 0; // 0 = Personaje 1, 1 = Personaje 2

    [JsonPropertyName("isSyncedWithSocialClub")]
    public bool IsSyncedWithSocialClub { get; set; } = false;

    [JsonPropertyName("lastSyncDate")]
    public DateTime? LastSyncDate { get; set; }

    [JsonPropertyName("rank")]
    public int? Rank { get; set; }

    [JsonPropertyName("cash")]
    public long? Cash { get; set; }

    [JsonPropertyName("bank")]
    public long? Bank { get; set; }

    [JsonPropertyName("ownedPropertyIds")]
    public List<string> OwnedPropertyIds { get; set; } = new();

    [JsonPropertyName("collectedItemIds")]
    public List<string> CollectedItemIds { get; set; } = new();

    [JsonPropertyName("highlightOwnedProperties")]
    public bool HighlightOwnedProperties { get; set; } = true;

    [JsonPropertyName("hideCollectedItems")]
    public bool HideCollectedItems { get; set; } = false;
}

/// <summary>
/// Payload recibido desde el UserScript o cliente con datos de sincronización de SCAPI.
/// </summary>
public class SocialClubSyncPayload
{
    [JsonPropertyName("rockstarId")]
    public string? RockstarId { get; set; }

    [JsonPropertyName("nickname")]
    public string? Nickname { get; set; }

    [JsonPropertyName("avatarUrl")]
    public string? AvatarUrl { get; set; }

    [JsonPropertyName("platform")]
    public string? Platform { get; set; }

    [JsonPropertyName("characterSlot")]
    public int? CharacterSlot { get; set; }

    [JsonPropertyName("rank")]
    public int? Rank { get; set; }

    [JsonPropertyName("cash")]
    public long? Cash { get; set; }

    [JsonPropertyName("bank")]
    public long? Bank { get; set; }

    [JsonPropertyName("ownedPropertyIds")]
    public List<string>? OwnedPropertyIds { get; set; }

    [JsonPropertyName("collectedItemIds")]
    public List<string>? CollectedItemIds { get; set; }

    [JsonPropertyName("rawScapiData")]
    public object? RawScapiData { get; set; }
}
