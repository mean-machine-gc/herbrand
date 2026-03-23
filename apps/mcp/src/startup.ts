import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { platform } from "node:os";
import YAML from "yaml";
import { projectSchema, generateProjectJsonSchema, generateDecisionJsonSchema } from "@herbrand/core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Helpers ---

function copyDirRecursive(src: string, dst: string) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

// --- Skills ---

function installSkills(projectDir: string) {
  const skillsSource = path.resolve(__dirname, "../skills");
  if (!fs.existsSync(skillsSource)) return;

  const targets = [
    path.join(projectDir, ".claude", "skills"),
    path.join(projectDir, ".opencode", "skills"),
    path.join(projectDir, ".github", "skills"),
    path.join(projectDir, ".cursor", "skills"),
  ];

  for (const target of targets) {
    fs.mkdirSync(target, { recursive: true });
    for (const entry of fs.readdirSync(skillsSource, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        copyDirRecursive(path.join(skillsSource, entry.name), path.join(target, entry.name));
      }
    }
  }
}

// --- JSON Schemas + IDE ---

function regenerateJsonSchemas(projectDir: string) {
  const herbrandDir = path.join(projectDir, ".herbrand");
  fs.mkdirSync(herbrandDir, { recursive: true });

  const projSchema = generateProjectJsonSchema();
  fs.writeFileSync(path.join(herbrandDir, "project.schema.json"), JSON.stringify(projSchema, null, 2));

  const projectFile = path.join(projectDir, "project.hb.yaml");
  if (fs.existsSync(projectFile)) {
    try {
      const raw = YAML.parse(fs.readFileSync(projectFile, "utf-8"));
      const project = projectSchema.parse(raw);
      const decSchema = generateDecisionJsonSchema(project);
      fs.writeFileSync(path.join(herbrandDir, "decision.schema.json"), JSON.stringify(decSchema, null, 2));
    } catch {
      // Invalid project.hb.yaml — skip
    }
  }
}

function setupIdeValidation(projectDir: string) {
  const vscodeDir = path.join(projectDir, ".vscode");
  const settingsFile = path.join(vscodeDir, "settings.json");

  fs.mkdirSync(vscodeDir, { recursive: true });

  let settings: Record<string, any> = {};
  if (fs.existsSync(settingsFile)) {
    try { settings = JSON.parse(fs.readFileSync(settingsFile, "utf-8")); } catch { settings = {}; }
  }

  if (!settings["yaml.schemas"]) settings["yaml.schemas"] = {};
  settings["yaml.schemas"][".herbrand/project.schema.json"] = "project.hb.yaml";
  settings["yaml.schemas"][".herbrand/decision.schema.json"] = "specs/*.hb.yaml";

  fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
}

function watchProjectSchema(projectDir: string) {
  if (!fs.existsSync(projectDir)) return;

  let debounce: ReturnType<typeof setTimeout> | null = null;

  fs.watch(projectDir, { recursive: false }, (_event, fileName) => {
    if (fileName === "project.hb.yaml") {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => regenerateJsonSchemas(projectDir), 200);
    }
  });
}

// --- Launchers ---

// HB logo as a 16x16 ICO (base64-encoded minimal .ico)
// This is a simple monochrome HB icon for Windows shortcuts
const HB_ICO_BASE64 =
  "AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAN" +
  "19fT09PW5OTk8AAAAAAAAAN9fX09PT1uTk5PAAAAAAAAAAAAAAAAAAAAAAAAAAJ6en/6enp/+np6f" +
  "/p6en0AAAAAAAAJ6en/6enp/+np6f/p6en0AAAAAAAAAAAAAAAAAAAAAKAAAAP+oAAD/qAAA/6gAAP" +
  "AAAAAAAAKAAAAP+oAAD/qAAA/6gAAPAAAAAAAAAAAAAAAAAAAAAKAAAAP+np6f/p6en/6gAAPAAAAA" +
  "AAAKAAAAP+np6f/p6en/6gAAPAAAAAAAAAAAAAAAAAAAAAKAAAAP+oAAD/qAAA/6gAAPAAAAAAAAKA" +
  "AAAP+oAAD/qAAA/6gAAPAAAAAAAAAAAAAAAAAAAAAKAAAAP+oAAD/qAAA/6gAAPAAAAAAAAKAAAAP+" +
  "np6f/p6en/6gAAPAAAAAAAAAAAAAAAAAAAAAKAAAAP+oAAD/qAAA/6gAAPAAAAAAAAKAAAAP+oAAD/" +
  "qAAA/6gAAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

