const { copyFile, open, rename } = require('node:fs/promises');
const path = require('node:path');

const WINDOWS_GUI_SUBSYSTEM = 2;
const WINDOWS_CONSOLE_SUBSYSTEM = 3;

async function patchToConsoleSubsystem(executable) {
  const temporary = `${executable}.tmp`;
  await copyFile(executable, temporary);
  const file = await open(temporary, 'r+');
  try {
    const dos = Buffer.alloc(64);
    await file.read(dos, 0, dos.length, 0);
    if (dos.toString('ascii', 0, 2) !== 'MZ') throw new Error('Native host source is not a PE executable');
    const peOffset = dos.readUInt32LE(0x3c);
    const header = Buffer.alloc(96);
    await file.read(header, 0, header.length, peOffset);
    if (header.toString('ascii', 0, 4) !== 'PE\0\0') throw new Error('Native host source has an invalid PE header');
    const optionalHeaderOffset = peOffset + 24;
    const magic = header.readUInt16LE(24);
    if (magic !== 0x10b && magic !== 0x20b) throw new Error('Native host source has an unsupported PE format');
    const subsystemOffset = optionalHeaderOffset + 68;
    const subsystem = Buffer.alloc(2);
    await file.read(subsystem, 0, 2, subsystemOffset);
    if (subsystem.readUInt16LE(0) !== WINDOWS_GUI_SUBSYSTEM) throw new Error('Expected a Windows GUI executable');
    subsystem.writeUInt16LE(WINDOWS_CONSOLE_SUBSYSTEM, 0);
    await file.write(subsystem, 0, 2, subsystemOffset);
  } finally {
    await file.close();
  }
  await rename(temporary, executable);
}

async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;
  const source = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  const nativeHost = path.join(context.appOutDir, 'WinPilotNativeHost.exe');
  await copyFile(source, nativeHost);
  await patchToConsoleSubsystem(nativeHost);
}

module.exports = afterPack;
module.exports.patchToConsoleSubsystem = patchToConsoleSubsystem;
