/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL'); // disable logging
	var params = ns.flags([
		['monitor', false],
		['host', 'all']
	]);

	var monitor = params.monitor;
	var host = params.host;

	do {
		var allServers = await findServers(ns, host);

		var messageText = "\n";
		var spacer = " | ";
		var headerText = `     SERVERNAME     ${spacer} LEVEL ${spacer}ROOT${spacer}PORTS${spacer}       MEMORY       ${spacer}         MONEY         ${spacer}    SECURITY     ${spacer}\n`;
		
		var spacerText = "";
		while (spacerText.length < headerText.length - 2) spacerText += "=";
		spacerText += "\n";
		
		messageText += headerText;
		messageText += spacerText;

		for (const printServer of allServers) {
			var serverNameText = `${printServer.hostname}`;
			var serverLevelText = `${printServer.requiredHackingSkill}`;
			var root = printServer.hasAdminRights ? ' Y  ' : ' N  ';
			var serverPortsText = ` ${printServer.openPortCount}/${printServer.numOpenPortsRequired} `;
			var serverMemoryText = printServer.maxRam == 0 ? 'None'
								 : printServer.maxRam >= 1024 ? `${(printServer.ramUsed/1024).toFixed(2)} / ${(printServer.maxRam/1024).toFixed(2)} TB`
								 : `${printServer.ramUsed} / ${printServer.maxRam} GB`;
			
			var serverMoneyText = printServer.moneyMax == 0 ? 'None'
								: (printServer.moneyMax >= 1000000000000) ? `${(printServer.moneyAvailable/1000000000000).toFixed(2)} / ${(printServer.moneyMax/1000000000000).toFixed(2)} t`
								: (printServer.moneyMax >= 1000000000)    ? `${(printServer.moneyAvailable/1000000000).toFixed(2)} / ${(printServer.moneyMax/1000000000).toFixed(2)} b`
								: `${(printServer.moneyAvailable/1000000).toFixed(2)} / ${(printServer.moneyMax/1000000).toFixed(2)} m`;
			var serverSecurityText = `${printServer.hackDifficulty.toFixed(2)}`;
			var serverSecurityMinText = `MIN: ${printServer.minDifficulty}`;
			
			while (serverNameText.length < 20) serverNameText += " ";
			while (serverLevelText.length < 7) serverLevelText += " ";
			while (serverMemoryText.length < 20) serverMemoryText += " ";
			while (serverMoneyText.length < 23) serverMoneyText += " ";
			while (serverSecurityText.length < 8) serverSecurityText += " ";
			while (serverSecurityMinText.length < 8) serverSecurityMinText += " ";

			messageText += `${serverNameText} | ${serverLevelText} | ${root} | ${serverPortsText} | ${serverMemoryText} | ${serverMoneyText} | ${serverSecurityText} ${serverSecurityMinText} |\n`;
		}

		messageText += spacerText;

		if (monitor) {
			ns.clearLog();
			ns.print(messageText);
		} else 
			ns.tprint(messageText);

		await ns.sleep(500);

	} while (monitor);
}

export async function findServers(ns, host) {
	var allServers = [];
	
	// count the amount of ports we can open
	var tools = ['BruteSSH.exe', 'FTPCrack.exe', 'relaySMTP.exe', 'HTTPWorm.exe', 'SQLInject.exe'];
	var breachLevel = 0;
	for (const tool of tools) { if (ns.fileExists(tool)) breachLevel++; }
	//ns.tprint(`breachLevel: ${breachLevel}`);

	let queuedServers = new Map();

	// add home to the already checked list so we don't run on it
	queuedServers.set('home', true);

	// queue servers connected to home
	var servers = ns.scan('home');
	for (const server of servers) 
		queuedServers.set(server, true); 

	// while there are servers remaining in the queue
	while (servers.length > 0) {
		// get first server in the queue
		var server = servers.shift();
		if (server == 'darkweb') continue; // skip darkweb


		var serverObj = ns.getServer(server);

		if (server == host || host == 'all')
			allServers.push(serverObj);

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

	// sort by hack level
	allServers.sort( function (a, b) { 
		return a.requiredHackingSkill - b.requiredHackingSkill;
	} );

	return allServers;
}