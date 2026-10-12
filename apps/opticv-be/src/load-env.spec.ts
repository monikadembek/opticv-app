import * as fs from 'fs';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
}));

describe('loadEnvFile', () => {
  const originalNodeEnv = process.env['NODE_ENV'];
  let loadEnvFileSpy: jest.SpyInstance;
  let loadEnvFile: () => void;

  beforeAll(async () => {
    jest.mocked(fs.existsSync).mockReturnValue(false);
    ({ loadEnvFile } = await import('./load-env.js'));
  });

  beforeEach(() => {
    jest.mocked(fs.existsSync).mockReset();
    loadEnvFileSpy = jest
      .spyOn(process, 'loadEnvFile')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    loadEnvFileSpy.mockRestore();
    if (originalNodeEnv === undefined) {
      delete process.env['NODE_ENV'];
    } else {
      process.env['NODE_ENV'] = originalNodeEnv;
    }
  });

  it('loads the env file for the current NODE_ENV when it exists', () => {
    process.env['NODE_ENV'] = 'staging';
    jest.mocked(fs.existsSync).mockReturnValue(true);

    loadEnvFile();

    expect(loadEnvFileSpy).toHaveBeenCalledWith(
      `${process.cwd()}/apps/opticv-be/config/env/staging.env`,
    );
  });

  it('does nothing when the env file does not exist', () => {
    process.env['NODE_ENV'] = 'production';
    jest.mocked(fs.existsSync).mockReturnValue(false);

    loadEnvFile();

    expect(loadEnvFileSpy).not.toHaveBeenCalled();
  });

  it('does nothing when NODE_ENV is not set', () => {
    delete process.env['NODE_ENV'];

    loadEnvFile();

    expect(fs.existsSync).not.toHaveBeenCalled();
    expect(loadEnvFileSpy).not.toHaveBeenCalled();
  });
});
