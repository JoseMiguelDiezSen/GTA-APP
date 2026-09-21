namespace GTAAPP.Server.Models;

/// <summary>Objeto geolocalizado en el mundo de GTA V (coordenadas de mundo X/Y/Z).</summary>
public class Location
{
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // ej: "atm"
    public float X { get; set; }
    public float Y { get; set; }
    public float Z { get; set; }
    public float RotationZ { get; set; }
}
