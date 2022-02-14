/** @param {NS} ns **/
export async function main(ns) {
    var target = ns.args[0];
    var maxMoney = ns.getServerMaxMoney(target);
    var securityThresh = ns.getServerMinSecurityLevel(target) + 5;
    
    // constantly decrease security level and increase money until both thresholds are reached
    while (true) {
        if (ns.getServerSecurityLevel(target) > securityThresh) {
            var decrease = await ns.weaken(target);
            var securityLevel = (ns.getServerSecurityLevel(target)).toFixed(2);
            
            ns.toast(`Decreased security of ${target} to ${securityLevel}`);
        } else if (ns.getServerMoneyAvailable(target) < (maxMoney * 0.95)) {
            var growth = (await ns.grow(target)) * 100;
            var money = (ns.getServerMoneyAvailable(target)/1000000).toFixed(2);
            
            ns.toast(`Increased money on ${target} to $${money}m`);
        } else {
            await ns.sleep(5000);
        }
    }
}