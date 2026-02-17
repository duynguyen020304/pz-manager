// Mock implementation for tmux commands
export interface TmuxSession {
  name: string;
  pid: number;
  createdAt: Date;
}

class MockTmux {
  private sessions: Map<string, TmuxSession> = new Map();
  private commandLog: string[] = [];

  createSession(name: string): { stdout: string; stderr: string; exitCode: number } {
    this.commandLog.push(`tmux new-session -d -s ${name}`);
    
    if (this.sessions.has(name)) {
      return {
        stdout: '',
        stderr: `duplicate session: ${name}`,
        exitCode: 1
      };
    }

    const session: TmuxSession = {
      name,
      pid: Math.floor(Math.random() * 100000) + 1000,
      createdAt: new Date()
    };
    
    this.sessions.set(name, session);
    
    return {
      stdout: '',
      stderr: '',
      exitCode: 0
    };
  }

  killSession(name: string): { stdout: string; stderr: string; exitCode: number } {
    this.commandLog.push(`tmux kill-session -t ${name}`);
    
    if (!this.sessions.has(name)) {
      return {
        stdout: '',
        stderr: `can't find session: ${name}`,
        exitCode: 1
      };
    }

    this.sessions.delete(name);
    
    return {
      stdout: '',
      stderr: '',
      exitCode: 0
    };
  }

  hasSession(name: string): { stdout: string; stderr: string; exitCode: number } {
    this.commandLog.push(`tmux has-session -t ${name}`);
    
    const exists = this.sessions.has(name);
    
    return {
      stdout: exists ? 'true' : 'false',
      stderr: '',
      exitCode: exists ? 0 : 1
    };
  }

  sendKeys(name: string, command: string): { stdout: string; stderr: string; exitCode: number } {
    this.commandLog.push(`tmux send-keys -t ${name} "${command}" Enter`);
    
    if (!this.sessions.has(name)) {
      return {
        stdout: '',
        stderr: `can't find session: ${name}`,
        exitCode: 1
      };
    }

    return {
      stdout: '',
      stderr: '',
      exitCode: 0
    };
  }

  capturePane(name: string, lines: number = 100): { stdout: string; stderr: string; exitCode: number } {
    if (!this.sessions.has(name)) {
      return {
        stdout: '',
        stderr: `can't find session: ${name}`,
        exitCode: 1
      };
    }

    // Generate mock console output
    const output = Array(lines).fill(null).map((_, i) => 
      `[${new Date().toISOString()}] Mock log line ${i + 1}`
    ).join('\n');

    return {
      stdout: output,
      stderr: '',
      exitCode: 0
    };
  }

  pipePane(name: string, outputPath: string): { stdout: string; stderr: string; exitCode: number } {
    this.commandLog.push(`tmux pipe-pane -t ${name} "cat > ${outputPath}"`);
    
    if (!this.sessions.has(name)) {
      return {
        stdout: '',
        stderr: `can't find session: ${name}`,
        exitCode: 1
      };
    }

    return {
      stdout: '',
      stderr: '',
      exitCode: 0
    };
  }

  getSession(name: string): TmuxSession | undefined {
    return this.sessions.get(name);
  }

  getAllSessions(): TmuxSession[] {
    return Array.from(this.sessions.values());
  }

  getCommandLog(): string[] {
    return [...this.commandLog];
  }

  reset(): void {
    this.sessions.clear();
    this.commandLog = [];
  }
}

export const mockTmux = new MockTmux();
