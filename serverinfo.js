/** @param {NS} ns **/
export async function main(ns) {
    var args = ns.args;
	var serverName = args[0];

	var serverObject = ns.getServer(serverName);

	// host
	var host = serverObject.hostname;
	var owner = serverObject.organizationName;
	
	// security level
	var secLevel = serverObject.hackDifficulty.toFixed(2);
	var minSec = serverObject.minDifficulty.toFixed(2);

	// mem stats
	var usedMem = serverObject.ramUsed;
	var maxMem = serverObject.maxRam;
	var memPercent = ((usedMem/maxMem) * 100).toFixed(2);

	// money stats
	var currentMoney = serverObject.moneyAvailable;
	var maxMoney = serverObject.moneyMax;
	var moneyPercent = (currentMoney/maxMoney) * 100;

	currentMoney = (currentMoney/1000000).toFixed(2);
	maxMoney = (maxMoney/1000000).toFixed(2);
	moneyPercent = moneyPercent.toFixed(2);

	ns.tprint(
`
SERVER INFO:
  Host: ${host}
  Owner: ${owner}
  
  RAM: ${usedMem}/${maxMem}GB (${memPercent}%)
  Security Level: ${secLevel} (Min ${minSec})
  Money: \$${currentMoney}/${maxMoney}m (${moneyPercent}%)
`
	);

}