/** @param {NS} ns **/
let serverList = [];
let serverListHackable = [];

let minMoneyThreshold = 0.75;

export async function main(ns) {
    var args = ns.args;
	var params = ns.flags([
		['debug', false],
		['usehome', false]
	]);

	var debug = params.debug;

	// disable logging
	ns.disableLog('ALL');

	// populate the server lists
	// taskable servers are listed in descending order of size
	serverList = await getAllServers(params.usehome, ns);
	ns.print(`Discovered servers with memory:`);
	for (const server of serverList) { ns.print(`  ${server.serverName}`); }

	// hackable servers are unordered
	serverListHackable = await getHackableServers(ns);
	ns.print(`Hackable servers:`);
	for (const server of serverListHackable) { ns.print(`  ${server}`); }

	// begin tasking
	while (true) {
		for (const server of serverListHackable) {
			var securityLevel = ns.getServerSecurityLevel(server);
			var minSecurityLevel = ns.getServerMinSecurityLevel(server);
			var moneyAvailable = ns.getServerMoneyAvailable(server);
			var moneyMax = ns.getServerMaxMoney(server);

			if (await taskActive('any', server, ns)) {
				if (debug) ns.print(`Task already active on ${server}, skipping`);
				continue;
			}

			if (securityLevel > minSecurityLevel) {
				ns.print(`${server} security level is higher than minimum, lowering`);
				await startTask('weaken', server, ns);
			} else if (moneyAvailable < moneyMax) {
				ns.print(`${server} money level is lower than max, raising`);
				await startTask('grow', server, ns);
			} else {
				ns.print(`${server} is ready for hack, hacking`);
				await startTask('hack', server, ns);
			}

			await ns.sleep(100);
		}
		
		// scan for any new servers
		ns.print(`Scanning for new servers...`);
		serverList = await getAllServers(params.usehome, ns);
		serverListHackable = await getHackableServers(ns);
		await ns.sleep(5000);
		
	}
}

async function startTask (task, attackTarget, ns) {
	
	switch (task) {
		case 'weaken':
			//ns.print(`Tasker starting weaken task...`);
			await taskWeaken(attackTarget, ns)
			break;
		case 'grow':
			//ns.print(`Tasker starting grow task...`);
			await taskGrow(attackTarget, ns)
			break;
		case 'hack':
			//ns.print(`Tasker starting hack task...`);
			await taskHack(attackTarget, ns)
			break;
		
		default:
			ns.print(`Invalid task '${task}' passed to tasker`);

	}
}

async function taskWeaken (attackTarget, ns) {
	// calculate threads needed to lower security level to min
	// weaken on a single thread lowers by 0.05
	var minSec = ns.getServerMinSecurityLevel(attackTarget);
	var currentSec = ns.getServerSecurityLevel(attackTarget);
	
	var threadsRequired = Math.ceil((currentSec - minSec)/0.05);

	if (threadsRequired == 0) {
		ns.print(`Weaken task aborted: ${attackTarget} at minimum security level`);
	}

	//ns.print(`${threadsRequired} threads required for weaken on ${attackTarget}`);

	//ns.print(`Allocating threads for weaken task...`);
	await allocateThreads(attackTarget, threadsRequired, 'weaken.js', ns);
}

async function taskGrow (attackTarget, ns) {
	// calculate threads needed to raise money level to maximum
	var maxMoney = ns.getServerMaxMoney(attackTarget);
	var currentMoney = ns.getServerMoneyAvailable(attackTarget);
	var moneyPercent = currentMoney/maxMoney;
	var multiplier = 1/moneyPercent;

	var threadsRequired = Math.ceil(ns.growthAnalyze(attackTarget, multiplier));

	if (threadsRequired == 0) {
		ns.print(`Grow task aborted: ${attackTarget} at maximum money`);
	}

	//ns.print(`${threadsRequired} threads required for grow on ${attackTarget}`);

	//ns.print(`Allocating threads for grow task...`);
	await allocateThreads(attackTarget, threadsRequired, 'grow.js', ns);
}

