#!/usr/bin/env node_modules/.bin/ts-node
(async () => {
    const oclif = await import("@oclif/core");
    const __dirname = import.meta.dirname;
    await oclif.execute({ development: true, dir: __dirname });
})();
