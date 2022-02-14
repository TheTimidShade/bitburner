/** @param {NS} ns **/
export async function main(ns) {
    var target = ns.args[0];
    var host = ns.getHostname();
    var maxMoney = ns.getServerMaxMoney(target);

    // min security level before trying to attack
    var securityThresh = ns.getServerMinSecurityLevel(target) + 5;

    var maxMoneyThresh = 0.6; // begin attack after server has this much money
    var minMoneyThresh = 0.6; // after the server reaches the maximum money count stop hacks after this
    
    while (true) {
        //var moneyPercent = ns.getServerMoneyAvailable(target)/maxMoney;
        //var securityLevel = ns.getServerSecurityLevel(target);

        //ns.tprint(`Harvest cycle:\nMoney: ${moneyPercent}%\nSecurity: ${securityLevel}`);

        // wait while the server's security is lowered and money increased
        while (ns.getServerMoneyAvailable(target)/maxMoney < maxMoneyThresh || ns.getServerSecurityLevel(target) > securityThresh) {
            var moneyPercent = ((ns.getServerMoneyAvailable(target)/maxMoney) * 100).toFixed(2);
            var security = ns.getServerSecurityLevel(target).toFixed(2);
            var minSec = ns.getServerMinSecurityLevel(target);
            ns.tprint(`Waiting to harvest...\n  Money: ${moneyPercent}%\n  Security: ${security} (Min ${minSec})`);
            await ns.sleep(60000);
        }

        // if the server has money we can take, hack it
        if ((ns.getServerMoneyAvailable(target)/maxMoney) > minMoneyThresh && !ns.scriptRunning('harvest.ns', host)) {
            var hackETA = Math.ceil(ns.getHackTime(target)/1000);
            var minutes = Math.floor(hackETA/60);
            var seconds = hackETA % 60;

            ns.tprint(`Harvesting... ETA ${minutes}m ${seconds}s`);
            
            // calculate number of threads required to drain money to minThresh
            var hackDrain = ns.hackAnalyze(target); // drain from one thread
            
            var currentMoney = ns.getServerMoneyAvailable(target)/maxMoney; // current money percent
            var percentDrain = currentMoney - minMoneyThresh; // percent drop from current to min

            var threadsNeeded = Math.ceil(percentDrain/hackDrain); // threads needed to drop to min
            var useableThreads = Math.floor((ns.getServerMaxRam(host) - ns.getServerUsedRam(host))/ns.getScriptRam('harvest.ns', host));

            //ns.tprint(`\nDrain from single thread: ${hackDrain}\nTotal drain: ${percentDrain}%\nThreads needed: ${threadsNeeded}\nThreads available: ${useableThreads}`);

            if (threadsNeeded < useableThreads) {
                ns.run('harvest.ns', threadsNeeded, target);
            } else {
                if (useableThreads > 0) {
                    ns.run('harvest.ns', useableThreads, target);
                }
                else {
                    ns.toast(`No threads available for hack!`, "error");
                }
                
            }
        }

        await ns.sleep(1000);
    }
}