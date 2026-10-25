import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { MiHorarioComponent } from './mi-horario/mi-horario.component';
import { AsignarClaseComponent } from './asignar-clase/asignar-clase.component';
import { MisClasesComponent } from './mis-clases/mis-clases.component';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'horario', component: MiHorarioComponent },
      { path: 'horario/asignar', component: AsignarClaseComponent },
      { path: 'horario/clases', component: MisClasesComponent }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
