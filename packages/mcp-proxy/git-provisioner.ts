import { exec } from "child_process";
import { promisify } from "util";
import { readFile, access } from "fs/promises";
import { join } from "path";
import type {
  ConfigProvider,
  MCPSettings,
  GitConfigProviderOptions,
} from "./types";
import { substituteSecrets } from "./types";
import { createLogger } from "./logger";

const log = createLogger("GitConfigProvider");

const execAsync = promisify(exec);

interface ParsedGitSource {
  repoUrl: string;
  branch: string;
  configPath: string;
}

export class GitConfigProvider implements ConfigProvider {
  constructor(private options: GitConfigProviderOptions) {}

  async load(): Promise<MCPSettings> {
    const parsed = this.parseSource(this.options.source);

    const exists = await this.repoExists();
    if (exists) {
      await this.pull(parsed);
    } else {
      await this.clone(parsed);
    }

    const configPath = join(this.options.localPath, parsed.configPath);
    const configContent = await this.readFile(configPath);
    const config = JSON.parse(configContent) as MCPSettings;

    if (this.options.secretsFile) {
      const secretsPath = join(
        this.options.localPath,
        this.options.secretsFile,
      );
      const secretsContent = await this.readFile(secretsPath);
      config.secrets = JSON.parse(secretsContent);
    }

    return substituteSecrets(config);
  }

  // Parses: "https://github.com/org/repo#branch:path/to/config.json"
  // - Branch defaults to "main"
  // - Config path defaults to "mcp_settings.json"
  private parseSource(source: string): ParsedGitSource {
    const hashIndex = source.indexOf("#");

    if (hashIndex !== -1) {
      const repoUrl = source.slice(0, hashIndex);
      const branchAndPath = source.slice(hashIndex + 1);

      const colonIndex = branchAndPath.indexOf(":");
      if (colonIndex !== -1) {
        return {
          repoUrl,
          branch: branchAndPath.slice(0, colonIndex),
          configPath: branchAndPath.slice(colonIndex + 1),
        };
      }

      return {
        repoUrl,
        branch: branchAndPath,
        configPath: "mcp_settings.json",
      };
    }

    // Handle repo:path format (no branch specified)
    const protocolIndex = source.indexOf("://");
    const colonIndex = source.lastIndexOf(":");

    if (
      colonIndex !== -1 &&
      (protocolIndex === -1 || colonIndex > protocolIndex + 2)
    ) {
      return {
        repoUrl: source.slice(0, colonIndex),
        branch: "main",
        configPath: source.slice(colonIndex + 1),
      };
    }

    return {
      repoUrl: source,
      branch: "main",
      configPath: "mcp_settings.json",
    };
  }

  private async repoExists(): Promise<boolean> {
    try {
      await access(join(this.options.localPath, ".git"));
      return true;
    } catch {
      return false;
    }
  }

  private async clone(parsed: ParsedGitSource): Promise<void> {
    log.info(
      { repo: parsed.repoUrl, branch: parsed.branch },
      "cloning repository",
    );
    await execAsync(
      `git clone --branch ${parsed.branch} --depth 1 ${parsed.repoUrl} ${this.options.localPath}`,
    );
  }

  private async pull(parsed: ParsedGitSource): Promise<void> {
    log.info({ branch: parsed.branch }, "pulling latest");
    await execAsync(`git pull origin ${parsed.branch}`, {
      cwd: this.options.localPath,
    });
  }

  private async readFile(filePath: string): Promise<string> {
    if (this.options.sops) {
      return await this.decrypt(filePath);
    }
    return await readFile(filePath, "utf-8");
  }

  private async decrypt(filePath: string): Promise<string> {
    const env: Record<string, string> = {};

    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        env[key] = value;
      }
    }

    if (this.options.sops?.ageKey) {
      env.SOPS_AGE_KEY = this.options.sops.ageKey;
    } else if (this.options.sops?.ageKeyFile) {
      env.SOPS_AGE_KEY_FILE = this.options.sops.ageKeyFile;
    }

    log.debug({ path: filePath }, "decrypting with SOPS");
    const { stdout } = await execAsync(`sops --decrypt ${filePath}`, { env });
    return stdout;
  }
}
