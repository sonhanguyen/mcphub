import type { Provider, MCPSettings, SopsOptions, Unsubscribe } from "./types"
import { substituteSecrets } from "./types"
import { GitProvider } from "./git-provider"

export interface ConfigProviderOptions {
  configProvider: Provider<MCPSettings>
  secretsProvider?: Provider<Record<string, string>>
}

export class ConfigProvider implements Provider<MCPSettings> {
  constructor(private options: ConfigProviderOptions) {}

  onChange(callback: (value: MCPSettings) => void): Unsubscribe {
    let config: MCPSettings | null = null
    let secrets: Record<string, string> | null = null

    const emit = () => {
      if (config === null) return
      const merged = { ...config }
      if (secrets) merged.secrets = secrets
      callback(substituteSecrets(merged))
    }

    const unsub1 = this.options.configProvider.onChange((value) => {
      config = value
      emit()
    })

    let unsub2: Unsubscribe | undefined
    if (this.options.secretsProvider) {
      unsub2 = this.options.secretsProvider.onChange((value) => {
        secrets = value
        emit()
      })
    }

    return () => {
      unsub1()
      unsub2?.()
    }
  }
}

export interface GitConfigOptions {
  configSource: string
  secretsSource?: string
  localPath: string
  sops?: SopsOptions
}

function isGitSource(source: string): boolean {
  return source.includes("://") || source.includes("#")
}

export function createGitConfigProvider(
  options: ConfigProviderOptions | GitConfigOptions
): ConfigProvider {
  if ("configProvider" in options) {
    return new ConfigProvider(options)
  }

  const configProvider = new GitProvider<MCPSettings>({
    source: options.configSource,
    localPath: options.localPath,
    sops: options.sops,
  })

  let secretsProvider: Provider<Record<string, string>> | undefined

  if (options.secretsSource) {
    if (isGitSource(options.secretsSource)) {
      // Full git URL - use separate GitProvider
      secretsProvider = new GitProvider<Record<string, string>>({
        source: options.secretsSource,
        localPath: options.localPath + "-secrets",
        sops: options.sops,
      })
    } else {
      // Just a filename - reuse same repo
      const parsed = options.configSource.split("#")[0]
      const branch = options.configSource.includes("#")
        ? options.configSource.split("#")[1].split(":")[0]
        : "main"

      secretsProvider = new GitProvider<Record<string, string>>({
        source: `${parsed}#${branch}:${options.secretsSource}`,
        localPath: options.localPath,
        sops: options.sops,
      })
    }
  }

  return new ConfigProvider({
    configProvider,
    secretsProvider,
  })
}
