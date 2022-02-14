/** @param {NS} ns **/
export async function main(ns) {
    var args = ns.args;

	var attackTarget = args[0];
	var script = args[1];

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

		if (server == 'darkweb' || server == 'haxor-1') continue; // skip darkweb/haxor-1
		
		// if we don't have root access attempt to gain it
		var hasRoot = ns.hasRootAccess(server);
		if (!hasRoot) {
			hasRoot = await attack(server,ns);
		}

		if (hasRoot) {
			var numThreads = await payload(server, script, attackTarget, ns);
			totalThreads = totalThreads + numThreads;
			if (numThreads > 0) { totalServers++; }
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

		await ns.sleep(1);
	}

	ns.tprint(`Started ${totalThreads} threads across ${totalServers} servers!`);
}

// if able, nukes the target server
// returns true if successful
async function attack ( target, ns ) {
	// attempt to breach target
	var breachLevel = 0;
	if (ns.fileExists('BruteSSH.exe', 'home')) { ns.brutessh(target); breachLevel++; }
	if (ns.fileExists('FTPCrack.exe', 'home')) { ns.ftpcrack(target); breachLevel++; }
	if (ns.fileExists('relaySMTP.exe', 'home')) { ns.relaysmtp(target); breachLevel++; }
	if (ns.fileExists('HTTPWorm.exe', 'home')) { ns.httpworm(target); breachLevel++; }
	if (ns.fileExists('SQLInject.exe', 'home')) { ns.sqlinject(target); breachLevel++; } 
	
	// if we can gain root access nuke it
	if (ns.getServerNumPortsRequired(target) <= breachLevel) {
		ns.nuke(target);
	}
	
	// if we don't have access after nuke it must have failed
	if (!ns.hasRootAccess(target)) {
		ns.tprint(`Failed to nuke ${target}!`);
		return false;
	}
	else {
		ns.tprint(`Successfully nuked ${target}!`);
		return true;
	}
}

// distributes the hack program on the server
async function payload ( host, script, target, ns ) {
	var cost = ns.getScriptRam(script, 'home');
	var availableRam = ns.getServerMaxRam(host) - ns.getServerUsedRam(host);
	var threads = Math.floor( availableRam / cost );

	//ns.tprint(`Available RAM on ${host}: ${availableRam}`);
	//ns.tprint(`Available threads on ${host}: ${threads}`);

	if (threads == 0) {
		ns.tprint(`No space to start threads on ${host}`);
		return 0;
	}

	await ns.scp(script, 'home', host);
	if (ns.exec(script, host, threads, target) == 0) {
		ns.tprint(`Failed to start threads on ${host}`);
	}
	else
	{
		ns.tprint(`Successfully started ${threads} threads on ${host}`);
		return threads;
	}
}