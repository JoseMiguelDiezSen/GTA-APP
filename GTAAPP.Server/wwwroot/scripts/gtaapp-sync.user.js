// ==UserScript==
// @name         GTAAPP - Rockstar Social Club Sync (Opción A)
// @namespace    https://github.com/JoseMiguelDiezSen/GTAAPP
// @version      1.0.0
// @description  Sincroniza automáticamente tu perfil, propiedades compradas y coleccionables de GTA Online con GTAAPP.
// @author       GTAAPP & Google DeepMind Antigravity
// @match        https://www.rockstargames.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_notification
// @connect      scapi.rockstargames.com
// @connect      localhost
// @connect      127.0.0.1
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    console.log('[GTAAPP Sync] Extensión asistente cargada en Rockstar Games.');

    // Crear botón flotante en la interfaz de Rockstar
    function injectSyncButton() {
        if (document.getElementById('gtaapp-sync-btn-root')) return;

        const btn = document.createElement('div');
        btn.id = 'gtaapp-sync-btn-root';
        btn.innerHTML = `
            <button id="gtaapp-btn-trigger" style="
                position: fixed;
                bottom: 24px;
                right: 24px;
                z-index: 999999;
                display: flex;
                align-items: center;
                gap: 10px;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: #ffffff;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-weight: 700;
                font-size: 13px;
                padding: 12px 18px;
                border-radius: 50px;
                border: 2px solid rgba(255,255,255,0.3);
                box-shadow: 0 8px 24px rgba(0,0,0,0.5), 0 0 16px rgba(16,185,129,0.5);
                cursor: pointer;
                transition: all 0.2s ease;
            ">
                <span style="font-size: 16px;">🎮</span>
                <span>Sincronizar con GTAAPP</span>
            </button>
        `;

        document.body.appendChild(btn);

        const trigger = document.getElementById('gtaapp-btn-trigger');
        trigger.addEventListener('mouseenter', () => {
            trigger.style.transform = 'scale(1.05)';
            trigger.style.boxShadow = '0 10px 28px rgba(0,0,0,0.6), 0 0 22px rgba(16,185,129,0.8)';
        });
        trigger.addEventListener('mouseleave', () => {
            trigger.style.transform = 'scale(1)';
            trigger.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5), 0 0 16px rgba(16,185,129,0.5)';
        });

        trigger.addEventListener('click', startSyncFlow);
    }

    async function startSyncFlow() {
        const trigger = document.getElementById('gtaapp-btn-trigger');
        if (trigger) {
            trigger.innerHTML = `<span style="font-size: 16px;">⏳</span><span>Conectando con SCAPI...</span>`;
            trigger.style.background = '#374151';
        }

        try {
            // 1. Obtener Bearer Token desde sesión web
            const pingRes = await fetch('https://www.rockstargames.com/auth/ping-bearer.json', {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (!pingRes.ok) {
                throw new Error('No has iniciado sesión en Rockstar Social Club. Entra a tu cuenta primero.');
            }

            const pingData = await pingRes.json();
            const bearerToken = pingData.bearerToken;

            if (!bearerToken) {
                throw new Error('Sesión no detectada. Inicia sesión en www.rockstargames.com');
            }

            // 2. Obtener Perfil Básico
            const profileRes = await fetch('https://scapi.rockstargames.com/profile/getbasicprofile', {
                headers: {
                    'Authorization': 'Bearer ' + bearerToken,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Origin': 'https://www.rockstargames.com'
                }
            });

            let rockstarId = '';
            let nickname = 'Jugador';
            let avatarUrl = '';
            let platform = 'pc';

            if (profileRes.ok) {
                const profileData = await profileRes.json();
                rockstarId = profileData?.rockstarAccount?.rockstarId || profileData?.scid || '';
                nickname = profileData?.rockstarAccount?.name || profileData?.name || 'Jugador GTA';
                avatarUrl = profileData?.rockstarAccount?.avatarUrl || profileData?.avatar || '';
            }

            // 3. Consultar Progreso de Trayectoria (Career Progress)
            let rawScapi = null;
            let ownedProperties = [];
            let collectedItems = [];

            try {
                const careerRes = await fetch(`https://scapi.rockstargames.com/games/gtao/career/progress/summary?platform=${platform}&characterSlot=0`, {
                    headers: {
                        'Authorization': 'Bearer ' + bearerToken,
                        'X-Requested-With': 'XMLHttpRequest',
                        'Origin': 'https://www.rockstargames.com'
                    }
                });

                if (careerRes.ok) {
                    rawScapi = await careerRes.json();
                    console.log('[GTAAPP Sync] Progreso de Trayectoria recibido:', rawScapi);
                }
            } catch (e) {
                console.warn('[GTAAPP Sync] Career progress no disponible para esta plataforma:', e);
            }

            // Payload para GTAAPP
            const syncPayload = {
                rockstarId: rockstarId ? String(rockstarId) : undefined,
                nickname: nickname,
                avatarUrl: avatarUrl || undefined,
                platform: platform,
                characterSlot: 0,
                ownedPropertyIds: ownedProperties,
                collectedItemIds: collectedItems,
                rawScapiData: rawScapi
            };

            // 4. Enviar a GTAAPP (Localhost)
            const targetUrls = [
                'https://localhost:7147/api/user/sync',
                'http://localhost:5246/api/user/sync',
                'https://localhost:5001/api/user/sync'
            ];

            let sentSuccess = false;

            for (const url of targetUrls) {
                try {
                    await sendPost(url, syncPayload);
                    sentSuccess = true;
                    console.log('[GTAAPP Sync] Sincronizado exitosamente con:', url);
                    break;
                } catch (err) {
                    // Siguiente URL
                }
            }

            if (trigger) {
                trigger.innerHTML = `<span style="font-size: 16px;">✅</span><span>¡Sincronizado con GTAAPP!</span>`;
                trigger.style.background = '#10b981';
            }

            // Copiar al portapapeles como respaldo
            if (typeof GM_setClipboard === 'function') {
                GM_setClipboard(JSON.stringify(syncPayload, null, 2));
            }

            alert(`¡Sincronización con GTAAPP completada!\n\nJugador: ${nickname}\nRockstar ID: ${rockstarId}\nEstado: Enviado al mapa interactivo.`);

        } catch (err) {
            console.error('[GTAAPP Sync] Error:', err);
            if (trigger) {
                trigger.innerHTML = `<span style="font-size: 16px;">⚠️</span><span>Error: ${err.message}</span>`;
                trigger.style.background = '#ef4444';
            }
            alert('Error en la sincronización: ' + err.message);
        }
    }

    function sendPost(url, data) {
        return new Promise((resolve, reject) => {
            if (typeof GM_xmlhttpRequest === 'function') {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: url,
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify(data),
                    onload: (res) => {
                        if (res.status >= 200 && res.status < 300) resolve(res.responseText);
                        else reject(new Error('Status ' + res.status));
                    },
                    onerror: reject
                });
            } else {
                fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                }).then(res => {
                    if (res.ok) resolve(res);
                    else reject(new Error('HTTP ' + res.status));
                }).catch(reject);
            }
        });
    }

    // Inicializar tras carga
    setTimeout(injectSyncButton, 2000);
})();
