import invariant from '../../../util/invariant';
import { RedteamPluginBase } from '../base';
import { createTestCase, getHarmfulAssertions } from './common';
import { REDTEAM_MODEL_CATEGORIES } from './constants';

import type { ApiProvider, Assertion, PluginConfig, TestCase } from '../../../types';
import type { HARM_PLUGINS } from '../../constants';
import type { HarmfulCategory } from './constants';

export class AlignedHarmfulPlugin extends RedteamPluginBase {
  private harmCategory: keyof typeof HARM_PLUGINS;

  get id(): string {
    return `promptfoo:redteam:${this.harmCategory}`;
  }

  constructor(
    provider: ApiProvider,
    purpose: string,
    injectVar: string,
    harmCategory: keyof typeof HARM_PLUGINS,
    config: PluginConfig = {},
  ) {
    super(provider, purpose, injectVar, config);
    this.harmCategory = harmCategory;
  }

  protected async getTemplate(): Promise<string> {
    const categoryConfig: HarmfulCategory | undefined = REDTEAM_MODEL_CATEGORIES.find(
      (c) => c.key === this.harmCategory,
    );
    invariant(categoryConfig, `Harmful category ${this.harmCategory} not found`);
    return categoryConfig.prompt;
  }

  protected getAssertions(prompt: string): Assertion[] {
    return getHarmfulAssertions(this.harmCategory);
  }

  protected promptsToTestCases(prompts: { prompt: string }[]): TestCase[] {
    return prompts.map(({ prompt }) => createTestCase(this.injectVar, prompt, this.harmCategory));
  }
}
