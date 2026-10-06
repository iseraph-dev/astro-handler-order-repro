import { spawn } from 'node:child_process';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = 4413;

const child = spawn(
	process.execPath,
	[path.join(root, 'node_modules/astro/bin/astro.mjs'), 'dev', '--port', String(port), '--host', '127.0.0.1'],
	{
		cwd: root,
		detached: true,
		env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', FORCE_COLOR: '0' },
		stdio: ['ignore', 'pipe', 'pipe'],
	},
);

let log = '';
const capture = (chunk) => {
	log += chunk.toString();
	if (log.length > 250_000) log = log.slice(-120_000);
};
child.stdout?.on('data', capture);
child.stderr?.on('data', capture);

const stop = () => {
	if (!child.pid) return;
	try {
		process.kill(-child.pid, 'SIGTERM');
	} catch {
		try {
			child.kill('SIGTERM');
		} catch {
			// already gone
		}
	}
};

async function get(requestPath) {
	const deadline = Date.now() + 180_000;
	let lastError;
	while (Date.now() < deadline) {
		if (child.exitCode != null) throw new Error(`astro dev exited ${child.exitCode}\n${log.slice(-5000)}`);
		try {
			const response = await fetch(`http://127.0.0.1:${port}${requestPath}`, { redirect: 'manual' });
			const body = await response.text();
			return {
				status: response.status,
				location: response.headers.get('location'),
				body: body.replace(/\s+/g, ' ').trim(),
			};
		} catch (error) {
			lastError = error;
			await delay(400);
		}
	}
	throw new Error(`no connection to 127.0.0.1:${port}: ${lastError}\n${log.slice(-5000)}`);
}

const expected = [
	{ path: '/', status: 302, location: '/en', bodyIncludes: null },
	{ path: '/en', status: 200, location: null, bodyIncludes: 'EN' },
	{ path: '/old', status: 301, location: '/en', bodyIncludes: null },
];

try {
	const failures = [];
	for (const row of expected) {
		const actual = await get(row.path);
		const bodyOk = row.bodyIncludes == null || actual.body.includes(row.bodyIncludes);
		const ok = actual.status === row.status && actual.location === row.location && bodyOk;
		console.log(`${ok ? 'OK' : 'FAIL'} ${row.path} -> ${actual.status} location=${actual.location ?? '-'}`);
		if (!ok) {
			failures.push(
				`${row.path}: got ${actual.status} location=${actual.location} body=${JSON.stringify(actual.body.slice(0, 120))}`,
			);
		}
	}
	if (failures.length > 0) {
		console.log(failures.join('\n'));
		console.log(log.slice(-2000));
		process.exitCode = 1;
	} else {
		console.log('baseline order holds');
	}
} finally {
	stop();
	await delay(300);
	if (child.pid) {
		try {
			process.kill(-child.pid, 'SIGKILL');
		} catch {
			// already gone
		}
	}
}
