import Table from 'cli-table3';
import { Command } from 'commander';
import { listCommand } from '../../src/commands/list';
import logger from '../../src/logger';
import Eval, { EvalQueries } from '../../src/models/eval';
import { wrapTable } from '../../src/table';
import telemetry from '../../src/telemetry';
import { type PromptWithMetadata, type TestCasesWithMetadata } from '../../src/types';
import { getPrompts, getTestCases } from '../../src/util';

jest.mock('../../src/logger');
jest.mock('../../src/models/eval');
jest.mock('../../src/telemetry');
jest.mock('../../src/util');
jest.mock('../../src/table');

describe('listCommand', () => {
  let program: Command;

  beforeEach(() => {
    jest.resetAllMocks();
    program = new Command();
    listCommand(program);
    jest.mocked(wrapTable).mockReturnValue(new Table());
    jest.mocked(telemetry.send).mockResolvedValue();
  });

  describe('evals command', () => {
    it('should list evaluations', async () => {
      const mockEvals = [
        {
          id: 'eval1',
          createdAt: 1000,
          config: { description: 'test eval 1' },
          getPrompts: () => [
            {
              raw: 'prompt1',
              label: 'test',
            },
          ],
        },
      ] as unknown as Eval[];

      const mockVars = {
        eval1: ['var1', 'var2'],
      };

      jest.mocked(Eval.getMany).mockResolvedValue(mockEvals);
      jest.spyOn(EvalQueries, 'getVarsFromEvals').mockResolvedValue(mockVars);
      jest.mocked(wrapTable).mockReturnValueOnce('table output' as any);

      await program.parseAsync(['node', 'test', 'list', 'evals']);

      expect(telemetry.record).toHaveBeenCalledWith('command_used', { name: 'list evals' });
      expect(Eval.getMany).toHaveBeenCalledWith(undefined);
      expect(wrapTable).toHaveBeenCalledWith(
        [
          {
            'eval id': 'eval1',
            description: 'test eval 1',
            prompts: expect.any(String),
            vars: 'var1, var2',
          },
        ],
        expect.any(Object),
      );
      expect(logger.info).toHaveBeenCalledWith('table output');
    });

    it('should show only eval IDs when --ids-only flag is used', async () => {
      const mockEvals = [{ id: 'eval1' }, { id: 'eval2' }] as unknown as Eval[];

      jest.mocked(Eval.getMany).mockResolvedValue(mockEvals);

      await program.parseAsync(['node', 'test', 'list', 'evals', '--ids-only']);

      expect(logger.info).toHaveBeenNthCalledWith(1, 'eval1');
      expect(logger.info).toHaveBeenNthCalledWith(2, 'eval2');
    });
  });

  describe('prompts command', () => {
    it('should list prompts', async () => {
      const mockPrompts = [
        {
          id: 'prompt1',
          prompt: {
            provider: 'test-provider',
            raw: 'test prompt 1',
            label: 'test',
          },
          count: 1,
          recentEvalId: 'eval1',
          recentEvalDate: new Date(),
          evals: [],
        },
      ] as unknown as PromptWithMetadata[];

      jest.mocked(getPrompts).mockResolvedValue(mockPrompts);
      jest.mocked(wrapTable).mockReturnValueOnce('table output' as any);

      await program.parseAsync(['node', 'test', 'list', 'prompts']);

      expect(telemetry.record).toHaveBeenCalledWith('command_used', { name: 'list prompts' });
      expect(getPrompts).toHaveBeenCalledWith(undefined);
      expect(wrapTable).toHaveBeenCalledWith(
        [
          {
            'prompt id': 'prompt1'.slice(0, 6),
            raw: 'test prompt 1',
            evals: 1,
            'recent eval': 'eval1',
          },
        ],
        expect.any(Object),
      );
      expect(logger.info).toHaveBeenCalledWith('table output');
    });

    it('should show only prompt IDs when --ids-only flag is used', async () => {
      const mockPrompts = [
        {
          id: 'prompt1',
          prompt: {
            provider: 'test-provider',
            raw: 'test',
            label: 'test',
          },
          count: 1,
          recentEvalId: 'eval1',
          recentEvalDate: new Date(),
          evals: [],
        },
      ] as unknown as PromptWithMetadata[];

      jest.mocked(getPrompts).mockResolvedValue(mockPrompts);

      await program.parseAsync(['node', 'test', 'list', 'prompts', '--ids-only']);

      expect(logger.info).toHaveBeenCalledWith('prompt1');
    });
  });

  describe('datasets command', () => {
    it('should list datasets', async () => {
      const mockDatasets = [
        {
          id: 'dataset1',
          prompts: [
            {
              id: 'prompt1',
              prompt: {
                provider: 'test-provider',
                raw: 'test',
                label: 'test',
                metrics: {
                  cost: 0,
                  score: 0.8,
                  testPassCount: 1,
                  testFailCount: 0,
                  testErrorCount: 0,
                  assertPassCount: 1,
                  assertFailCount: 0,
                  totalLatencyMs: 100,
                  namedScores: {},
                  namedScoresCount: {},
                  tokenUsage: {
                    prompt: 10,
                    completion: 20,
                    total: 30,
                  },
                },
              },
            } as any,
          ],
          count: 1,
          recentEvalId: 'eval1',
          recentEvalDate: new Date(),
          testCases: [],
        },
      ] as unknown as TestCasesWithMetadata[];

      jest.mocked(getTestCases).mockResolvedValue(mockDatasets);
      jest.mocked(wrapTable).mockReturnValueOnce('table output' as any);

      await program.parseAsync(['node', 'test', 'list', 'datasets']);

      expect(telemetry.record).toHaveBeenCalledWith('command_used', { name: 'list datasets' });
      expect(getTestCases).toHaveBeenCalledWith(undefined);
      expect(wrapTable).toHaveBeenCalledWith(
        [
          {
            'dataset id': 'dataset1'.slice(0, 6),
            'best prompt': 'prompt1'.slice(0, 6),
            evals: 1,
            prompts: 1,
            'recent eval': 'eval1',
          },
        ],
        expect.any(Object),
      );
      expect(logger.info).toHaveBeenCalledWith('table output');
    });

    it('should show only dataset IDs when --ids-only flag is used', async () => {
      const mockDatasets = [
        {
          id: 'dataset1',
          prompts: [],
          count: 1,
          recentEvalId: 'eval1',
          recentEvalDate: new Date(),
          testCases: [],
        },
      ] as unknown as TestCasesWithMetadata[];

      jest.mocked(getTestCases).mockResolvedValue(mockDatasets);

      await program.parseAsync(['node', 'test', 'list', 'datasets', '--ids-only']);

      expect(logger.info).toHaveBeenCalledWith('dataset1');
    });

    it('should handle empty prompts array in dataset', async () => {
      const mockDatasets = [
        {
          id: 'dataset1',
          prompts: [],
          count: 1,
          recentEvalId: 'eval1',
          recentEvalDate: new Date(),
          testCases: [],
        },
      ] as unknown as TestCasesWithMetadata[];

      jest.mocked(getTestCases).mockResolvedValue(mockDatasets);
      jest.mocked(wrapTable).mockReturnValueOnce('table output' as any);

      await program.parseAsync(['node', 'test', 'list', 'datasets']);

      expect(wrapTable).toHaveBeenCalledWith(
        [
          {
            'dataset id': 'dataset1'.slice(0, 6),
            'best prompt': 'N/A',
            evals: 1,
            prompts: 0,
            'recent eval': 'eval1',
          },
        ],
        expect.any(Object),
      );
    });
  });
});
