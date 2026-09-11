import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import type { LoggerService } from '../../common/services/logger.service';

/**
 * Chromium/profile hygiene run before a whatsapp-web.js browser launches.
 *
 * Neither of these is about WhatsApp. They clean up after the OPERATING SYSTEM and the container: a
 * process killed with SIGKILL leaves an orphaned browser and stale profile locks behind, and both
 * must be dealt with before the next launch. That is an independent audience — it changes when
 * Docker, Puppeteer or the host platform changes, never when the WhatsApp protocol does — so it lives
 * outside the adapter that implements the protocol.
 *
 * Both are best-effort by contract: they log at debug and never throw, so a hostile `ps` or an
 * unreadable profile dir can never block an engine start.
 */

/** Just enough of the logger to report; the adapter passes its own so spies keep observing it. */
type HygieneLogger = Pick<LoggerService, 'debug' | 'log'>;

/** One enumerated OS process: its pid and full command line. */
interface ProcessCommandLine {
  pid: number;
  args: string;
}

/**
 * Run a binary with no shell and resolve its stdout. execFile hands the arg array to the binary
 * verbatim, so nothing here is injectable and the sessionId is never interpolated into a shell.
 * maxBuffer is raised because full command lines (Chromium carries dozens of flags per process,
 * and a busy host runs many) can exceed the 1MB default.
 */
function execFilePromise(command: string, args: string[]): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    execFile(command, args, { maxBuffer: 8 * 1024 * 1024 }, (error, stdout) => {
      // The @types/node ExecFileException is an Omit<> of ErrnoException, which the type
      // checker no longer recognises as an Error — narrow it explicitly for the reject.
      if (error) reject(error instanceof Error ? error : new Error(error.message));
      else resolve(stdout);
    });
  });
}

/**
 * Enumerate every OS process as {pid, command line} using the platform's native tool: `ps` on
 * darwin/linux, the CIM Win32_Process class via PowerShell on Windows (wmic is deprecated and
 * removed on newer Windows builds). Best-effort callers treat a throw as "no processes".
 */
async function enumerateProcessCommandLines(platform: NodeJS.Platform): Promise<ProcessCommandLine[]> {
  const result: ProcessCommandLine[] = [];
  if (platform === 'win32') {
    // PowerShell emits "<pid>|<commandline>" per line; split on the FIRST '|' so a command line
    // that itself contains '|' stays intact. Processes whose CommandLine is null (access denied
    // for some system processes) yield an empty args string, which the marker filter then skips.
    const script =
      'Get-CimInstance Win32_Process | ForEach-Object { $_.ProcessId.ToString() + "|" + $_.CommandLine }';
    const out = await execFilePromise('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script]);
    for (const line of out.split(/\r?\n/)) {
      const idx = line.indexOf('|');
      if (idx <= 0) continue;
      const pid = Number(line.slice(0, idx));
      if (!Number.isInteger(pid) || pid <= 0) continue;
      result.push({ pid, args: line.slice(idx + 1) });
    }
    return result;
  }
  // darwin / linux: `ps -eo pid=,args=` prints "<pid> <full command line>", no header.
  const out = await execFilePromise('ps', ['-eo', 'pid=,args=']);
  for (const line of out.split('\n')) {
    const match = /^\s*(\d+)\s+(.*)$/.exec(line);
    if (!match) continue;
    result.push({ pid: Number(match[1]), args: match[2] });
  }
  return result;
}

/**
 * SIGKILL any Chromium orphaned by a previous lifetime of this process. When OpenWA dies hard
 * (kill -9, crash, host reboot) Puppeteer's exit hook never runs, so the browser survives as an
 * orphan — leaking memory and pinning the session profile dir, which makes the next launch fail
 * with "the browser is already running". Orphans are identified by the `--openwa-session=<id>`
 * marker arg appended to the puppeteer args at launch (Chromium ignores the unknown flag; it is
 * purely a process-table label). Killing the browser process tears down its renderer/GPU/utility
 * children too. Best-effort: never throws — an enumeration failure only logs at debug, so the
 * sweep can never block an engine start.
 */
export async function killOrphanedChromiumProcesses(sessionId: string, logger: HygieneLogger): Promise<void> {
  const platform = process.platform;
  if (platform !== 'darwin' && platform !== 'linux' && platform !== 'win32') {
    logger.debug(`Skipping orphaned Chromium sweep: unsupported platform ${platform}`);
    return;
  }
  try {
    const processes = await enumerateProcessCommandLines(platform);
    // Token-exact marker match: the marker is a single argv token, so it must appear delimited by
    // whitespace or string boundaries. A plain substring test would let restarting session
    // `sales` SIGKILL the LIVE browser of sibling `sales2` (their markers share a prefix).
    const marker = `--openwa-session=${sessionId}`;
    const markerRe = new RegExp('(?:^|\\s)' + marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=\\s|$)');
    const killedPids: number[] = [];
    for (const { pid, args } of processes) {
      if (pid === process.pid || !markerRe.test(args)) continue;
      // Never kill a non-browser process that happens to carry the marker string
      // (e.g. a `grep --openwa-session=…` probing the process table).
      if (!/chrome|chromium|headless/i.test(args)) continue;
      try {
        // On Windows Node emulates SIGKILL with TerminateProcess; the browser's children observe
        // the parent's death and exit, so the whole tree goes down with the matched browser pid.
        process.kill(pid, 'SIGKILL');
        killedPids.push(pid);
      } catch (error) {
        // ESRCH: the process exited between enumeration and the kill — nothing left to do.
        if ((error as NodeJS.ErrnoException).code !== 'ESRCH') {
          logger.debug(`Could not SIGKILL orphaned Chromium pid ${pid}`, { error: String(error) });
        }
      }
    }
    if (killedPids.length > 0) {
      logger.log(
        `Killed ${killedPids.length} orphaned Chromium process(es) left over from a previous process lifetime`,
        { sessionId, pids: killedPids },
      );
    }
  } catch (error) {
    logger.debug('Could not enumerate processes for the orphaned Chromium sweep', { error: String(error) });
  }
}

/**
 * Remove Chromium's SingletonLock/SingletonSocket/SingletonCookie from the LocalAuth profile dir
 * (same dir clearLocalAuth removes) before the browser launches. A hard-killed Chromium
 * (SIGKILL/crash) leaves them behind, and on some setups (e.g. Docker PID reuse) the stale files
 * block the next launch unless they are cleared first. Best-effort: a removal
 * failure only logs at debug and never fails the start.
 */
export async function removeStaleSingletonFiles(
  sessionId: string,
  sessionDataPath: string,
  logger: HygieneLogger,
): Promise<void> {
  const profileDir = path.join(path.resolve(sessionDataPath), `session-${sessionId}`);
  for (const name of ['SingletonLock', 'SingletonSocket', 'SingletonCookie']) {
    try {
      await fs.promises.rm(path.join(profileDir, name), { force: true });
    } catch (error) {
      logger.debug(`Could not remove stale ${name} from ${profileDir}`, { error: String(error) });
    }
  }
}
