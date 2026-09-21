using System.Text.Json;
using GTAAPP.Server.Models;

namespace GTAAPP.Server.Services;

/// <summary>
/// Servicio de persistencia y gestión del perfil del usuario y datos sincronizados con Social Club.
/// </summary>
public class UserProfileService
{
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<UserProfileService> _logger;
    private readonly string _filePath;
    private readonly object _lock = new();
    private UserProfile _profile;

    public UserProfileService(IWebHostEnvironment env, ILogger<UserProfileService> logger)
    {
        _env = env;
        _logger = logger;
        _filePath = Path.Combine(_env.WebRootPath ?? Path.Combine(AppContext.BaseDirectory, "wwwroot"), "data", "user_profile.json");
        _profile = LoadProfile();
    }

    public UserProfile GetProfile()
    {
        lock (_lock)
        {
            return _profile;
        }
    }

    public UserProfile SaveProfile(UserProfile updated)
    {
        lock (_lock)
        {
            _profile = updated;
            Persist();
            return _profile;
        }
    }

    public UserProfile SyncFromSocialClub(SocialClubSyncPayload payload)
    {
        lock (_lock)
        {
            if (!string.IsNullOrWhiteSpace(payload.RockstarId))
                _profile.RockstarId = payload.RockstarId;

            if (!string.IsNullOrWhiteSpace(payload.Nickname))
                _profile.Nickname = payload.Nickname;

            if (!string.IsNullOrWhiteSpace(payload.AvatarUrl))
                _profile.AvatarUrl = payload.AvatarUrl;

            if (!string.IsNullOrWhiteSpace(payload.Platform))
                _profile.Platform = payload.Platform;

            if (payload.CharacterSlot.HasValue)
                _profile.CharacterSlot = payload.CharacterSlot.Value;

            if (payload.Rank.HasValue)
                _profile.Rank = payload.Rank.Value;

            if (payload.Cash.HasValue)
                _profile.Cash = payload.Cash.Value;

            if (payload.Bank.HasValue)
                _profile.Bank = payload.Bank.Value;

            if (payload.OwnedPropertyIds != null)
                _profile.OwnedPropertyIds = payload.OwnedPropertyIds;

            if (payload.CollectedItemIds != null)
                _profile.CollectedItemIds = payload.CollectedItemIds;

            _profile.IsSyncedWithSocialClub = true;
            _profile.LastSyncDate = DateTime.UtcNow;

            Persist();
            return _profile;
        }
    }

    private UserProfile LoadProfile()
    {
        try
        {
            if (File.Exists(_filePath))
            {
                var json = File.ReadAllText(_filePath);
                var loaded = JsonSerializer.Deserialize<UserProfile>(json);
                if (loaded != null) return loaded;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al cargar user_profile.json. Inicializando perfil por defecto.");
        }

        return new UserProfile();
    }

    private void Persist()
    {
        try
        {
            var dir = Path.GetDirectoryName(_filePath);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }

            var json = JsonSerializer.Serialize(_profile, new JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(_filePath, json);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al persistir user_profile.json.");
        }
    }
}
