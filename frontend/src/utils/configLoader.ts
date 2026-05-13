// Loads shared application configuration with a fallback default.

export type AppConfigDecoration = {
  hash: number;
  fv: number;
  src: string;
  viewWidth: number;
  viewHeight: number;
  name: string;
};

export type AppConfig = {
  appTitle: string;
  apiVersion: string;
  defaults: {
    rotFull: number;
    rotLineRopeOffset: number;
    rotStep: number;
    maxUndoSteps: number;
    lineBrushVertexDist: number;
    ropeSpacingWorld: number;
    ropeMarginFromWallWorld: number;
  };
  limits: {
    maxUploadSizeBytes: number;
  };
  assetCatalog: Record<
    string,
    {
      nameRu: string;
      hash: number;
    }
  >;
  decorations: AppConfigDecoration[];
};

let appConfig: AppConfig | null = null;

function defaultAppConfig(): AppConfig {
  return {
    appTitle: 'Hideout Editor',
    apiVersion: '1.0.1',
    defaults: {
      rotFull: 65536,
      rotLineRopeOffset: 32768,
      rotStep: 2048,
      maxUndoSteps: 96,
      lineBrushVertexDist: 1.0,
      ropeSpacingWorld: 3.0,
      ropeMarginFromWallWorld: 3.0,
    },
    limits: {
      maxUploadSizeBytes: 31457280,
    },
    assetCatalog: {
      rope: {
        nameRu: 'Фаридунские верёвки',
        hash: 1675705915,
      },
      moss: {
        nameRu: 'Мох с опушки 3',
        hash: 1459723677,
      },
      sand: {
        nameRu: 'Летающий песок',
        hash: 3853073345,
      },
    },
    decorations: [
      {
        hash: 1675705915,
        fv: 3,
        src: '/decorations/FaridunRopes.webp',
        viewWidth: 10,
        viewHeight: 14,
        name: 'Rope',
      },
      {
        hash: 1459723677,
        fv: 2,
        src: '/decorations/FringeMoss.webp',
        viewWidth: 11,
        viewHeight: 10,
        name: 'Moss',
      },
      {
        hash: 3853073345,
        fv: 0,
        src: '/decorations/FallingSand.webp',
        viewWidth: 12,
        viewHeight: 12,
        name: 'Sand',
      },
    ],
  };
}

export const loadAppConfig = async (): Promise<AppConfig> => {
  if (appConfig) {
    return appConfig;
  }

  try {
    const response = await fetch('/config/app-config.json');
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.statusText}`);
    }
    const parsed = (await response.json()) as AppConfig;
    appConfig = parsed;
    return parsed;
  } catch (error) {
    console.warn('Failed to load shared config, using defaults:', error);
    // Fallback defaults when the remote config cannot be fetched.
    return defaultAppConfig();
  }
};

// Async accessor used by the rest of the app to obtain the resolved config.
export const useAppConfig = async (): Promise<AppConfig> => {
  return await loadAppConfig();
};
