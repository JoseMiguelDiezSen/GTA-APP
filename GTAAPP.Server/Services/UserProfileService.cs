using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using GTAAPP.Server.Models;

namespace GTAAPP.Server.Services;

/// <summary>
/// Servicio de persistencia y gestión de cuentas multi-usuario (Gamertag + PIN)
/// y sincronización de perfiles de juego de GTA con sanitización de entradas anti-XSS.
/// </summary>
public class UserProfileService
{
    private static readonly Regex GamertagRegex = new(@"^[a-zA-Z0-9_\-]+$", RegexOptions.Compiled);
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<UserProfileService> _logger;
    private readonly string _profilesDir;
    private readonly string _legacyFilePath;
    private readonly object _lock = new();
    private UserProfile _legacyProfile;

    public UserProfileService(IWebHostEnvironment env, ILogger<UserProfileService> logger)
    {
        _env = env;
        _logger = logger;
        
        var baseDir = _env.WebRootPath ?? Path.Combine(AppContext.BaseDirectory, "wwwroot");
        _profilesDir = Path.Combine(baseDir, "data", "profiles");
        _legacyFilePath = Path.Combine(baseDir, "data", "user_profile.json");

        if (!Directory.Exists(_profilesDir))
        {
            Directory.CreateDirectory(_profilesDir);
        }

        _legacyProfile = LoadLegacyProfile();
    }

