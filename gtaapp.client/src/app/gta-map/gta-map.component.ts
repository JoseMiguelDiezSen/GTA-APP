import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import * as L from 'leaflet';
import { LocationService } from '../services/location.service';
import { PropertyLocation } from '../models/property';
import { CollectibleItem } from '../models/collectible';
import { UserProfileService } from '../services/user-profile.service';
import { UserProfile, SocialClubSyncPayload } from '../models/user-profile';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-gta-map',
    templateUrl: './gta-map.component.html',
    styleUrls: ['./gta-map.component.css'],
    standalone: false
})
export class GtaMapComponent implements OnInit, AfterViewInit, OnDestroy {

    private map: L.Map | undefined;

    // Mapa base: imagen oficial de 8192x8192 px troceada en tiles de 256px.
    private readonly maxZoom = 7;
    private readonly imageSize = 8192;

    readonly allMapTypes = [
        { id: 'Satellite', label: 'Satélite' },
        { id: 'Roadmap', label: 'Carreteras' },
        { id: 'Atlas', label: 'Atlas' },
        { id: 'UV', label: 'Ultravioleta (UV)' },
        { id: 'UV2', label: 'Ultravioleta 2 (UV Invertido)' }
    ];

    /**
     * Mapas base disponibles según el modo de juego activo.
     * Los mapas UV y UV2 (Blueprint) solo están disponibles en Modo Historia.
     */
    get mapTypes() {
        if (this.selectedGameMode === 'story') {
            return this.allMapTypes;
        }
        return this.allMapTypes.filter(m => ['Satellite', 'Roadmap', 'Atlas'].includes(m.id));
    }

    currentMapType = 'Satellite';

    // HUD: Conmutador de modo de juego (Bifurcación estricta Modo Historia vs GTA Online)
    selectedGameMode: 'story' | 'online' = 'online';
    chipOnline = true;
    chipOffline = false;

    // Estado del panel de capas y leyenda (minimizable)
    legendOpen = true;

    // Claves de Propiedades según el modo de juego
    readonly storyPropertyKeys = [
        'purchasable_business'
    ];

    readonly onlinePropertyKeys = [
        'mansion',
        'hangar',
        'coke_lockup',
        'weed_farm',
        'meth_lab',
        'cash_factory',
        'doc_forgery',
        'bunker',
        'facility',
        'nightclub',
        'arcade',
        'auto_shop',
        'agency',
        'salvage_yard',
        'arena_war',
        'ceo_office',
        'vehicle_warehouse',
        'warehouse'
    ];

    // Claves de Vehículos y Talleres según el modo de juego
    readonly storyVehicleKeys = [
        'ls_customs',
        'hao_garage'
    ];

    readonly onlineVehicleKeys = [
        'ls_customs',
        'bennys',
        'hao_garage',
        'ls_car_meet'
    ];

    // Claves de Coleccionables exclusivos de GTA Online
    readonly collectibleKeys = [
        'playing_card',
        'action_figure',
        'signal_jammer',
        'movie_prop',
        'radio_antenna'
    ];

    // Claves de Servicios (Comisarías, Hospitales, Bomberos, Armerías, Tiendas atracables, Autolavado y Strip Club)
    readonly serviceKeys = [
        'police_station',
        'hospital',
        'fire_station',
        'service',
        'convenience_store',
        'car_wash',
        'strip_club'
    ];

    // Claves individuales de los 7 Trabajos Roleplay
    readonly roleplayKeys = [
        'job-pizza-delperro',
        'job-pizza-vinewood',
        'job-pizza-missionrow',
        'job-firefighter',
        'job-forklift',
        'job-paperboy',
        'job-taxi'
    ];

    // Claves individuales de Personajes y Contactos Emblemáticos
    readonly characterKeys = [
        'contact-simeon',
        'contact-lester-factory',
        'contact-lester-house',
        'contact-lamar',
        'contact-madrazo',
        'contact-gerald',
        'contact-trevor',
        'contact-ron',
        'contact-dax-freakshop',
        'contact-franklin-agency',
        'contact-michael-mansion',
        'contact-tony-prince',
        'contact-agatha-baker',
        'contact-agent-14'
    ];

    get currentPropertyKeys(): string[] {
        return this.selectedGameMode === 'story' ? this.storyPropertyKeys : this.onlinePropertyKeys;
    }

    get currentVehicleKeys(): string[] {
        return this.selectedGameMode === 'story' ? this.storyVehicleKeys : this.onlineVehicleKeys;
    }

    get roleplayJobs(): PropertyLocation[] {
        return this.allProperties.filter(p =>
            p.category === 'roleplay_job' &&
            (p.gameMode === 'both' || p.gameMode === this.selectedGameMode)
        );
    }

    get contactCharacters(): PropertyLocation[] {
        return this.allProperties.filter(p =>
            p.category === 'character' &&
            (p.gameMode === 'both' || p.gameMode === this.selectedGameMode)
        );
    }

    /**
     * Determina si un elemento del mapa es un inmueble o negocio realmente comprable por el jugador.
     * Excluye servicios públicos (comisarías, hospitales, bomberos, autolavados, tiendas),
     * talleres de uso libre y actividades / misiones de roleplay.
     */
    isPurchasable(p: PropertyLocation | undefined): boolean {
        if (!p) return false;
        if (p.category === 'roleplay_job' || p.category === 'character') return false;

        const nonPurchasableCategories = [
            'police_station',
            'hospital',
            'fire_station',
            'car_wash',
            'convenience_store',
            'service',
            'strip_club',
            'ls_customs',
            'bennys',
            'hao_garage',
            'ls_car_meet',
            'character'
        ];

        if (nonPurchasableCategories.includes(p.category)) return false;
        return (p.price || 0) > 0;
    }

