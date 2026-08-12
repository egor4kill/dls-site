const esbuild = require("esbuild");

esbuild.build({
  entryPoints: ["admin-src/cms.js"],
  bundle: true,
  minify: true,
  outfile: "admin/cms.js",
  loader: { ".js": "jsx" },
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "info",
}).catch(() => process.exit(1));
