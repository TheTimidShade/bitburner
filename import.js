let root = 'https://raw.githubusercontent.com/TheTimidShade/bitburner/main/';

let manifest = [
  'aliases.txt',
  'fileremover.js',
  'grow.js',
  'hack.js',
  'killswitch.js',
  'notifier.js',
  'purchaseserver.js',
  'serverinfo.js',
  'showservers.js',
  'tasker.js',
  'threadcounter.js',
  'weaken.js'
];

/** @param {NS} ns **/
export async function main(ns) {
	await importFiles(ns);
  await ns.sleep(5000);
}

async function importFiles(ns) {
  var total = manifest.length;
  var succeeded = 0;
  
  for (const file of manifest) {
    let filePath = root + file;
    var success = await ns.wget(filePath, `/${file}`);
    if (success) {
      ns.tprint(`Imported '${file}' successfully`);
      succeeded++;
    } else {
      ns.tprint(`Failed to import '${file}'`);
    }
  }

  ns.tprint(`Successfully imported ${succeeded}/${total} files`);
}