    get purchasablePropertiesCount(): number {
        return this.allProperties.filter(p =>
            this.isPurchasable(p) &&
            (p.gameMode === 'both' || p.gameMode === this.selectedGameMode)
        ).length;
    }

    // Estado de filtros de categorías (Leyenda interactiva)
    layerFilters: { [key: string]: boolean } = {
        mansion: true,
        purchasable_business: true,
        hangar: true,
        coke_lockup: true,
        weed_farm: true,
        meth_lab: true,
        cash_factory: true,
        doc_forgery: true,
        bunker: true,
        facility: true,
        auto_shop: true,
        agency: true,
        salvage_yard: true,
        arena_war: true,
        vehicle_warehouse: true,
        warehouse: true,
        nightclub: true,
        arcade: true,
        ceo_office: true,
        mc_business: true,
        // Talleres y Vehículos
        ls_customs: true,
        bennys: true,
        hao_garage: true,
        ls_car_meet: true,
        // Servicios
        police_station: true,
        hospital: true,
        fire_station: true,
        service: true,
        convenience_store: true,
        car_wash: true,
        strip_club: true,
        // Trabajos Roleplay (7 independientes)
        'job-pizza-delperro': true,
        'job-pizza-vinewood': true,
        'job-pizza-missionrow': true,
        'job-firefighter': true,
        'job-forklift': true,
        'job-paperboy': true,
        'job-taxi': true,
        // Personajes y Contactos Emblemáticos
        'contact-simeon': true,
        'contact-lester-factory': true,
        'contact-lester-house': true,
        'contact-lamar': true,
        'contact-madrazo': true,
        'contact-gerald': true,
        'contact-trevor': true,
        'contact-ron': true,
        'contact-dax-freakshop': true,
        'contact-franklin-agency': true,
        'contact-michael-mansion': true,
        'contact-tony-prince': true,
        'contact-agatha-baker': true,
        'contact-agent-14': true,
        // Coleccionables Online (por defecto desactivados para mapa limpio)
        playing_card: false,
        action_figure: false,
        signal_jammer: false,
        movie_prop: false,
        radio_antenna: false
    };

    // Propiedades cargadas
    allProperties: PropertyLocation[] = [];
    private propertyMarkers: { marker: L.Marker; property: PropertyLocation }[] = [];

    // Coleccionables GTA Online cargados
    allCollectibles: CollectibleItem[] = [];
    private collectibleMarkers: { marker: L.Marker; item: CollectibleItem }[] = [];

    private playerMarkersLayer: L.LayerGroup | undefined;

    // Estado unificado de acordeones (Panel de control y Ajustes)
    // Las tarjetas principales permanecen abiertas pero los acordeones interiores inician replegados
    accordion: { [key: string]: boolean } = {
        propiedades: false,     // Panel de control: Propiedades
        vehiculos: false,       // Panel de control: Vehículos
        servicios: false,       // Panel de control: Servicios
        roleplay: false,        // Panel de control: Trabajos Roleplay
        personajes: false,      // Panel de control: Personajes y Contactos
        coleccionables: false,  // Panel de control: Coleccionables
        modo: false,            // Ajustes: Modo de juego
        mapa: false,            // Ajustes: Selector de mapa
        zona: false             // Ajustes: Estilo y tamaño de iconos
    };

    selectedZone = 'all';

    // Hora del juego en Los Santos (1 minuto en el juego = 2 segundos reales)
    inGameHours = 12;
    inGameMinutes = 0;
    inGameTimeStr = '12:00';
    private clockInterval: any;

    // Panel de Ajustes (colapsable como el Panel de Control)
    settingsOpen = true;

    // Estilo de Iconos
    iconTheme: 'modern' | 'classic' = 'modern';
    iconSize: 'compact' | 'standard' | 'large' = 'standard';

    // Menú contextual y Marcadores de usuario
    ctxOpen = false;
    ctxX = 0;
    ctxY = 0;
    private ctxLatLng: L.LatLng | null = null;
    userCustomMarkers: { id: string; name: string; marker: L.Marker; latLng: L.LatLng }[] = [];
    targetCustomMarker: { id: string; name: string; marker: L.Marker; latLng: L.LatLng } | null = null;
    isMarkerContext = false;

    // Panel Lateral (Drawer) de Perfil & Rockstar Sync
    profileDrawerOpen = false;
    activeProfileTab: 'profile' | 'sync' | 'manual' = 'profile';
    userProfile!: UserProfile;
    private profileSub?: Subscription;

    editNickname = '';
    editRank = 100;
    editBank = 5000000;
    drawerGroupOpen: { [category: string]: boolean } = {};
    manualJsonInput = '';
    syncFeedbackMsg = '';
    scriptCopied = false;

    // Autenticación ligera Multi-dispositivo (Gamertag + PIN)
    authGamertag = '';
    authPin = '';
    authErrorMsg = '';
    authSuccessMsg = '';
    authLoading = false;
    isCloudConnected = false;
    activeGamertag: string | null = null;
    private cloudSub?: Subscription;
    private gamertagSub?: Subscription;

    constructor(
        private locationService: LocationService,
        public userProfileService: UserProfileService
    ) {}

