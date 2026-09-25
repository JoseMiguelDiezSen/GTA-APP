using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace GTAAPP.Server.Models;

/// <summary>
/// Perfil del jugador y datos sincronizados con Rockstar Games Social Club (SCAPI).
/// </summary>
public class UserProfile
{
    [MaxLength(100, ErrorMessage = "RockstarId demasiado largo.")]
    [JsonPropertyName("rockstarId")]
    public string? RockstarId { get; set; }

    [Required(ErrorMessage = "El alias es obligatorio.")]
    [MaxLength(50, ErrorMessage = "El alias no puede superar los 50 caracteres.")]
    [JsonPropertyName("nickname")]
    public string Nickname { get; set; } = "Jugador de Los Santos";

    [MaxLength(2000000, ErrorMessage = "La imagen de avatar supera el tamaño permitido.")]
    [JsonPropertyName("avatarUrl")]
    public string? AvatarUrl { get; set; }

    [RegularExpression("^(pc|ps5|xboxsx)$", ErrorMessage = "Plataforma no válida.")]
    [JsonPropertyName("platform")]
    public string Platform { get; set; } = "pc"; // pc, ps5, xboxsx

    [Range(0, 1, ErrorMessage = "Slot de personaje inválido.")]
    [JsonPropertyName("characterSlot")]
    public int CharacterSlot { get; set; } = 0; // 0 = Personaje 1, 1 = Personaje 2

    [JsonPropertyName("isSyncedWithSocialClub")]
    public bool IsSyncedWithSocialClub { get; set; } = false;

    [JsonPropertyName("lastSyncDate")]
    public DateTime? LastSyncDate { get; set; }

    [Range(1, 8000, ErrorMessage = "El nivel debe estar comprendido entre 1 y 8000.")]
    [JsonPropertyName("rank")]
    public int? Rank { get; set; }

    [Range(0, 999999999999, ErrorMessage = "Cantidad de dinero en efectivo no válida.")]
    [JsonPropertyName("cash")]
    public long? Cash { get; set; }

    [Range(0, 999999999999, ErrorMessage = "Cantidad de dinero en banco no válida.")]
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
    [MaxLength(100)]
    [JsonPropertyName("rockstarId")]
    public string? RockstarId { get; set; }

    [MaxLength(50)]
    [JsonPropertyName("nickname")]
    public string? Nickname { get; set; }

    [MaxLength(2000000)]
    [JsonPropertyName("avatarUrl")]
    public string? AvatarUrl { get; set; }

    [RegularExpression("^(pc|ps5|xboxsx)$")]
    [JsonPropertyName("platform")]
    public string? Platform { get; set; }

    [Range(0, 1)]
    [JsonPropertyName("characterSlot")]
    public int? CharacterSlot { get; set; }

    [Range(1, 8000)]
    [JsonPropertyName("rank")]
    public int? Rank { get; set; }

    [Range(0, 999999999999)]
    [JsonPropertyName("cash")]
    public long? Cash { get; set; }

    [Range(0, 999999999999)]
    [JsonPropertyName("bank")]
    public long? Bank { get; set; }

    [JsonPropertyName("ownedPropertyIds")]
    public List<string>? OwnedPropertyIds { get; set; }

    [JsonPropertyName("collectedItemIds")]
    public List<string>? CollectedItemIds { get; set; }

    [JsonPropertyName("rawScapiData")]
    public object? RawScapiData { get; set; }
}

/// <summary>
/// Representa una cuenta de usuario persistida en el servidor.
/// </summary>
public class UserAccount
{
    [JsonPropertyName("gamertag")]
    public string Gamertag { get; set; } = string.Empty;

    [JsonPropertyName("pinHash")]
    public string PinHash { get; set; } = string.Empty;

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("lastLogin")]
    public DateTime LastLogin { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("profile")]
    public UserProfile Profile { get; set; } = new();
}

/// <summary>
/// Solicitud de autenticación o creación rápida de cuenta con Gamertag y PIN.
/// </summary>
public class AuthRequest
{
    [Required(ErrorMessage = "El Gamertag es obligatorio.")]
    [StringLength(30, MinimumLength = 2, ErrorMessage = "El Gamertag debe tener entre 2 y 30 caracteres.")]
    [RegularExpression(@"^[a-zA-Z0-9_\-]+$", ErrorMessage = "El Gamertag solo puede contener caracteres alfanuméricos, guiones y guiones bajos.")]
    [JsonPropertyName("gamertag")]
    public string Gamertag { get; set; } = string.Empty;

    [Required(ErrorMessage = "El PIN es obligatorio.")]
    [RegularExpression(@"^\d{4,6}$", ErrorMessage = "El PIN debe ser un código numérico de 4 a 6 dígitos.")]
    [JsonPropertyName("pin")]
    public string Pin { get; set; } = string.Empty;

    [JsonPropertyName("currentProfile")]
    public UserProfile? CurrentProfile { get; set; }
}

/// <summary>
/// Respuesta a la solicitud de autenticación.
/// </summary>
public class AuthResponse
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("gamertag")]
    public string? Gamertag { get; set; }

    [JsonPropertyName("isNewAccount")]
    public bool IsNewAccount { get; set; }

    [JsonPropertyName("profile")]
    public UserProfile? Profile { get; set; }
}

/// <summary>
/// Solicitud para guardar el perfil del usuario validando Gamertag y PIN.
/// </summary>
public class SaveProfileRequest
{
    [Required(ErrorMessage = "El Gamertag es obligatorio.")]
    [StringLength(30, MinimumLength = 2, ErrorMessage = "El Gamertag debe tener entre 2 y 30 caracteres.")]
    [RegularExpression(@"^[a-zA-Z0-9_\-]+$", ErrorMessage = "El Gamertag solo puede contener caracteres alfanuméricos, guiones y guiones bajos.")]
    [JsonPropertyName("gamertag")]
    public string Gamertag { get; set; } = string.Empty;

    [Required(ErrorMessage = "El PIN es obligatorio.")]
    [RegularExpression(@"^\d{4,6}$", ErrorMessage = "El PIN debe ser un código numérico de 4 a 6 dígitos.")]
    [JsonPropertyName("pin")]
    public string Pin { get; set; } = string.Empty;

    [Required(ErrorMessage = "El perfil es obligatorio.")]
    [JsonPropertyName("profile")]
    public UserProfile Profile { get; set; } = new();
}
