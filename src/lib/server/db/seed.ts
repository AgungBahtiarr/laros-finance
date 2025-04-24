import { authClient } from '$lib/auth-client';

async function main() {
	const user = await authClient.signUp.email({
		name: 'Admin2',
		email: 'admin2@laros.ae',
		username: 'admin2',
		displayUsername: 'admin2',
		password: 'Larosndo12..'
	});

	console.log(user);
}

main();
