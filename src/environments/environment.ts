// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
	production: false,

	appUrl: 'http://localhost:8100',
	emailJs: {
		serviceId: 'service_xxxx',
		inviteTemplateId: 'template_invite',
		publicKey: 'public_xxxxx',
	},

	// Your web app's Firebase configuration
	firebase: {
		apiKey: "AIzaSyAU5hrP03em0AYKMlwG74YQ9I2_vnHEmKE",
		authDomain: "nexora-e8238.firebaseapp.com",
		projectId: "nexora-e8238",
		storageBucket: "nexora-e8238.firebasestorage.app",
		messagingSenderId: "65807573709",
		appId: "1:65807573709:web:bd0bf7c9cf377b310fff84"
	},
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
