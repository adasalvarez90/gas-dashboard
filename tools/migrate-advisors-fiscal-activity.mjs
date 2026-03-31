import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const VALID_FISCAL_ACTIVITIES = [
	'RESICO',
	'PERSONA_FISICA_ACTIVIDAD_EMPRESARIAL',
];

function getArgValue(flag) {
	const arg = process.argv.find((a) => a.startsWith(`${flag}=`));
	if (!arg) return null;
	return arg.split('=')[1] ?? null;
}

function hasFlag(flag) {
	return process.argv.includes(flag);
}

function parseMode() {
	const dryRun = hasFlag('--dry-run');
	const apply = hasFlag('--apply');

	if (dryRun && apply) {
		throw new Error('Use only one mode: --dry-run or --apply');
	}

	if (!dryRun && !apply) {
		return 'dry-run';
	}

	return dryRun ? 'dry-run' : 'apply';
}

function parseFiscalActivity() {
	const value = getArgValue('--value') || 'RESICO';

	if (!VALID_FISCAL_ACTIVITIES.includes(value)) {
		throw new Error(
			`Invalid --value. Allowed: ${VALID_FISCAL_ACTIVITIES.join(', ')}`
		);
	}

	return value;
}

function parseServiceAccountPath() {
	const cliValue = getArgValue('--service-account');
	const envValue = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
	const value = cliValue || envValue;

	if (!value) {
		throw new Error(
			'Missing service account path. Use --service-account=<path> or set FIREBASE_SERVICE_ACCOUNT_PATH/GOOGLE_APPLICATION_CREDENTIALS'
		);
	}

	return resolve(value);
}

function getServiceAccount(path) {
	const raw = readFileSync(path, 'utf8');
	return JSON.parse(raw);
}

function needsMigration(advisor) {
	const value = advisor?.fiscalActivity;
	return value === undefined || value === null || value === '';
}

async function run() {
	const mode = parseMode();
	const fiscalActivity = parseFiscalActivity();
	const serviceAccountPath = parseServiceAccountPath();

	console.log('Starting advisor fiscal activity migration...');
	console.log(`Mode: ${mode}`);
	console.log(`Target value: ${fiscalActivity}`);
	console.log(`Service account: ${serviceAccountPath}`);

	const serviceAccount = getServiceAccount(serviceAccountPath);
	const app = getApps().length
		? getApps()[0]
		: initializeApp({
			credential: cert(serviceAccount),
		});
	const db = getFirestore(app);

	const snap = await db
		.collection('advisors')
		.where('_on', '==', true)
		.get();

	const advisors = snap.docs.map((d) => ({
		docId: d.id,
		...d.data(),
	}));

	const toMigrate = advisors.filter(needsMigration);

	console.log(`Active advisors read: ${advisors.length}`);
	console.log(`Advisors requiring migration: ${toMigrate.length}`);

	if (toMigrate.length > 0) {
		console.table(
			toMigrate.map((a) => ({
				docId: a.docId,
				uid: a.uid,
				name: a.name,
				hierarchyLevel: a.hierarchyLevel,
				fiscalActivity: a.fiscalActivity ?? '(missing)',
			}))
		);
	}

	if (mode === 'dry-run') {
		console.log('Dry run finished. No writes performed.');
		return;
	}

	let updated = 0;
	for (const advisor of toMigrate) {
		await db.collection('advisors').doc(advisor.docId).update({
			fiscalActivity,
			_update: Date.now(),
		});
		updated += 1;
	}

	console.log('Migration completed successfully.');
	console.log(`Updated advisors: ${updated}`);
}

run().catch((error) => {
	console.error('Migration failed:', error);
	process.exit(1);
});
