/** @param {NS} ns **/
export async function main(ns) {
    var args = ns.args;

	var hostname = args[0];
	var storagePower = args[1];

	if (hostname == undefined || storagePower == undefined) {
		ns.toast(`Invalid params!`, "error");
		return;
	}

	var storageSize = Math.pow(2, storagePower);
	var price = (ns.getPurchasedServerCost(storageSize)/1000000).toFixed(2);
	var doBuy = await ns.prompt(`Server with size ${storageSize}GB costs ${price}m. Purchase?`);

	if (doBuy) {
		ns.purchaseServer(hostname, storageSize);
		ns.toast(`Purchased server!`, "success");
	}
}