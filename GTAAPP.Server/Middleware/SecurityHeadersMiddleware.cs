namespace GTAAPP.Server.Middleware;

/// <summary>
/// Middleware para añadir cabeceras HTTP de seguridad (OWASP y Azure App Service recommendations):
/// Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy y Permissions-Policy.
/// </summary>
public class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;

    public SecurityHeadersMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        context.Response.OnStarting(() =>
        {
            var headers = context.Response.Headers;

            // 1. Evita Clickjacking (Iframe embedding no autorizado)
            if (!headers.ContainsKey("X-Frame-Options"))
            {
                headers.Append("X-Frame-Options", "SAMEORIGIN");
            }

            // 2. Previene MIME-type sniffing
            if (!headers.ContainsKey("X-Content-Type-Options"))
            {
                headers.Append("X-Content-Type-Options", "nosniff");
            }

            // 3. Control de Referrer para no filtrar rutas internas en enlaces salientes
            if (!headers.ContainsKey("Referrer-Policy"))
            {
                headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
            }

            // 4. Restringe APIs del navegador no requeridas por la aplicación
            if (!headers.ContainsKey("Permissions-Policy"))
            {
                headers.Append("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
            }

            // 5. Deshabilita el auditor XSS antiguo en favor de CSP moderna
            if (!headers.ContainsKey("X-XSS-Protection"))
            {
                headers.Append("X-XSS-Protection", "0");
            }

            // 6. Content Security Policy (CSP) adaptada a Angular, Leaflet y CDNs de imágenes/tiles
            if (!headers.ContainsKey("Content-Security-Policy"))
            {
                var csp = "default-src 'self'; " +
                          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
                          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
                          "font-src 'self' https://fonts.gstatic.com data:; " +
                          "img-src 'self' data: blob: https://tiles.mapgenie.io https://static.wikia.nocookie.net https://media.rockstargames.com https://*.wikia.nocookie.net; " +
                          "connect-src 'self' https://tiles.mapgenie.io; " +
                          "frame-ancestors 'self'; " +
                          "base-uri 'self'; " +
                          "form-action 'self';";

                headers.Append("Content-Security-Policy", csp);
            }

            // 7. Ocultar información del servidor
            headers.Remove("Server");
            headers.Remove("X-Powered-By");

            return Task.CompletedTask;
        });

        await _next(context);
    }
}

public static class SecurityHeadersMiddlewareExtensions
{
    public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder app)
    {
        return app.UseMiddleware<SecurityHeadersMiddleware>();
    }
}
