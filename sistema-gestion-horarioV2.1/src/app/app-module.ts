import { NgModule, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { AppRoutingModule } from './app-routing-module';
import { jwtInterceptor } from './interceptors/jwt.interceptor';

import { App } from './app';
import { MainLayoutComponent } from './layout/main-layout.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { MiHorarioComponent } from './mi-horario/mi-horario.component';
import { AsignarClaseComponent } from './asignar-clase/asignar-clase.component';
import { MisClasesComponent } from './mis-clases/mis-clases.component';

@NgModule({
  declarations: [
    App,
    MainLayoutComponent,
    DashboardComponent,
    MiHorarioComponent,
    AsignarClaseComponent,
    MisClasesComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule
  ],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withInterceptors([jwtInterceptor])),
  ],
  bootstrap: [App]
})
export class AppModule { }
