using GTAAPP.Server.Models;
using GTAAPP.Server.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace GTAAPP.Server.Controllers;

[ApiController]
[Route("api/user")]
public class UserProfileController : ControllerBase
{
    private readonly UserProfileService _userService;

    public UserProfileController(UserProfileService userService)
    {
        _userService = userService;
    }

    /// <summary>
    /// POST /api/user/auth → Conecta o registra automáticamente una cuenta mediante Gamertag + PIN.
    /// Si el Gamertag existe, valida el PIN y devuelve el perfil guardado.
    /// Si no existe, crea la cuenta y guarda el progreso actual.
    /// Protegido con límite de tasa estricto contra ataques de fuerza bruta.
    /// </summary>
    [HttpPost("auth")]
    [EnableRateLimiting("auth-policy")]
    public ActionResult<AuthResponse> Authenticate([FromBody] AuthRequest request)
    {
        if (!ModelState.IsValid)
        {
            var firstError = ModelState.Values.SelectMany(v => v.Errors).FirstOrDefault()?.ErrorMessage ?? "Solicitud no válida.";
            return BadRequest(new AuthResponse { Success = false, Message = firstError });
        }

        var result = _userService.AuthenticateOrCreate(request);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// POST /api/user/save → Sincroniza y guarda el perfil del usuario en la nube con Gamertag y PIN.
    /// Protegido con límite de tasa estricto contra abusos.
    /// </summary>
    [HttpPost("save")]
    [EnableRateLimiting("auth-policy")]
    public ActionResult<AuthResponse> SaveAccountProfile([FromBody] SaveProfileRequest request)
    {
        if (!ModelState.IsValid)
        {
            var firstError = ModelState.Values.SelectMany(v => v.Errors).FirstOrDefault()?.ErrorMessage ?? "Solicitud no válida.";
            return BadRequest(new AuthResponse { Success = false, Message = firstError });
        }

        var result = _userService.SaveUserProfile(request);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// GET /api/user/profile → Devuelve el perfil activo del usuario (modo anónimo o legacy).
    /// </summary>
    [HttpGet("profile")]
    public ActionResult<UserProfile> GetProfile()
    {
        return Ok(_userService.GetProfile());
    }

    /// <summary>
    /// POST /api/user/profile → Actualiza los datos del perfil (modo anónimo o legacy).
    /// </summary>
    [HttpPost("profile")]
    public ActionResult<UserProfile> UpdateProfile([FromBody] UserProfile updated)
    {
        return Ok(_userService.SaveProfile(updated));
    }

    /// <summary>
    /// POST /api/user/sync → Recibe el volcado de SCAPI desde el script de Tampermonkey (Opción A) o manual.
    /// </summary>
    [HttpPost("sync")]
    public ActionResult<UserProfile> SyncSocialClub([FromBody] SocialClubSyncPayload payload)
    {
        if (payload == null)
        {
            return BadRequest("Payload de sincronización no válido.");
        }

        var profile = _userService.SyncFromSocialClub(payload);
        return Ok(profile);
    }
}
