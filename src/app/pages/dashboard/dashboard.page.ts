import { logout } from './../../store/auth/auth.actions';
import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { AuthFacade } from 'src/app/store/auth/auth.facade';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit {
  public menu = [
    {
      name: 'Home',
      role: 2,
      pages: [
        {
          name: 'Chats',
          url: '/dashboard/chats',
          icon: 'matGroupAdd',
          role: 2,
          hidden: false,
          badge: '',
        },
      ],
    },
    {
      name: 'Bandejas',
      role: 1,
      pages: [
        {
          name: 'Clientes',
          url: '/dashboard/clients',
          icon: 'matManageAccounts',
          role: 1,
          hidden: false,
          badge: '',
        },
      ],
    },
    // {
    // 	name: 'Métricas',
    // 	role: 1,
    // 	pages: [
    // 		{ name: 'Por usuarios', url: '/dashboard/metrics', icon: 'matPoll', role: 1, hidden: false, badge: '' },
    // 		{ name: 'Por sedes', url: '/dashboard/analytics', icon: 'matPoll', role: 1, hidden: false, badge: '' },
    // 	]
    // },
    {
      name: 'Herramientas',
      role: 1,
      pages: [
        {
          name: 'Vincular dispositivo',
          url: '/dashboard/link-device',
          icon: 'matPhoneIphone',
          role: 1,
          hidden: false,
          badge: '',
        },
        {
          name: 'Carga de archivo',
          url: '/dashboard/process-file',
          icon: 'matFileUpload',
          role: 1,
          hidden: false,
          badge: '',
        },
        {
          name: 'Mesnajes automáticos',
          url: '/dashboard/automatic-messages',
          icon: 'matTextsms',
          role: 1,
          hidden: false,
          badge: '',
        },
      ],
    },
    {
      name: 'Administración',
      role: 1,
      pages: [
        {
          name: 'Sedes',
          url: '/dashboard/headquarters',
          icon: 'matLayers',
          role: 1,
          hidden: false,
          badge: '',
        },
        {
          name: 'Usuarios',
          url: '/dashboard/users',
          icon: 'matPeople',
          role: 1,
          hidden: false,
          badge: '',
        },
      ],
    },
    {
      name: 'Super administrador',
      role: 0,
      pages: [
        {
          name: 'Vincular Dispositivo',
          url: '/dashboard/super-admin-link-device',
          icon: 'matPhoneIphone',
          role: 0,
          hidden: false,
          badge: '',
        },
        {
          name: 'Países',
          url: '/dashboard/countries',
          icon: 'matLayers',
          role: 0,
          hidden: false,
          badge: '',
        },
        {
          name: 'Estados',
          url: '/dashboard/provinces',
          icon: 'matLayers',
          role: 0,
          hidden: false,
          badge: '',
        },
        {
          name: 'Empresas',
          url: '/dashboard/companies',
          icon: 'matLayers',
          role: 0,
          hidden: false,
          badge: '',
        },
      ],
    },
  ];

  auth$ = this.authFacade.user$;
  constructor(
    private authFacade: AuthFacade,
    private alertCtrl: AlertController,
  ) {}

  ngOnInit() {}

  logout() {
    // Confirm logout action
    this.alertCtrl
      .create({
        header: 'Cerrar sesión',
        message: '¿Estás seguro de que deseas cerrar sesión?',
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel',
          },
          {
            text: 'Cerrar sesión',
            role: 'confirm',
            handler: () => {
              this.authFacade.logout();
            },
          },
        ],
      })
      .then((alert) => alert.present());
  }
}
