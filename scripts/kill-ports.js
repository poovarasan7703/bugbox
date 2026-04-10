/**
 * Kills processes using ports 5000 and 3000 (BugBox backend & frontend)
 * Run: npm run kill-ports
 */
import { execSync } from 'child_process';
import { platform } from 'os';

const PORTS = [5000, 3000];

function killPort(port) {
  try {
    if (platform() === 'win32') {
      let result;
      try {
        result = execSync(`netstat -ano | findstr ":${port}"`, { encoding: 'utf8' });
      } catch (_) {
        return; // No process on port
      }
      const lines = result.trim().split('\n').filter(l => l.includes('LISTENING'));
      const pids = new Set();
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0') pids.add(pid);
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: 'pipe' });
          console.log(`  Killed process ${pid} (port ${port})`);
        } catch (_) {}
      }
    } else {
      try {
        execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'pipe' });
        console.log(`  Freed port ${port}`);
      } catch (_) {}
    }
  } catch (e) {}
}

console.log('Freeing BugBox ports (5000, 3000)...');
PORTS.forEach(killPort);
console.log('Done. Run "npm run dev" to start.');