    /// <summary>
    /// Inicia sesión o registra una nueva cuenta basada en Gamertag y PIN de 4 a 6 dígitos.
    /// Si la cuenta es nueva, puede heredar el progreso local actual del usuario.
    /// </summary>
    public AuthResponse AuthenticateOrCreate(AuthRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Gamertag) || string.IsNullOrWhiteSpace(request.Pin))
        {
            return new AuthResponse
            {
                Success = false,
                Message = "El Gamertag y el PIN son obligatorios."
            };
        }

        var gamertagClean = request.Gamertag.Trim();
        var pinClean = request.Pin.Trim();

        if (gamertagClean.Length < 2 || gamertagClean.Length > 30)
        {
            return new AuthResponse
            {
                Success = false,
                Message = "El Gamertag debe tener entre 2 y 30 caracteres."
            };
        }

        if (!GamertagRegex.IsMatch(gamertagClean))
        {
            return new AuthResponse
            {
                Success = false,
                Message = "El Gamertag solo puede contener caracteres alfanuméricos, guiones y guiones bajos."
            };
        }

        if (pinClean.Length < 4 || pinClean.Length > 6 || !pinClean.All(char.IsDigit))
        {
            return new AuthResponse
            {
                Success = false,
                Message = "El PIN debe ser un código numérico de 4 a 6 dígitos."
            };
        }

        var safeFileName = GetSafeFileName(gamertagClean);
        if (string.IsNullOrEmpty(safeFileName))
        {
            return new AuthResponse
            {
                Success = false,
                Message = "El Gamertag contiene caracteres no válidos."
            };
        }

        var filePath = Path.Combine(_profilesDir, $"{safeFileName}.json");
        var pinHash = HashPin(pinClean);

        lock (_lock)
        {
            try
            {
                if (File.Exists(filePath))
                {
                    // La cuenta ya existe -> Validar PIN
                    var json = File.ReadAllText(filePath);
                    var account = JsonSerializer.Deserialize<UserAccount>(json);

                    if (account == null)
                    {
                        return new AuthResponse
                        {
                            Success = false,
                            Message = "Error al leer los datos de la cuenta en el servidor."
                        };
                    }

                    if (account.PinHash != pinHash)
                    {
                        return new AuthResponse
                        {
                            Success = false,
                            Message = "PIN incorrecto para este Gamertag. Verifica tu código."
                        };
                    }

                    // Acceso exitoso: actualizar última conexión
                    account.LastLogin = DateTime.UtcNow;
                    PersistAccount(filePath, account);

                    return new AuthResponse
                    {
                        Success = true,
                        Message = $"¡Bienvenido de nuevo, {account.Gamertag}!",
                        Gamertag = account.Gamertag,
                        IsNewAccount = false,
                        Profile = account.Profile
                    };
                }
                else
                {
                    // Cuenta nueva -> Registrar y guardar progreso inicial
                    var profileToUse = request.CurrentProfile ?? new UserProfile();
                    profileToUse.Nickname = gamertagClean;
                    SanitizeProfile(profileToUse);

                    var newAccount = new UserAccount
                    {
                        Gamertag = gamertagClean,
                        PinHash = pinHash,
                        CreatedAt = DateTime.UtcNow,
                        LastLogin = DateTime.UtcNow,
                        Profile = profileToUse
                    };

                    PersistAccount(filePath, newAccount);

                    _logger.LogInformation("Nueva cuenta creada: {Gamertag}", gamertagClean);

                    return new AuthResponse
                    {
                        Success = true,
                        Message = $"¡Cuenta creada con éxito para {gamertagClean}!",
                        Gamertag = gamertagClean,
                        IsNewAccount = true,
                        Profile = newAccount.Profile
                    };
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al autenticar o crear cuenta para {Gamertag}", gamertagClean);
                return new AuthResponse
                {
                    Success = false,
                    Message = "Error interno en el servidor al procesar la cuenta."
                };
            }
        }
    }

    /// <summary>
    /// Guarda el perfil del usuario validando sus credenciales de Gamertag y PIN.
    /// </summary>
    public AuthResponse SaveUserProfile(SaveProfileRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Gamertag) || string.IsNullOrWhiteSpace(request.Pin))
        {
            return new AuthResponse
            {
                Success = false,
                Message = "Gamertag y PIN son requeridos para sincronizar en la nube."
            };
        }

        var safeFileName = GetSafeFileName(request.Gamertag);
        var filePath = Path.Combine(_profilesDir, $"{safeFileName}.json");
        var pinHash = HashPin(request.Pin.Trim());

        lock (_lock)
        {
            try
            {
                if (!File.Exists(filePath))
                {
                    // Si no existe, creamos la cuenta automáticamente con el perfil suministrado
                    return AuthenticateOrCreate(new AuthRequest
                    {
                        Gamertag = request.Gamertag,
                        Pin = request.Pin,
                        CurrentProfile = request.Profile
                    });
                }

                var json = File.ReadAllText(filePath);
                var account = JsonSerializer.Deserialize<UserAccount>(json);

                if (account == null || account.PinHash != pinHash)
                {
                    return new AuthResponse
                    {
                        Success = false,
                        Message = "PIN no coincide o cuenta no válida. No se guardaron los cambios."
                    };
                }

                SanitizeProfile(request.Profile);
                account.Profile = request.Profile;
                account.LastLogin = DateTime.UtcNow;
                PersistAccount(filePath, account);

                return new AuthResponse
                {
                    Success = true,
                    Message = "Progreso sincronizado en la nube.",
                    Gamertag = account.Gamertag,
                    Profile = account.Profile
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al guardar perfil de {Gamertag}", request.Gamertag);
                return new AuthResponse
                {
                    Success = false,
                    Message = "Error al guardar el perfil en el servidor."
                };
            }
        }
    }

    /// <summary>
    /// Soporte Legacy: Obtener perfil anónimo compartido.
    /// </summary>
    public UserProfile GetProfile()
    {
        lock (_lock)
        {
            return _legacyProfile;
        }
    }

    /// <summary>
    /// Soporte Legacy: Guardar perfil anónimo compartido.
    /// </summary>
    public UserProfile SaveProfile(UserProfile updated)
    {
        lock (_lock)
        {
            SanitizeProfile(updated);
            _legacyProfile = updated;
            PersistLegacy();
            return _legacyProfile;
        }
    }

    /// <summary>
    /// Sincronización desde SCAPI.
    /// </summary>
    public UserProfile SyncFromSocialClub(SocialClubSyncPayload payload)
    {
        lock (_lock)
        {
            if (!string.IsNullOrWhiteSpace(payload.RockstarId))
                _legacyProfile.RockstarId = payload.RockstarId;

            if (!string.IsNullOrWhiteSpace(payload.Nickname))
                _legacyProfile.Nickname = payload.Nickname;

            if (!string.IsNullOrWhiteSpace(payload.AvatarUrl))
                _legacyProfile.AvatarUrl = payload.AvatarUrl;

            if (!string.IsNullOrWhiteSpace(payload.Platform))
                _legacyProfile.Platform = payload.Platform;

            if (payload.CharacterSlot.HasValue)
                _legacyProfile.CharacterSlot = payload.CharacterSlot.Value;

            if (payload.Rank.HasValue)
                _legacyProfile.Rank = payload.Rank.Value;

            if (payload.Cash.HasValue)
                _legacyProfile.Cash = payload.Cash.Value;

            if (payload.Bank.HasValue)
                _legacyProfile.Bank = payload.Bank.Value;

            if (payload.OwnedPropertyIds != null)
                _legacyProfile.OwnedPropertyIds = payload.OwnedPropertyIds;

            if (payload.CollectedItemIds != null)
                _legacyProfile.CollectedItemIds = payload.CollectedItemIds;

            _legacyProfile.IsSyncedWithSocialClub = true;
            _legacyProfile.LastSyncDate = DateTime.UtcNow;

            SanitizeProfile(_legacyProfile);
            PersistLegacy();
            return _legacyProfile;
        }
    }

    private static void SanitizeProfile(UserProfile profile)
    {
        if (profile == null) return;

        if (!string.IsNullOrWhiteSpace(profile.Nickname))
        {
            var raw = profile.Nickname.Trim();
            if (raw.Length > 50) raw = raw.Substring(0, 50);
            profile.Nickname = WebUtility.HtmlEncode(raw);
        }
        else
        {
            profile.Nickname = "Jugador de Los Santos";
        }

        if (!string.IsNullOrWhiteSpace(profile.AvatarUrl))
        {
            var url = profile.AvatarUrl.Trim();
            // Permite esquemas seguros de data:image o https://
            if (!(url.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase) ||
                  url.StartsWith("https://", StringComparison.OrdinalIgnoreCase)))
            {
                profile.AvatarUrl = null;
            }
            else if (url.Length > 2_000_000)
            {
                profile.AvatarUrl = null;
            }
        }

        if (profile.Rank.HasValue)
        {
            profile.Rank = Math.Clamp(profile.Rank.Value, 1, 8000);
        }

        if (profile.Cash.HasValue && profile.Cash.Value < 0)
        {
            profile.Cash = 0;
        }

        if (profile.Bank.HasValue && profile.Bank.Value < 0)
        {
            profile.Bank = 0;
        }

        if (profile.Platform != "pc" && profile.Platform != "ps5" && profile.Platform != "xboxsx")
        {
            profile.Platform = "pc";
        }
    }

    private static string GetSafeFileName(string gamertag)
    {
        var clean = new string(gamertag
            .Trim()
            .ToLowerInvariant()
            .Where(c => char.IsLetterOrDigit(c) || c == '_' || c == '-')
            .ToArray());

        return string.IsNullOrEmpty(clean) ? "unknown_user" : clean;
    }

    private static string HashPin(string pin)
    {
        var salted = pin.Trim() + "_gta_salt_2026";
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(salted));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private static void PersistAccount(string filePath, UserAccount account)
    {
        var json = JsonSerializer.Serialize(account, new JsonSerializerOptions { WriteIndented = true });
        File.WriteAllText(filePath, json);
    }

    private UserProfile LoadLegacyProfile()
    {
        try
        {
            if (File.Exists(_legacyFilePath))
            {
                var json = File.ReadAllText(_legacyFilePath);
                var loaded = JsonSerializer.Deserialize<UserProfile>(json);
                if (loaded != null) return loaded;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al cargar legacy user_profile.json.");
        }

        return new UserProfile();
    }

    private void PersistLegacy()
    {
        try
        {
            var dir = Path.GetDirectoryName(_legacyFilePath);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }

            var json = JsonSerializer.Serialize(_legacyProfile, new JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(_legacyFilePath, json);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al persistir legacy user_profile.json.");
        }
    }
}
