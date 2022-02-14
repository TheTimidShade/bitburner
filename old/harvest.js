/** @param {NS} ns **/
export async function main(ns) {
    var args = ns.args;

	var target = args[0];
	
	var gains = ((await ns.hack(target))/1000000).toFixed(2);
	if (gains > 0) {
		ns.tprint(`Successfully hacked ${target} for $${gains}m`);
		ns.toast(`Successfully hacked ${target} for $${gains}m`, "success");
	}
	else {
		ns.tprint(`Failed hack on ${target}`);
		ns.toast(`Failed hack on ${target}`, "error");
	}
}