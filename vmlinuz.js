// vmlinuz: the rOS kernel bootstrapper

const splash = document.getElementById("splash");

boot().catch(() => {}); // top-level swallows the panic re-throw after crash screen is shown

async function boot() {
  // init.js must load first so ros.panic is available for everything that follows
  await import("./initrd/init/modules/init.js");

  const res = await fetch("etc/modules.json")
    .catch(err => ros.panic("Could not reach /etc/modules.json\n" + err.message));

  if (!res.ok)
    ros.panic(`Could not load /etc/modules.json (HTTP ${res.status})`);

  const modules = await res.json()
    .catch(err => ros.panic("Failed to parse /etc/modules.json\n" + err.message));

  for (const mod of modules) {
    const isKernel = typeof mod === "string";          // initrd module → crucial
    const name     = isKernel ? mod : mod.name;
    const path     = isKernel
      ? `./initrd/init/modules/${mod}.js`
      : `./${mod.path.replace(/^\//, "")}`;

    if (name === "init") continue;                     // already loaded above

    await import(path).catch(err => {
      if (isKernel) {
        // Kernel module failure → crash and halt entirely
        ros.panic(`Kernel module "${name}" failed to load from ${path}\n\n${err.message}`);
      } else {
        // Userspace module failure → warn and keep going
        console.warn(`[vmlinuz] Userspace module "${name}" failed to load: ${err.message}`);
      }
    });
  }

  splash.style.transition = "opacity 0.6s ease";
  splash.style.opacity    = "0";
  setTimeout(() => splash.remove(), 650);
  dispatchEvent(new Event("kernel:ready"));
}
