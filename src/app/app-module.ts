import { NgModule, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { AppRoutingModule } from './app-routing-module';
import { jwtInterceptor } from './interceptors/jwt.interceptor';

import { App } from './app';
import { MainLayoutComponent } from './layout/main-layout.component';
import { LoginComponent } from './login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { MiHorarioComponent } from './mi-horario/mi-horario.component';
import { AsignarClaseComponent } from './asignar-clase/asignar-clase.component';
import { MateriasComponent } from './materias/materias.component';
import { GruposComponent } from './grupos/grupos.component';
import { UsuariosComponent } from './usuarios/usuarios.component';

@NgModule({
  declarations: [
    App,
    MainLayoutComponent,
    LoginComponent,
    DashboardComponent,
    MiHorarioComponent,
    AsignarClaseComponent,
    MateriasComponent,
    GruposComponent,
    UsuariosComponent
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
