import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import * as L from 'leaflet';

@Component({
    selector: 'app-gta-map',
    templateUrl: './gta-map.component.html',
    styleUrls: ['./gta-map.component.css'],
    standalone: false
})
export class GtaMapComponent implements AfterViewInit, OnDestroy {

    private map: L.Map | undefined;

    // Mapa base: imagen oficial de 8192x8192 px troceada en tiles de 256px.
    // En el zoom maximo (7) el mapa ocupa 32x32 tiles.
    private readonly maxZoom = 7;
    private readonly imageSize = 8192;

    readonly mapTypes = [
        { id: 'Satellite', label: 'Satelite' },
        { id: 'Roadmap', label: 'Carreteras' },
        { id: 'Atlas', label: 'Atlas' }
    ];

    currentMapType = 'Satellite';

    // HUD: filtros/colecciones + estado de conexion (solo maquetacion, sin datos reales)
    chipColeccionables = true;
    chipNegocios = true;
    chipMisiones = false;
    chipOnline = false;
    chipOffline = true;

    // Panel de control: estado de los acordeones por seccion (solo maquetacion)
    accordion: { [key: string]: boolean } = {
        modo: true,
        radio: true,
        seguridad: false,
        zona: false
    };

    toggleSection(section: string): void {
        this.accordion[section] = !this.accordion[section];
    }

    // Menu contextual (click derecho sobre el mapa): posicion en px + visibilidad
    ctxOpen = false;
    ctxX = 0;
    ctxY = 0;

    openContextMenu(event: MouseEvent): void {
        event.preventDefault();
        this.ctxOpen = true;
        this.ctxX = event.clientX;
        this.ctxY = event.clientY;
    }

    closeContextMenu(): void {
        this.ctxOpen = false;
    }

    runCtxAction(action: string): void {
        this.ctxOpen = false;
    }

    ngAfterViewInit(): void {
        this.initMap(this.currentMapType);
        window.addEventListener('resize', this.onWindowResize);
    }

    ngOnDestroy(): void {
        window.removeEventListener('resize', this.onWindowResize);
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
            zoom: minZoom,
            center: [-32, 32],
            maxBounds: mapBounds,
            zoomControl: false,
            attributionControl: false
        });

        const tileLayer = L.tileLayer(`assets/${mapType}/{z}_{x}_{y}.jpg`, {
            tileSize: 256,
            minZoom: 0,
            maxZoom: this.maxZoom,
            errorTileUrl: `assets/${mapType}/empty.jpg`,
            noWrap: true
        });

        tileLayer.addTo(this.map);

        this.addDefaultMarkers();
    }

    private addDefaultMarkers(): void {
        if (!this.map) return;

        const yellowIcon = L.icon({
            iconUrl: 'assets/yellow-dot.png',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });

        const markers = [
            { lat: -34, lng: 30, label: 'Casa de Michael' },
            { lat: -29, lng: 23, label: 'Casa de Franklin' },
            { lat: -8, lng: 46, label: 'Caravana de Trevor' }
        ];

        markers.forEach(m => {
            L.marker([m.lat, m.lng], { icon: yellowIcon })
                .bindPopup(`<b>${m.label}</b>`)
                .addTo(this.map!);
        });
    }

    switchMapType(mapType: string): void {
        this.currentMapType = mapType;
        this.initMap(mapType);
    }

    // ---------------------------------------------------------------
    // HUD: acciones rapidas del mapa
    // ---------------------------------------------------------------
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
            this.map.setView([-32, 32], this.map.getZoom());
        }
    }
}
