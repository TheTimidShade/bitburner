/** @param {NS} ns **/
export async function main(ns) {
    var args = ns.args;

	var scriptName = args[0];
	var scriptTarget = args[1];

	let queuedServers = new Map();
	var totalThreads = 0;
	var totalServers = 0;

	// add home and darkweb to the already checked list so we don't run on it
	queuedServers.set('home', true);

	// queue servers connected to home
	var servers = ns.scan('home');
	for (const server of servers) { queuedServers.set(server, true); }
	//ns.tprint(`Found servers connected to home: ${servers}`);

	// while there are servers remaining in the queue
	while (servers.length > 0) {
		// get first server in the queue
		var server = servers[0];
		servers.splice(0, 1);

		if (server == 'darkweb') continue; // skip darkweb
		
		if (ns.scriptRunning(scriptName, server)) {
			var scriptInfo = ns.getRunningScript(scriptName, server, scriptTarget);
			totalServers++;
			totalThreads += scriptInfo.threads;
		}
		
		// check connected servers for any servers that have not been queued
		var connectedServers = ns.scan(server);
		for (const connectedServer of connectedServers) {
			if (!queuedServers.get(connectedServer)) {
				//ns.tprint(`Found new server: ${connectedServer}`);
				servers.push(connectedServer);
				queuedServers.set(connectedServer, true);
			}
		}

		await ns.sleep(10);
	}

	ns.tprint(`${scriptName} has ${totalThreads} threads running across ${totalServers} servers!`);
}