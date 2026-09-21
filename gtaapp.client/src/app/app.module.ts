import { CommonModule } from '@angular/common';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { GtaMapComponent } from './gta-map/gta-map.component';
import { Gta6Component } from './gta6/gta6.component';
import { HomeComponent } from './home/home.component';
import { AppRoutingModule } from './app-routing.module';

@NgModule({ declarations: [
        AppComponent,
        GtaMapComponent,
        Gta6Component,
        HomeComponent
    ],
    bootstrap: [AppComponent], imports: [BrowserModule, CommonModule, AppRoutingModule], providers: [provideHttpClient(withInterceptorsFromDi())] })
export class AppModule { }