function createLaunchers(projectDir: string) {
  const os = platform();
  const herbrandDir = path.join(projectDir, ".herbrand");
  fs.mkdirSync(herbrandDir, { recursive: true });

  if (os === "darwin") {
    const appPath = path.join(projectDir, "Open Herbrand.app");
    if (!fs.existsSync(appPath)) {
      const contentsDir = path.join(appPath, "Contents");
      const macosDir = path.join(contentsDir, "MacOS");

      fs.mkdirSync(macosDir, { recursive: true });

      // Info.plist — minimal app manifest
      fs.writeFileSync(path.join(contentsDir, "Info.plist"), [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
        '<plist version="1.0">',
        '<dict>',
        '  <key>CFBundleName</key>',
        '  <string>Open Herbrand</string>',
        '  <key>CFBundleExecutable</key>',
        '  <string>launch</string>',
        '  <key>CFBundleIdentifier</key>',
        '  <string>com.herbrand.launcher</string>',
        '  <key>CFBundleVersion</key>',
        '  <string>1.0</string>',
        '  <key>CFBundlePackageType</key>',
        '  <string>APPL</string>',
        '  <key>LSUIElement</key>',
        '  <true/>',
        '</dict>',
        '</plist>',
      ].join("\n"));

      // Launch script — validates project exists before launching
      const scriptPath = path.join(macosDir, "launch");
      fs.writeFileSync(scriptPath, [
        "#!/bin/bash",
        `PROJECT_DIR="${projectDir}"`,
        'if [ ! -f "$PROJECT_DIR/project.hb.yaml" ]; then',
        '  osascript -e \'display dialog "Herbrand project not found at:\\n\\n\'$PROJECT_DIR\'\\n\\nThe project may have been moved." with title "Herbrand" buttons {"OK"} default button "OK" with icon caution\'',
        "  exit 1",
        "fi",
        'cd "$PROJECT_DIR"',
        "npx herbrand-ui --folder .",
      ].join("\n"));
      fs.chmodSync(scriptPath, 0o755);
    }
  } else if (os === "win32") {
    // Write icon file
    const icoPath = path.join(herbrandDir, "herbrand.ico");
    if (!fs.existsSync(icoPath)) {
      fs.writeFileSync(icoPath, Buffer.from(HB_ICO_BASE64, "base64"));
    }

    // VBScript launcher — validates project, runs without console window
    const vbsPath = path.join(herbrandDir, "launch.vbs");
    const winProjectDir = projectDir.replace(/\//g, "\\");
    fs.writeFileSync(vbsPath, [
      'Set fso = CreateObject("Scripting.FileSystemObject")',
      `projectDir = "${winProjectDir}"`,
      'If Not fso.FileExists(projectDir & "\\project.hb.yaml") Then',
      '  MsgBox "Herbrand project not found at:" & vbCrLf & vbCrLf & projectDir & vbCrLf & vbCrLf & "The project may have been moved.", vbExclamation, "Herbrand"',
      '  WScript.Quit',
      'End If',
      'Set WshShell = CreateObject("WScript.Shell")',
      'WshShell.CurrentDirectory = projectDir',
      'WshShell.Run "npx herbrand-ui --folder .", 0, False',
    ].join("\r\n"));

    // Create shortcut with icon
    const shortcutTarget = path.join(projectDir, "Open Herbrand.lnk");
    if (!fs.existsSync(shortcutTarget)) {
      const shortcutScript = path.join(herbrandDir, "create-shortcut.ps1");
      fs.writeFileSync(shortcutScript, [
        '$WshShell = New-Object -ComObject WScript.Shell',
        `$Shortcut = $WshShell.CreateShortcut("${shortcutTarget.replace(/\//g, "\\")}")`,
        `$Shortcut.TargetPath = "${vbsPath.replace(/\//g, "\\")}"`,
        `$Shortcut.WorkingDirectory = "${projectDir.replace(/\//g, "\\")}"`,
        `$Shortcut.IconLocation = "${icoPath.replace(/\//g, "\\")}"`,
        '$Shortcut.Description = "Open Herbrand UI"',
        '$Shortcut.Save()',
      ].join("\r\n"));

      try {
        spawnSync("powershell", ["-ExecutionPolicy", "Bypass", "-File", shortcutScript], { stdio: "ignore" });
      } catch {
        const batPath = path.join(projectDir, "Open Herbrand.bat");
        fs.writeFileSync(batPath, [
          "@echo off",
          "cd /d %~dp0",
          "npx herbrand-ui --folder .",
        ].join("\r\n"));
      }
    }
  } else {
    // Linux
    const launcherPath = path.join(projectDir, "open-herbrand.sh");
    if (!fs.existsSync(launcherPath)) {
      fs.writeFileSync(launcherPath, [
        "#!/bin/bash",
        'cd "$(dirname "$0")"',
        "npx herbrand-ui --folder .",
      ].join("\n"));
      fs.chmodSync(launcherPath, 0o755);
    }
  }
}

// --- UI ---

function launchUI(projectDir: string) {
  const child = spawn("npx", ["herbrand-ui", "--folder", projectDir], {
    detached: true,
    stdio: "ignore",
    shell: true,
  });

  child.unref();
}

// --- Main startup ---

export function startup(projectDir: string) {
  installSkills(projectDir);
  regenerateJsonSchemas(projectDir);
  setupIdeValidation(projectDir);
  watchProjectSchema(projectDir);
  createLaunchers(projectDir);
  launchUI(projectDir);
}