    ngOnInit(): void {
        this.startInGameClock();

        (window as any)._gtaRenameMarker = (id: string) => {
            const found = this.userCustomMarkers.find(m => m.id === id);
            if (found) {
                const newName = prompt('Introduce el nuevo nombre del marcador:', found.name);
                if (newName && newName.trim() !== '') {
                    found.name = newName.trim();
                    this.updateCustomMarkerPopup(found);
                }
            }
        };

        (window as any)._gtaDeleteMarker = (id: string) => {
            const found = this.userCustomMarkers.find(m => m.id === id);
            if (found && this.playerMarkersLayer) {
                this.playerMarkersLayer.removeLayer(found.marker);
                this.userCustomMarkers = this.userCustomMarkers.filter(m => m.id !== id);
                if (this.targetCustomMarker?.id === id) {
                    this.targetCustomMarker = null;
                }
            }
        };

        this.userProfile = this.userProfileService.currentProfile;
        this.editNickname = this.userProfile.nickname;
        this.editRank = this.userProfile.rank || 100;
        this.editBank = this.userProfile.bank || 5000000;

        this.profileSub = this.userProfileService.profile$.subscribe(prof => {
            this.userProfile = prof;
            this.editNickname = prof.nickname;
            this.editRank = prof.rank || 100;
            this.editBank = prof.bank || 5000000;
            this.renderPropertyMarkers();
            this.renderCollectibleMarkers();
        });

        this.cloudSub = this.userProfileService.isCloudSynced$.subscribe(connected => {
            this.isCloudConnected = connected;
        });

        this.gamertagSub = this.userProfileService.activeGamertag$.subscribe(tag => {
            this.activeGamertag = tag;
            if (tag) {
                this.authGamertag = tag;
            }
        });
    }

    private startInGameClock(): void {
        const now = new Date();
        const totalRealSecondsToday = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        const inGameTotalSeconds = (totalRealSecondsToday * 30) % 86400;
        this.inGameHours = Math.floor(inGameTotalSeconds / 3600);
        this.inGameMinutes = Math.floor((inGameTotalSeconds % 3600) / 60);
        this.updateInGameTimeString();

        this.clockInterval = setInterval(() => {
            this.inGameMinutes++;
            if (this.inGameMinutes >= 60) {
                this.inGameMinutes = 0;
                this.inGameHours = (this.inGameHours + 1) % 24;
            }
            this.updateInGameTimeString();
        }, 2000);
    }

    private updateInGameTimeString(): void {
        const hh = this.inGameHours.toString().padStart(2, '0');
        const mm = this.inGameMinutes.toString().padStart(2, '0');
        this.inGameTimeStr = `${hh}:${mm}`;
    }

    toggleSettings(): void {
        this.settingsOpen = !this.settingsOpen;
    }

    updateIconStyle(): void {
        if (!this.map) return;
        const container = this.map.getContainer();
        container.classList.remove(
            'icon-size-compact',
            'icon-size-standard',
            'icon-size-large',
            'icon-theme-modern',
            'icon-theme-classic'
        );
        container.classList.add(`icon-size-${this.iconSize}`, `icon-theme-${this.iconTheme}`);
    }

    toggleSection(section: string): void {
        this.accordion[section] = !this.accordion[section];
    }

    openContextMenu(event: MouseEvent): void {
        event.preventDefault();
        this.isMarkerContext = false;
        this.targetCustomMarker = null;
        this.ctxOpen = true;
        this.ctxX = event.clientX;
        this.ctxY = event.clientY;

        if (this.map) {
            const containerPoint = L.point(event.clientX, event.clientY);
            this.ctxLatLng = this.map.containerPointToLatLng(containerPoint);
        }
    }

    closeContextMenu(): void {
        this.ctxOpen = false;
    }

    runCtxAction(action: string): void {
        this.ctxOpen = false;
        if (!this.map) return;

        switch (action) {
            case 'centrar':
                if (this.ctxLatLng) {
                    this.map.panTo(this.ctxLatLng, { animate: true });
                }
                break;
            case 'marcador':
                if (this.ctxLatLng && this.playerMarkersLayer) {
                    const id = 'custom-' + Date.now();
                    const name = 'Marcador ' + (this.userCustomMarkers.length + 1);
                    const customIcon = L.divIcon({
                        className: 'gta-player-pin',
                        html: '<span class="gta-player-pin-inner">◆</span>',
                        iconSize: [28, 28],
                        iconAnchor: [14, 28]
                    });
                    const m = L.marker(this.ctxLatLng, { icon: customIcon });
                    const item = { id, name, marker: m, latLng: this.ctxLatLng };

                    m.on('contextmenu', (e: L.LeafletMouseEvent) => {
                        L.DomEvent.stopPropagation(e);
                        this.targetCustomMarker = item;
                        this.isMarkerContext = true;
                        this.ctxX = e.originalEvent.clientX;
                        this.ctxY = e.originalEvent.clientY;
                        this.ctxOpen = true;
                    });

                    this.updateCustomMarkerPopup(item);
                    m.addTo(this.playerMarkersLayer);
                    this.userCustomMarkers.push(item);
                    m.openPopup();
                }
                break;
            case 'editar_marcador':
                if (this.targetCustomMarker) {
                    const current = this.targetCustomMarker.name;
                    const newName = prompt('Introduce el nuevo nombre del marcador:', current);
                    if (newName && newName.trim() !== '') {
                        this.targetCustomMarker.name = newName.trim();
                        this.updateCustomMarkerPopup(this.targetCustomMarker);
                    }
                }
                break;
            case 'borrar_este_marcador':
                if (this.targetCustomMarker && this.playerMarkersLayer) {
                    this.playerMarkersLayer.removeLayer(this.targetCustomMarker.marker);
                    this.userCustomMarkers = this.userCustomMarkers.filter(m => m.id !== this.targetCustomMarker!.id);
                    this.targetCustomMarker = null;
                }
                break;
            case 'borrar':
                if (this.playerMarkersLayer) {
                    this.playerMarkersLayer.clearLayers();
                    this.userCustomMarkers = [];
                    this.targetCustomMarker = null;
                }
                break;
        }
    }

