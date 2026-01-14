#!/usr/bin/env node

(async () => {
    const oclif = await import("@oclif/core");
    const __dirname = import.meta.dirname;
    await oclif.execute({ dir: __dirname });
})();
