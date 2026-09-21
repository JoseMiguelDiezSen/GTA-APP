using GTAAPP.Server.Models;
using Microsoft.AspNetCore.Mvc;

namespace GTAAPP.Server.Controllers;

[ApiController]
[Route("api/gta5")]
public class GTA5Controller : ControllerBase
{
    [HttpGet]
    public ActionResult<GameManifest> Get()
    {
        // GTA V activo con mapa base de 8192x8192 px troceado en tiles 256px.
        // En el zoom maximo (7) el mapa ocupa 32x32 tiles sobre coarse CRS.Simple.
        var manifest = new GameManifest
        {
            Id = "gta5",
            Name = "GTA V",
            Status = "activo",
            Map = new GameMapInfo
            {
                TilePath = "assets",
                ImageSize = 8192,
                MaxZoom = 7,
                MapTypes = new List<MapTypeInfo>
                {
                    new() { Id = "Satellite", Label = "Satelite" },
                    new() { Id = "Roadmap", Label = "Carreteras" },
                    new() { Id = "Atlas", Label = "Atlas" }
                }
            }
        };

        return Ok(manifest);
    }
}