    private updateCustomMarkerPopup(item: { id: string; name: string; marker: L.Marker }): void {
        const html = `
            <div class="custom-marker-popup" style="min-width: 160px; font-family: system-ui, sans-serif;">
                <div style="font-size: 13px; font-weight: 800; color: #ffb833; margin-bottom: 2px;">${item.name}</div>
                <div style="font-size: 10px; color: rgba(255,255,255,0.6); margin-bottom: 8px;">Punto de interés de usuario</div>
                <div style="display: flex; gap: 6px;">
                    <button type="button" style="flex: 1; padding: 5px 8px; font-size: 11px; font-weight: 700; background: rgba(255,165,0,0.2); border: 1px solid rgba(255,165,0,0.5); color: #ffb833; border-radius: 4px; cursor: pointer;" onclick="window._gtaRenameMarker('${item.id}')">Editar nombre</button>
                    <button type="button" style="padding: 5px 8px; font-size: 11px; font-weight: 700; background: rgba(239,68,68,0.2); border: 1px solid rgba(239,68,68,0.5); color: #ef4444; border-radius: 4px; cursor: pointer;" onclick="window._gtaDeleteMarker('${item.id}')">Eliminar</button>
                </div>
            </div>
        `;
        item.marker.bindPopup(html);
    }

    ngAfterViewInit(): void {
        this.initMap(this.currentMapType);
        window.addEventListener('resize', this.onWindowResize);
    }

