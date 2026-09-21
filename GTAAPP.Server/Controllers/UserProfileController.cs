using GTAAPP.Server.Models;
using GTAAPP.Server.Services;
using Microsoft.AspNetCore.Mvc;

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
    /// GET /api/user/profile → Devuelve el perfil activo del usuario (identidad y sincronización SCAPI).
    /// </summary>
    [HttpGet("profile")]
    public ActionResult<UserProfile> GetProfile()
    {
        return Ok(_userService.GetProfile());
    }

    /// <summary>
    /// POST /api/user/profile → Actualiza los datos del perfil (alias, plataforma, preferencias de mapa).
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
