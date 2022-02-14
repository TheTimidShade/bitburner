/** @param {NS} ns **/
let activeNotifs = new Map();

export async function main(ns) {
    var args = ns.args;
	
	var host = args[0];
	var script = args[1];
	var target = args[2];
	var moneyBeforeHack = args[3];
	if (moneyBeforeHack == undefined) moneyBeforeHack = 0;

	var taskString = target + script;
	if (!activeNotifs.has(taskString)) activeNotifs.set(taskString, false);

	if (activeNotifs.get(taskString)) return; // exit if notification for this task is already queued
	else activeNotifs.set(taskString, true);

	while (ns.isRunning(script, host, target)) {
		await ns.sleep(1000);
	}

	switch (script) {
		case 'weaken.js':
			var securityLevel = (ns.getServerSecurityLevel(target)).toFixed(2);
			var securityMin = (ns.getServerMinSecurityLevel(target)).toFixed(2);
            ns.toast(`Decreased security of ${target} to ${securityLevel} (Min: ${securityMin})`, 'info');
			break;
		case 'grow.js':
			var money = ns.getServerMoneyAvailable(target);
			var moneyTotal = ns.getServerMaxMoney(target);
			var moneyPercent = ((money/moneyTotal)*100).toFixed(2);

			var moneyString = money > 1000000000000 ? `${(money/1000000000000).toFixed(2)}t`
			                : money > 1000000000 ? `${(money/1000000000).toFixed(2)}b`
							: money > 1000000 ? `${(money/1000000).toFixed(2)}m`
							: `${(money/1000).toFixed(2)}k`;

		    ns.toast(`Increased money on ${target} to $${moneyString} (${moneyPercent}%)`, 'info');
			break;
		case 'hack.js':
			var money = ns.getServerMoneyAvailable(target);
			var moneyDiff = moneyBeforeHack - money;

			var moneyString = moneyDiff > 1000000000000 ? `${(moneyDiff/1000000000000).toFixed(2)}t`
			                : moneyDiff > 1000000000 ? `${(moneyDiff/1000000000).toFixed(2)}b`
							: moneyDiff > 1000000 ? `${(moneyDiff/1000000).toFixed(2)}m`
							: `${(moneyDiff/1000).toFixed(2)}k`;

            ns.toast(`Hacked ${target} for $${moneyString}`, 'success');
			break;
		default:	
	}

	activeNotifs.set(taskString, false);
}