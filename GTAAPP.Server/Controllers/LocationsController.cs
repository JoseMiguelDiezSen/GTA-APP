using GTAAPP.Server.Models;
using GTAAPP.Server.Services;
using Microsoft.AspNetCore.Mvc;

namespace GTAAPP.Server.Controllers;

[ApiController]
[Route("api/locations")]
public class LocationsController : ControllerBase
{
    private readonly AtmImporter _atms;
    private readonly PropertyImporter _properties;
    private readonly CollectibleImporter _collectibles;

    public LocationsController(AtmImporter atms, PropertyImporter properties, CollectibleImporter collectibles)
    {
        _atms = atms;
        _properties = properties;
        _collectibles = collectibles;
    }

    /// <summary>GET /api/locations/atms → todos los cajeros automáticos (ATMs) de GTA V.</summary>
    [HttpGet("atms")]
    public ActionResult<List<Location>> GetAtms()
    {
        return Ok(_atms.GetAtms());
    }

    /// <summary>
    /// GET /api/locations/properties → negocios a comprar, búnkeres, clubes, oficinas y propiedades.
    /// Soporta filtros opcionales por query: ?gameMode=story|online y ?category=bunker|nightclub|etc.
    /// </summary>
    [HttpGet("properties")]
    public ActionResult<List<PropertyLocation>> GetProperties([FromQuery] string? gameMode, [FromQuery] string? category)
    {
        return Ok(_properties.GetProperties(gameMode, category));
    }

    /// <summary>
    /// GET /api/locations/collectibles → coleccionables exclusivos de GTA Online (naipes, muñecos, inhibidores, etc.).
    /// Soporta filtro opcional por query: ?category=playing_card|action_figure|signal_jammer|movie_prop|radio_antenna.
    /// </summary>
    [HttpGet("collectibles")]
    public ActionResult<List<CollectibleItem>> GetCollectibles([FromQuery] string? category)
    {
        return Ok(_collectibles.GetCollectibles(category));
    }
}
