import { DEFAULT_MAX_STACK } from '~/domain/dock';
import { getSetting, setSetting } from '~/adapter/settings';
import { DEFAULT_VERSION, DEFAULT_DATA_DIR } from '~/adapter/assets';
import { DEFAULT_COPY_POSITION_FORMAT } from '~/usecase/positionFormat';

const KEY = 'clientConfig';
const GENERAL_KEY = 'generalConfig';

export interface ClientConfig {
  defaultVersion: number;
  checkSignatures: boolean;
  paths: Record<number, string>;
}

export const defaultClientConfig: ClientConfig = {
  checkSignatures: true,
  defaultVersion: DEFAULT_VERSION,
  paths: { [DEFAULT_VERSION]: DEFAULT_DATA_DIR }
};

export async function loadClientConfig(): Promise<ClientConfig> {
  const stored = await getSetting<Partial<ClientConfig>>(KEY, {});
  return {
    ...defaultClientConfig,
    ...stored,
    paths: { ...defaultClientConfig.paths, ...(stored.paths ?? {}) }
  };
}

export async function saveClientConfig(config: ClientConfig): Promise<void> {
  await setSetting(KEY, config);
}

export interface GeneralConfig {
  maxStack: number;
  copyPositionFormat: string;
}

export const defaultGeneralConfig: GeneralConfig = {
  maxStack: DEFAULT_MAX_STACK,
  copyPositionFormat: DEFAULT_COPY_POSITION_FORMAT
};

export async function loadGeneralConfig(): Promise<GeneralConfig> {
  const stored = await getSetting<Partial<GeneralConfig>>(GENERAL_KEY, {});
  return { ...defaultGeneralConfig, ...stored };
}

export async function saveGeneralConfig(config: GeneralConfig): Promise<void> {
  await setSetting(GENERAL_KEY, config);
}
