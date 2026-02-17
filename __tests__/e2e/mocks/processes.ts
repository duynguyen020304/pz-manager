// Mock implementation for process management commands (pgrep, ps, ss, etc.)
export interface MockProcess {
  pid: number;
  name: string;
  command: string;
  ppid?: number;
  ports?: number[];
  uptime?: string;
}

class MockProcessManager {
  private processes: Map<number, MockProcess> = new Map();
  private portBindings: Map<number, number> = new Map(); // port -> pid
  private nextPid = 10000;

  addProcess(process: Omit<MockProcess, 'pid'>): MockProcess {
    const pid = this.nextPid++;
    const fullProcess: MockProcess = { ...process, pid };
    this.processes.set(pid, fullProcess);
    
    // Register port bindings
    if (process.ports) {
      for (const port of process.ports) {
        this.portBindings.set(port, pid);
      }
    }
    
    return fullProcess;
  }

  removeProcess(pid: number): boolean {
    const process = this.processes.get(pid);
    if (!process) return false;

    // Remove port bindings
    if (process.ports) {
      for (const port of process.ports) {
        this.portBindings.delete(port);
      }
    }

    return this.processes.delete(pid);
  }

  killProcess(pid: number, _signal?: string): { success: boolean; error?: string } {
    const process = this.processes.get(pid);
    if (!process) {
      return { success: false, error: `Process ${pid} not found` };
    }

    this.removeProcess(pid);
    return { success: true };
  }

  findProcessByPattern(pattern: string): MockProcess | null {
    for (const process of this.processes.values()) {
      if (process.command.includes(pattern) || process.name.includes(pattern)) {
        return process;
      }
    }
    return null;
  }

  findProcessByName(name: string): MockProcess | null {
    for (const process of this.processes.values()) {
      if (process.name === name) {
        return process;
      }
    }
    return null;
  }

  isPortBound(port: number): boolean {
    return this.portBindings.has(port);
  }

  getProcessByPort(port: number): MockProcess | null {
    const pid = this.portBindings.get(port);
    if (!pid) return null;
    return this.processes.get(pid) || null;
  }

  getProcessUptime(pid: number): string | null {
    const process = this.processes.get(pid);
    if (!process) return null;
    return process.uptime || '00:00:00';
  }

  getAllProcesses(): MockProcess[] {
    return Array.from(this.processes.values());
  }

  // Simulate pgrep -f command
  pgrep(pattern: string): { stdout: string; stderr: string; exitCode: number } {
    const process = this.findProcessByPattern(pattern);
    
    if (!process) {
      return {
        stdout: '',
        stderr: '',
        exitCode: 1
      };
    }

    return {
      stdout: process.pid.toString(),
      stderr: '',
      exitCode: 0
    };
  }

  // Simulate ps -o etime= -p <pid>
  psUptime(pid: number): { stdout: string; stderr: string; exitCode: number } {
    const uptime = this.getProcessUptime(pid);
    
    if (!uptime) {
      return {
        stdout: '',
        stderr: `ps: pid ${pid} not found`,
        exitCode: 1
      };
    }

    return {
      stdout: uptime,
      stderr: '',
      exitCode: 0
    };
  }

  // Simulate ss -ulnp | grep :<port>
  ssPort(port: number): { stdout: string; stderr: string; exitCode: number } {
    const pid = this.portBindings.get(port);
    
    if (!pid) {
      return {
        stdout: '',
        stderr: '',
        exitCode: 1
      };
    }

    const process = this.processes.get(pid);
    if (!process) {
      return {
        stdout: '',
        stderr: '',
        exitCode: 1
      };
    }

    // Mock ss output format: udp   UNCONN  0  0  0.0.0.0:16261  0.0.0.0:*  users:(("java",pid=12345,fd=123))
    const output = `udp   UNCONN  0  0  0.0.0.0:${port}  0.0.0.0:*  users:(("${process.name}",pid=${pid},fd=123))`;

    return {
      stdout: output,
      stderr: '',
      exitCode: 0
    };
  }

  reset(): void {
    this.processes.clear();
    this.portBindings.clear();
    this.nextPid = 10000;
  }
}

export const mockProcesses = new MockProcessManager();
