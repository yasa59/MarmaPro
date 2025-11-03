const { spawn } = require("child_process");

function runPython(scriptPath, args = []) {
  return new Promise((resolve) => {
    const py = spawn(process.env.PYTHON_BIN || "python", [scriptPath, ...args], {
      windowsHide: true
    });

    let out = "", err = "";
    py.stdout.on("data", (d) => (out += d.toString()));
    py.stderr.on("data", (d) => (err += d.toString()));
    py.on("close", () => resolve({ stdout: out.trim(), stderr: err.trim() }));
  });
}

module.exports = { runPython };
