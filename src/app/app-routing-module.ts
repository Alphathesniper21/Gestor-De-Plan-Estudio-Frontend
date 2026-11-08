import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard, gestorGuard } from './guards/auth.guard';
import { MainLayoutComponent } from './layout/main-layout.component';
import { LoginComponent } from './login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { MiHorarioComponent } from './mi-horario/mi-horario.component';
import { AsignarClaseComponent } from './asignar-clase/asignar-clase.component';
import { MateriasComponent } from './materias/materias.component';
import { GruposComponent } from './grupos/grupos.component';
import { UsuariosComponent } from './usuarios/usuarios.component';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'horario', component: MiHorarioComponent },
      { path: 'horario/asignar', component: AsignarClaseComponent, canActivate: [gestorGuard] },
      { path: 'materias', component: MateriasComponent },
      { path: 'grupos', component: GruposComponent },
      { path: 'usuarios', component: UsuariosComponent, canActivate: [gestorGuard] }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
