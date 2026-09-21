using GTAAPP.Server.Models;
using Microsoft.AspNetCore.Mvc;

namespace GTAAPP.Server.Controllers;

[ApiController]
[Route("api/gta6")]
public class GTA6Controller : ControllerBase
{
    [HttpGet]
    public ActionResult<GameManifest> Get()
    {
        // GTA VI en proximamente: la estructura de datos esta lista pero el
        // mapa todavia no existe. El cliente muestra el aviso no-map.
        var manifest = new GameManifest
        {
            Id = "gta6",
            Name = "GTA VI",
            Status = "proximamente",
            Map = null
        };

        return Ok(manifest);
    }
}