async function taskHack (attackTarget, ns) {
	// calculate the number of threads needed to lower money to threshold
	var maxMoney = ns.getServerMaxMoney(attackTarget);
	var currentMoney = ns.getServerMoneyAvailable(attackTarget);
	var moneyPercent = currentMoney/maxMoney;

	if (moneyPercent <= minMoneyThreshold) {
		ns.print(`Hack task aborted: ${attackTarget} is already below minimum money threshold`);
		return;
	}
		
	var decreasePercent = moneyPercent - minMoneyThreshold;
	var decreasePerThread = ns.hackAnalyze(attackTarget);

	var threadsRequired = Math.ceil(decreasePercent/decreasePerThread);

	//ns.print(`${threadsRequired} threads required for hack on ${attackTarget}`);

	//ns.print(`Allocating threads for hack task...`);
	await allocateThreads(attackTarget, threadsRequired, 'hack.js', ns);
}

// allocates a number of threads to the given task
async function allocateThreads (attackTarget, requiredThreads, script, ns) {
	var usedThreads = 0;
	var scriptCost = ns.getScriptRam(script, 'home');
	//ns.print(`Cost for ${script}: ${scriptCost}`);

	// iterate through servers and allocate free space to routine
	for (const host of serverList) {
		if (requiredThreads == 0) break;
		
		// find out how much space is available on this host
		var hostName = host.serverName;
		var freeMem = (ns.getServerMaxRam(hostName) - ns.getServerUsedRam(hostName));

		if (hostName == 'home')
		{
			freeMem = freeMem - 0.2 * ns.getServerMaxRam(hostName); // only use 80% of home memory
			if (freeMem < 0) freeMem = 0;
		}

		var availableThreads = Math.floor(freeMem/scriptCost);
		
		if (availableThreads > 0) {
			//ns.print(`${availableThreads} threads available for ${script} on ${hostName}`);
		} else {
			//ns.print(`No threads available for ${script} on ${hostName}`);
			continue;
		}

		// if all the required threads are available, use them otherwise use as many as we can
		var threadsToUse = 0;
		if (requiredThreads <= availableThreads)
			threadsToUse = requiredThreads;
		else
			threadsToUse = availableThreads;

		// attempt to execute the script on the server using the number of threads
		if ( ns.exec(script, hostName, threadsToUse, attackTarget) ) {
			//ns.print(`Allocated ${threadsToUse} threads to ${script} on ${hostName}, target: ${attackTarget}`);
			usedThreads += threadsToUse;
			requiredThreads -= threadsToUse;

			// run the notifier script to let us know the effects
			if (script == 'grow.js' || script == 'weaken.js')
				ns.run('notifier.js', 1, hostName, script, attackTarget, 0);
			else if (script == 'hack.js')
				ns.run('notifier.js', 1, hostName, script, attackTarget, ns.getServerMoneyAvailable(attackTarget));

		} else 
			ns.print(`Failed to allocate ${threadsToUse} threads to ${script} on ${hostName}`);

		await ns.sleep(1);
	}
	
	if (usedThreads > 0) ns.print(`  Successfully allocated ${usedThreads} threads to run ${script} targeting ${attackTarget}!`);
	if (requiredThreads > 0) {
		ns.print(`  Unable to allocate ${requiredThreads} threads to run ${script} targeting ${attackTarget}!`);
		ns.toast(`Unable to allocate ${requiredThreads} threads to run ${script} targeting ${attackTarget}!`, 'warning');
	}
}

// returns all servers with memory useable for tasking
// list is sorted in descending order of memory
async function getAllServers (useHome, ns) {
	var allServers = [];
	
	var queuedServers = new Map();

	// add home to the already checked list so we don't run on it
	queuedServers.set('home', true);

	// queue servers connected to home
	var servers = ns.scan('home');
	for (const server of servers) 
		queuedServers.set(server, true); 

	if (useHome) servers.push('home');

	// while there are servers remaining in the queue
	while (servers.length > 0) {
		// get first server in the queue
		var server = servers[0];
		servers.splice(0, 1);

		if (server == 'darkweb') continue; // skip darkweb
		
		// if we don't have root access attempt to gain it
		if (!ns.hasRootAccess(server)) {
			await attack(server,ns);
		}

		// if we have root access create an object for this server containing the info we need
		if (ns.hasRootAccess(server)) {
			var serverMemory = ns.getServerMaxRam(server);
			var serverInfo = {
				serverName:server,
				memory:serverMemory
			};

			// only add servers that have useable memory, copy the latest task files to the server
			if (serverMemory > 0) {
				var files = ['weaken.js', 'grow.js', 'hack.js'];
				await ns.scp(files, 'home', server);
				allServers.push(serverInfo);
			}
			
		}
		
		// check connected servers for any servers that have not been queued
		var connectedServers = ns.scan(server);
		for (const connectedServer of connectedServers) {
			if (!queuedServers.get(connectedServer)) {
				servers.push(connectedServer);
				queuedServers.set(connectedServer, true);
			}
		}

		await ns.sleep(1);
	}

	allServers.sort( function (a, b) { return b.memory - a.memory; } );

	return allServers;
}