    ngOnDestroy(): void {
        window.removeEventListener('resize', this.onWindowResize);
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
        }
        delete (window as any)._gtaRenameMarker;
        delete (window as any)._gtaDeleteMarker;
        if (this.profileSub) {
            this.profileSub.unsubscribe();
        }
        if (this.cloudSub) {
            this.cloudSub.unsubscribe();
        }
        if (this.gamertagSub) {
            this.gamertagSub.unsubscribe();
        }
        if (this.map) {
            this.map.remove();
        }
    }

    private readonly onWindowResize = () => {
        if (this.map) {
            this.map.setMinZoom(this.computeMinZoom(this.imageSize, this.maxZoom));
        }
    };

    private computeMinZoom(imageSize: number, maxZoom: number): number {
        const el = document.getElementById('gta-map');
        const width = el ? el.clientWidth : 0;
        if (width <= 0) return 2;
        const min = maxZoom + Math.log2(width / imageSize);
        return Math.min(maxZoom, Math.max(1, Math.ceil(min)));
    }

    private initMap(mapType: string): void {
        if (this.map) {
            this.map.remove();
        }

        const mapBounds = L.latLngBounds([-64, 0], [0, 64]);
        const minZoom = this.computeMinZoom(this.imageSize, this.maxZoom);

        this.map = L.map('gta-map', {
            crs: L.CRS.Simple,
            minZoom,
            maxZoom: this.maxZoom,
            zoom: minZoom + 0.5,
            center: [-36, 30],
            maxBounds: mapBounds,
            zoomControl: false,
            attributionControl: false
        });

        let tileUrl: string;
        let isUv2 = false;

        if (mapType === 'UV' || mapType === 'UV2') {
            tileUrl = 'https://tiles.mapgenie.io/games/gta5/los-santos/uv/{z}/{x}/{y}.jpg';
            isUv2 = mapType === 'UV2';
        } else {
            tileUrl = `assets/${mapType}/{z}_{x}_{y}.jpg`;
        }

        const tileLayer = L.tileLayer(tileUrl, {
            tileSize: 256,
            minZoom: 0,
            maxZoom: this.maxZoom,
            errorTileUrl: mapType.startsWith('UV') ? undefined : `assets/${mapType}/empty.jpg`,
            noWrap: true,
            className: isUv2 ? 'leaflet-tile-uv2' : ''
        });

        tileLayer.addTo(this.map);

        // Capa para marcadores del jugador creados con clic derecho
        this.playerMarkersLayer = L.layerGroup().addTo(this.map);

        // Cargar dataset de negocios y propiedades
        this.loadProperties();

        // Cargar dataset de coleccionables de GTA Online
        this.loadCollectibles();

        // Aplicar estilos y escala de iconos
        this.updateIconStyle();
    }

    /**
     * Convierte coordenadas de mundo del juego GTA V (X, Y) a coordenadas Leaflet CRS.Simple.
     * Calibrado matemáticamente sobre la proyección satelital oficial de 8192px.
     */
    worldToLatLng(x: number, y: number): [number, number] {
        const originX = 3753.6;
        const originY = 5529.6;
        const scale = 0.660; // 0.660 px por metro oficial

        const px = originX + (scale * x);
        const py = originY - (scale * y);

        const lat = -py / 128;
        const lng = px / 128;
        return [lat, lng];
    }

    private loadProperties(): void {
        this.locationService.getProperties().subscribe({
            next: (properties) => {
                this.allProperties = properties;
                this.renderPropertyMarkers();
            },
            error: (err) => console.error('Error al cargar propiedades:', err)
        });
    }

    private loadCollectibles(): void {
        this.locationService.getCollectibles().subscribe({
            next: (collectibles) => {
                this.allCollectibles = collectibles;
                this.renderCollectibleMarkers();
            },
            error: (err) => console.error('Error al cargar coleccionables:', err)
        });
    }

    private renderPropertyMarkers(): void {
        const map = this.map;
        if (!map) return;

        // Limpiar marcadores anteriores
        this.propertyMarkers.forEach(p => p.marker.remove());
        this.propertyMarkers = [];

        this.allProperties.forEach(p => {
            // Comprobar filtro: si es roleplay_job o character, comprobar por su id individual
            if (p.category === 'roleplay_job' || p.category === 'character') {
                if (!this.layerFilters[p.id]) return;
            } else {
                if (!this.layerFilters[p.category]) return;
            }

            // Comprobar filtro de modo de juego (Bifurcación Modo Historia vs GTA Online)
            if (p.gameMode !== 'both' && p.gameMode !== this.selectedGameMode) {
                return;
            }

            const isPurchasable = this.isPurchasable(p);
            const isOwned = isPurchasable && this.userProfileService.isPropertyOwned(p.id);
            const isHighlight = isOwned && this.userProfile?.highlightOwnedProperties;
            const ownedClass = isHighlight ? 'pin-is-owned' : '';

            const [lat, lng] = this.worldToLatLng(p.position.x, p.position.y);

            // Determinar símbolo gráfico para el pin (garantizar iconos limpios en comisarías, hospitales, bomberos y arena)
            let pinSymbol = p.badge.symbol || '•';
            if (p.category === 'police_station' && (!pinSymbol || pinSymbol === 'POL')) pinSymbol = '🚓';
            if (p.category === 'hospital' && (!pinSymbol || pinSymbol === 'MED' || pinSymbol === '✚')) pinSymbol = '🏥';
            if (p.category === 'fire_station' && (!pinSymbol || pinSymbol === 'BOM')) pinSymbol = '🚒';
            if (p.category === 'car_wash') pinSymbol = '🚿';
            if (p.category === 'arena_war') pinSymbol = '🏟️';

            const icon = L.divIcon({
                className: `gta-pin-wrapper ${ownedClass}`,
                html: `
                    <div class="gta-pin gta-pin-${p.category} ${ownedClass}" style="--pin-color: ${p.badge.color}">
                        <span class="gta-pin-symbol">${pinSymbol}</span>
                        ${isHighlight ? '<span class="pin-crown-badge">✓</span>' : ''}
                    </div>
                `,
                iconSize: [30, 30],
                iconAnchor: [15, 30],
                popupAnchor: [0, -28]
            });

            const featuresHtml = p.features && p.features.length > 0
                ? `<ul class="popup-features">${p.features.map(f => `<li>${f}</li>`).join('')}</ul>`
                : '';

            const incomeHtml = p.income
                ? `<div class="popup-row"><span class="popup-tag-lbl">Ingresos:</span> <span class="popup-tag-val val-income">${p.income}</span></div>`
                : '';

            const ownerHtml = p.owner
                ? `<div class="popup-row"><span class="popup-tag-lbl">Comprador:</span> <span class="popup-tag-val">${p.owner}</span></div>`
                : '';

            const imageHtml = p.imageUrl
                ? `<div class="popup-image-box"><img src="${p.imageUrl}" alt="${p.name}" class="popup-img" loading="lazy" onerror="this.parentElement.style.display='none'" /></div>`
                : '';

            const ownedTagHtml = isOwned
                ? `<div class="popup-owned-tag">PROPIEDAD ADQUIRIDA (EN POSESIÓN)</div>`
                : '';

            // Bloque de precio vs servicio público
            const priceSectionHtml = isPurchasable
                ? `
                    <div class="popup-price-box">
                        <span class="price-title">PRECIO</span>
                        <span class="price-num">${p.priceFormatted}</span>
                    </div>
                  `
                : `
                    <div class="popup-service-tag-box">
                        <span class="service-type-badge">${p.categoryLabel}</span>
                        <span class="service-status-text">${p.priceFormatted || 'Punto de Interés'}</span>
                    </div>
                  `;

            // Botón de compra SOLO para propiedades reales comprables
            const actionButtonHtml = isPurchasable
                ? `
                    <div class="popup-action-row">
                        <button
                            id="popup-btn-prop-${p.id}"
                            type="button"
                            class="popup-card-action-btn ${isOwned ? 'is-owned' : ''}"
                        >
                            ${isOwned ? 'En Posesión · Clic para Desmarcar' : '＋ Marcar como Comprada'}
                        </button>
                    </div>
                  `
                : '';

            const popupHtml = `
                <div class="gta-popup-card">
                    ${imageHtml}
                    <div class="popup-banner" style="background: linear-gradient(135deg, ${p.badge.color}33, #0b0f14 85%); border-bottom: 2px solid ${p.badge.color};">
                        <span class="popup-badge" style="color: ${p.badge.color}; border-color: ${p.badge.color}66">${p.categoryLabel}</span>
                        <h4 class="popup-title">${p.name}</h4>
                        <div class="popup-zone">${p.zone}</div>
                    </div>
                    <div class="popup-content">
                        ${ownedTagHtml}
                        ${priceSectionHtml}
                        ${incomeHtml}
                        ${ownerHtml}
                        <p class="popup-desc">${p.description}</p>
                        ${featuresHtml}
                        ${actionButtonHtml}
                    </div>
                </div>
            `;

            const tooltipPrice = isPurchasable
                ? `<br><span style="color:#2ecc71">${p.priceFormatted}</span>`
                : `<br><span style="color:#3498db">${p.categoryLabel}</span>`;
            const tooltipOwned = isOwned ? ' <b style="color:#2ecc71">[Comprada]</b>' : '';

            const marker = L.marker([lat, lng], { icon })
                .bindPopup(popupHtml, { maxWidth: 300, className: 'gta-leaflet-popup' })
                .bindTooltip(`<b>${p.name}</b>${tooltipPrice}${tooltipOwned}`, {
                    direction: 'top',
                    offset: [0, -26],
                    className: 'gta-leaflet-tooltip'
                });

            marker.on('popupopen', () => {
                if (isPurchasable) {
                    const btn = document.getElementById(`popup-btn-prop-${p.id}`);
                    if (btn) {
                        btn.onclick = () => {
                            this.togglePropertyOwned(p.id);
                            marker.closePopup();
                        };
                    }
                }
            });

            marker.addTo(map);
            this.propertyMarkers.push({ marker, property: p });
        });
    }

    private renderCollectibleMarkers(): void {
        const map = this.map;
        if (!map) return;

        // Limpiar marcadores anteriores
        this.collectibleMarkers.forEach(c => c.marker.remove());
        this.collectibleMarkers = [];

        // Los coleccionables son exclusivos de GTA Online: no mostrar si el modo seleccionado es 'story'
        if (this.selectedGameMode === 'story') {
            return;
        }

        this.allCollectibles.forEach(item => {
            const isCollected = this.userProfileService.isItemCollected(item.id);

            // Comprobar si el usuario decidió ocultar coleccionables ya conseguidos
            if (this.userProfile?.hideCollectedItems && isCollected) {
                return;
            }

            // Comprobar filtro de categoría
            if (!this.layerFilters[item.category]) return;

            const [lat, lng] = this.worldToLatLng(item.position.x, item.position.y);

            const icon = L.divIcon({
                className: 'gta-pin-collectible-wrapper',
                html: `
                    <div class="gta-pin-collectible gta-pin-col-${item.category}" style="--pin-color: ${item.badge.color}">
                        <span class="gta-pin-col-symbol">${item.badge.symbol || '•'}</span>
                    </div>
                `,
                iconSize: [22, 22],
                iconAnchor: [11, 11],
                popupAnchor: [0, -13]
            });

            const popupHtml = `
                <div class="gta-popup-card">
                    <div class="popup-banner" style="background: linear-gradient(135deg, ${item.badge.color}33, #0b0f14 85%); border-bottom: 2px solid ${item.badge.color};">
                        <span class="popup-badge" style="color: ${item.badge.color}; border-color: ${item.badge.color}66">${item.categoryLabel} (#${item.number}/${item.total})</span>
                        <h4 class="popup-title">${item.name}</h4>
                        <div class="popup-zone">${item.zone}</div>
                    </div>
                    <div class="popup-content">
                        <div class="popup-row">
                            <span class="popup-tag-lbl">Pista / Ubicación:</span>
                            <span class="popup-tag-val">${item.hint}</span>
                        </div>
                        <div class="popup-row">
                            <span class="popup-tag-lbl">Recompensa:</span>
                            <span class="popup-tag-val val-income">${item.reward}</span>
                        </div>
                        <div class="popup-action-row">
                            <button
                                id="popup-btn-col-${item.id}"
                                type="button"
                                class="popup-card-action-btn ${isCollected ? 'is-owned' : ''}"
                            >
                                ${isCollected ? '✓ Conseguido · Clic para Desmarcar' : '＋ Marcar como Conseguido'}
                            </button>
                        </div>
                    </div>
                </div>
            `;

            const marker = L.marker([lat, lng], { icon })
                .bindPopup(popupHtml, { maxWidth: 320, className: 'gta-leaflet-popup' })
                .bindTooltip(`<b>${item.name}</b><br><span style="color:${item.badge.color}">${item.categoryLabel} (#${item.number}/${item.total})</span>`, {
                    direction: 'top',
                    offset: [0, -12],
                    className: 'gta-leaflet-tooltip'
                });

            marker.on('popupopen', () => {
                const btn = document.getElementById(`popup-btn-col-${item.id}`);
                if (btn) {
                    btn.onclick = () => {
                        this.toggleItemCollected(item.id);
                        marker.closePopup();
                    };
                }
            });

            marker.addTo(map);
            this.collectibleMarkers.push({ marker, item });
        });
    }

    /**
     * Alterna la visibilidad de una categoría de la leyenda
     */
    toggleLayer(categoryKey: string): void {
        this.layerFilters[categoryKey] = !this.layerFilters[categoryKey];
        this.renderPropertyMarkers();
        this.renderCollectibleMarkers();
    }

    /**
     * Vuela la cámara y centra el mapa con zoom directo sobre un personaje
     */
    zoomToCharacter(char: PropertyLocation, event?: MouseEvent): void {
        if (event) {
            event.stopPropagation();
        }
        if (!this.map) return;

        // Si el personaje está desactivado en los filtros, activarlo
        if (!this.layerFilters[char.id]) {
            this.layerFilters[char.id] = true;
            this.renderPropertyMarkers();
        }

        const [lat, lng] = this.worldToLatLng(char.position.x, char.position.y);
        const targetZoom = Math.min(this.maxZoom, 5.5);

        this.map.flyTo([lat, lng], targetZoom, {
            animate: true,
            duration: 1.1
        });

        // Abrir automáticamente el popup del personaje tras el vuelo de cámara
        setTimeout(() => {
            const match = this.propertyMarkers.find(pm => pm.property.id === char.id);
            if (match) {
                match.marker.openPopup();
            }
        }, 850);
    }

    /**
     * Alterna la apertura/cierre de la caja de leyenda
     */
    toggleLegend(): void {
        this.legendOpen = !this.legendOpen;
    }

    /**
     * Devuelve el número de elementos cargados de una categoría según el modo activo
     */
    getCategoryCount(categoryKey: string): number {
        return this.allProperties.filter(p =>
            p.category === categoryKey &&
            (p.gameMode === 'both' || p.gameMode === this.selectedGameMode)
        ).length;
    }

    /**
     * Devuelve el número de coleccionables cargados de una categoría
     */
    getCollectibleCount(categoryKey: string): number {
        return this.allCollectibles.filter(c => c.category === categoryKey).length;
    }

    /**
     * Devuelve el número de capas actualmente encendidas
     */
    getActiveLayersCount(): number {
        return Object.values(this.layerFilters).filter(v => v).length;
    }

    /**
     * Activa o desactiva todas las capas a la vez
     */
    setAllLayers(state: boolean): void {
        Object.keys(this.layerFilters).forEach(key => {
            this.layerFilters[key] = state;
        });
        this.renderPropertyMarkers();
        this.renderCollectibleMarkers();
    }

    /**
     * Alterna la apertura o cierre de un acordeón concreto dentro de la leyenda
     */
    toggleLegendSection(section: string): void {
        this.toggleSection(section);
    }

    /**
     * Devuelve el número de capas encendidas dentro de un grupo concreto
     */
    getActiveCountInSection(keys: string[]): number {
        return keys.filter(k => this.layerFilters[k]).length;
    }

    /**
     * Comprueba si todas las capas de una sección están activadas
     */
    isSectionAllActive(keys: string[]): boolean {
        return keys.length > 0 && keys.every(k => this.layerFilters[k]);
    }

    /**
     * Maneja el cambio del checkbox suelto e independiente de cada desplegable
     */
    onSectionCheckboxChange(keys: string[], event: Event): void {
        const input = event.target as HTMLInputElement;
        this.toggleAllInSection(keys, input.checked);
    }

    /**
     * Activa o desactiva todas las capas pertenecientes a un grupo de la leyenda
     */
    toggleAllInSection(keys: string[], state?: boolean): void {
        const targetState = state !== undefined ? state : !keys.every(k => this.layerFilters[k]);
        keys.forEach(k => {
            this.layerFilters[k] = targetState;
        });
        this.renderPropertyMarkers();
        this.renderCollectibleMarkers();
    }

    /**
     * Sincroniza el modo de juego (Modo Historia o GTA Online)
     * tanto desde la barra superior como desde el panel de control.
     */
    setGameMode(mode: 'story' | 'online'): void {
        this.selectedGameMode = mode;
        this.chipOffline = mode === 'story';
        this.chipOnline = mode === 'online';

        // Si cambiamos a GTA Online y teníamos un mapa UV seleccionado, volvemos a Satélite
        if (mode === 'online' && (this.currentMapType === 'UV' || this.currentMapType === 'UV2')) {
            this.switchMapType('Satellite');
        }

        this.renderPropertyMarkers();
        this.renderCollectibleMarkers();
    }

    /**
     * Cambia el filtro de modo de juego desde el selector del Panel de Control
     */
    onGameModeChange(mode: 'story' | 'online'): void {
        this.setGameMode(mode);
    }

    /**
     * Hace zoom y centra la cámara en una zona específica
     */
    onZoneChange(zone: string): void {
        this.selectedZone = zone;
        if (!this.map) return;

        switch (zone) {
            case 'city':
                this.map.flyTo([-45.5, 29], 4.2, { duration: 1.2 });
                break;
            case 'sandy':
                this.map.flyTo([-23, 40], 4.2, { duration: 1.2 });
                break;
            case 'paleto':
                this.map.flyTo([-10.5, 27.5], 4.4, { duration: 1.2 });
                break;
            case 'blaine':
                this.map.flyTo([-22, 34], 3.5, { duration: 1.2 });
                break;
            case 'chumash':
                this.map.flyTo([-34, 11], 4.2, { duration: 1.2 });
                break;
            default: // all
                this.map.flyTo([-36, 30], this.computeMinZoom(this.imageSize, this.maxZoom) + 0.5, { duration: 1 });
                break;
        }
    }

    switchMapType(mapType: string): void {
        this.currentMapType = mapType;
        this.initMap(mapType);
    }

    zoomIn(): void {
        if (this.map) {
            this.map.zoomIn();
        }
    }

    zoomOut(): void {
        if (this.map) {
            this.map.zoomOut();
        }
    }

    recenterMap(): void {
        if (this.map) {
            this.map.setView([-36, 30], this.computeMinZoom(this.imageSize, this.maxZoom) + 0.5);
        }
    }

    // ==========================================
    // MÉTODOS DE FICHA DE JUGADOR Y PROGRESO
    // ==========================================

    toggleProfileDrawer(): void {
        this.profileDrawerOpen = !this.profileDrawerOpen;
    }

    closeProfileDrawer(): void {
        this.profileDrawerOpen = false;
    }

    saveLocalProfile(): void {
        const rawNick = (this.editNickname || '').trim().replace(/<[^>]*>?/gm, '');
        const cleanNick = rawNick.substring(0, 50) || 'Jugador de Los Santos';
        const cleanRank = Math.min(Math.max(Number(this.editRank) || 1, 1), 8000);
        const cleanBank = Math.max(Number(this.editBank) || 0, 0);

        this.editNickname = cleanNick;
        this.editRank = cleanRank;
        this.editBank = cleanBank;

        this.userProfileService.saveProfile({
            nickname: cleanNick,
            rank: cleanRank,
            bank: cleanBank
        }).subscribe({
            next: () => {
                this.syncFeedbackMsg = '¡Ficha guardada!';
                setTimeout(() => this.syncFeedbackMsg = '', 2500);
            },
            error: (err) => {
                if (err?.status === 429) {
                    this.syncFeedbackMsg = 'Límite de guardados excedido. Espera unos segundos.';
                }
            }
        });
    }

    toggleHighlightOwned(): void {
        this.userProfileService.toggleHighlightOwned();
    }

    toggleHideCollected(): void {
        this.userProfileService.toggleHideCollected();
    }

    togglePropertyOwned(propertyId: string): void {
        const prop = this.allProperties.find(p => p.id === propertyId);
        if (!this.isPurchasable(prop)) {
            return;
        }

        const current = this.userProfile.ownedPropertyIds || [];
        const index = current.indexOf(propertyId);
        const updated = [...current];
        if (index >= 0) {
            updated.splice(index, 1);
        } else {
            updated.push(propertyId);
        }
        this.userProfileService.saveProfile({ ownedPropertyIds: updated }).subscribe(() => {
            this.renderPropertyMarkers();
        });
    }

    toggleItemCollected(itemId: string): void {
        const current = this.userProfile.collectedItemIds || [];
        const index = current.indexOf(itemId);
        const updated = [...current];
        if (index >= 0) {
            updated.splice(index, 1);
        } else {
            updated.push(itemId);
        }
        this.userProfileService.saveProfile({ collectedItemIds: updated }).subscribe(() => {
            this.renderCollectibleMarkers();
        });
    }

    getOwnedPropertyList(): PropertyLocation[] {
        const ids = new Set(this.userProfile.ownedPropertyIds || []);
        return this.allProperties.filter(p => ids.has(p.id) && this.isPurchasable(p));
    }

    getTotalEmpireValue(): number {
        const owned = this.getOwnedPropertyList();
        return owned.reduce((sum, p) => sum + (p.price || 0), 0);
    }

    getFormattedEmpireValue(): string {
        const val = this.getTotalEmpireValue();
        return '$' + val.toLocaleString('es-ES');
    }

    getOwnedPropertiesGrouped(): { category: string; categoryLabel: string; count: number; totalValueFormatted: string; properties: PropertyLocation[] }[] {
        const owned = this.getOwnedPropertyList();
        const map = new Map<string, { category: string; categoryLabel: string; count: number; totalValue: number; properties: PropertyLocation[] }>();

        for (const p of owned) {
            const cat = p.category || 'otros';
            if (!map.has(cat)) {
                map.set(cat, {
                    category: cat,
                    categoryLabel: p.categoryLabel || cat,
                    count: 0,
                    totalValue: 0,
                    properties: []
                });
            }
            const group = map.get(cat)!;
            group.count++;
            group.totalValue += (p.price || 0);
            group.properties.push(p);
        }

        return Array.from(map.values()).map(g => ({
            ...g,
            totalValueFormatted: '$' + g.totalValue.toLocaleString('es-ES')
        }));
    }

    toggleDrawerGroup(category: string): void {
        this.drawerGroupOpen[category] = !this.isDrawerGroupOpen(category);
    }

    isDrawerGroupOpen(category: string): boolean {
        return this.drawerGroupOpen[category] !== false;
    }

    clearOwnedProperties(): void {
        this.userProfileService.saveProfile({ ownedPropertyIds: [] }).subscribe(() => {
            this.renderPropertyMarkers();
        });
    }

    onConnectAccount(): void {
        this.authErrorMsg = '';
        this.authSuccessMsg = '';

        const tag = (this.authGamertag || '').trim();
        const pin = (this.authPin || '').trim();

        if (tag.length < 2 || tag.length > 30) {
            this.authErrorMsg = 'El Gamertag debe tener entre 2 y 30 caracteres.';
            return;
        }

        if (!/^[a-zA-Z0-9_-]+$/.test(tag)) {
            this.authErrorMsg = 'El Gamertag solo puede contener letras, números, guiones y guiones bajos.';
            return;
        }

        if (!/^\d{4,6}$/.test(pin)) {
            this.authErrorMsg = 'El PIN debe ser un código numérico de 4 a 6 dígitos.';
            return;
        }

        this.authLoading = true;
        this.userProfileService.connectAccount(tag, pin).subscribe({
            next: (res) => {
                this.authLoading = false;
                if (res.success) {
                    this.authSuccessMsg = res.message;
                    this.authPin = '';
                    this.editNickname = res.profile?.nickname || tag;
                    setTimeout(() => this.authSuccessMsg = '', 4000);
                } else {
                    this.authErrorMsg = res.message;
                }
            },
            error: (err) => {
                this.authLoading = false;
                if (err?.status === 429) {
                    this.authErrorMsg = 'Demasiados intentos. Por seguridad, espera 1 minuto antes de reintentar.';
                } else {
                    this.authErrorMsg = err?.error?.message || 'No se pudo conectar con el servidor.';
                }
            }
        });
    }

    onDisconnectAccount(): void {
        this.userProfileService.disconnectAccount();
        this.authSuccessMsg = 'Sesión cerrada. Ahora estás en modo local.';
        this.authPin = '';
        setTimeout(() => this.authSuccessMsg = '', 3500);
    }

    onAvatarFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        const file = input.files[0];
        if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            const img = new Image();
            img.onload = () => {
                // Redimensionar con canvas a máximo 160x160 para que ocupe ~10-15KB y sea instantáneo
                const maxSize = 160;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxSize) {
                        height = Math.round((height * maxSize) / width);
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width = Math.round((width * maxSize) / height);
                        height = maxSize;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

                    this.userProfileService.saveProfile({ avatarUrl: compressedDataUrl }).subscribe(() => {
                        this.syncFeedbackMsg = '¡Foto de perfil actualizada!';
                        setTimeout(() => this.syncFeedbackMsg = '', 3000);
                    });
                }
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
        input.value = '';
    }

    removeAvatar(): void {
        this.userProfileService.saveProfile({ avatarUrl: undefined }).subscribe(() => {
            this.syncFeedbackMsg = 'Foto eliminada. Iniciales restauradas.';
            setTimeout(() => this.syncFeedbackMsg = '', 3000);
        });
    }
}
