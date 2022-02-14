/** @param {NS} ns **/
export async function main(ns) {
    var args = ns.args;

	var filename = args[0];
	var hostname = ns.getHostname();

	let queuedServers = new Map();

	// add home to the already checked list so we don't run on it
	queuedServers.set('home', true);

	// queue servers connected to home
	var servers = ns.scan(hostname);
	for (const server of servers) { queuedServers.set(server, true); }
	//ns.tprint(`Found servers connected to home: ${servers}`);

	// while there are servers remaining in the queue
	while (servers.length > 0) {
		// get first server in the queue
		var server = servers[0];
		servers.splice(0, 1);
		
		// delete the file if it exists
		if (ns.fileExists(filename, server)) {
			ns.tprint(`Removed file from ${server}`);
			ns.rm(filename, server);
		}
		else {
			ns.tprint(`File not found on ${server}`);
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
	}
}