// returns all servers with money to steal
async function getHackableServers (ns) {
	var hackableServers = [];
	
	var queuedServers = new Map();

	// add home to the already checked list so we don't run on it
	queuedServers.set('home', true);

	// queue servers connected to home
	var servers = ns.scan('home');
	for (const server of servers) 
		queuedServers.set(server, true); 

	// while there are servers remaining in the queue
	while (servers.length > 0) {
		// get first server in the queue
		var server = servers[0];
		servers.splice(0, 1);

		// check connected servers for any servers that have not been queued
		var connectedServers = ns.scan(server);
		for (const connectedServer of connectedServers) {
			if (!queuedServers.get(connectedServer)) {
				servers.push(connectedServer);
				queuedServers.set(connectedServer, true);
			}
		}

		if (ns.getServerMaxMoney(server) == 0 || ns.getServerRequiredHackingLevel(server) > ns.getHackingLevel()) { // skip servers with no money available or too high level to hack
			//ns.print(`${server} has no money or is too high level to hack`);
			continue
		} else {
			//ns.print(`${server} is a suitable hack target`);
		}
		
		// if we don't have root access attempt to gain it
		if (!ns.hasRootAccess(server)) {
			await attack(server,ns);
		}

		// if we have root access create an object for this server containing the info we need
		if (ns.hasRootAccess(server)) {
			//ns.print(`${server} has root access, adding to hack list`);
			hackableServers.push(server);
		} else {
			//ns.print(`No root access on ${server}, ignoring`);
		}
		
		await ns.sleep(1);
	}

	return hackableServers;
}

// if able, nukes the target server
// returns true if successful
async function attack (target, ns) {
	if (ns.hasRootAccess(target)) return true;

	var breachLevel = 0;
	if (ns.fileExists('BruteSSH.exe', 'home')) { ns.brutessh(target); breachLevel++; } 
	if (ns.fileExists('FTPCrack.exe', 'home')) { ns.ftpcrack(target); breachLevel++; }
	if (ns.fileExists('relaySMTP.exe', 'home')) { ns.relaysmtp(target); breachLevel++; } 
	if (ns.fileExists('HTTPWorm.exe', 'home')) { ns.httpworm(target); breachLevel++; } 
	if (ns.fileExists('SQLInject.exe', 'home')) { ns.sqlinject(target); breachLevel++; } 

	if (ns.getServerNumPortsRequired(target) <= breachLevel)
		ns.nuke(target);

	// if we don't have access after nuke it must have failed
	if (!ns.hasRootAccess(target)) {
		ns.print(`Failed to nuke ${target}!`);
		return false;
	}
	else {
		ns.print(`Successfully nuked ${target}!`);
		return true;
	}

	
}

// checks if the given task is currently targeting the server
async function taskActive (task, attackTarget, ns) {
	var taskScript = 'none';
	switch (task) {
		case 'weaken':
			taskScript = 'weaken.js';
			break;
		case 'grow':
			taskScript = 'grow.js';
			break;
		case 'hack':
			taskScript = 'hack.js';
			break;
		case 'any':
			taskScript = 'any';
			break;
		default:
			ns.print(`taskActive: invalid task type`);
	}
	
	if (task == 'any') {
		for (const server of serverList) {
			var host = server.serverName;
			if (ns.isRunning('weaken.js', host, attackTarget) || ns.isRunning('grow.js', host, attackTarget) || ns.isRunning('hack.js', host, attackTarget))
				return true;
		}
	} else {
		for (const server of serverList) {
			var host = server.serverName;
			if (ns.isRunning(taskScript, host, attackTarget))
				return true;
		}
	}
	return false;
}