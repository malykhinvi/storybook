import deprecate from 'util-deprecate';
import { makeDecorator, StoryContext, StoryGetter } from './make-decorator';

// Copy & paste from internal api: client-api/src/client_api
type DecoratorFn = (fn: StoryGetter, context: StoryContext) => any;

export const defaultDecorateStory = (getStory: StoryGetter, decorators: DecoratorFn[]) =>
  decorators.reduce(
    (decorated, decorator) => (context: StoryContext) =>
      decorator(() => decorated(context), context),
    getStory
  );

jest.mock('util-deprecate');
let deprecatedFns: any[] = [];
(deprecate as any).mockImplementation((fn: (...args: any) => any, warning: string) => {
  const deprecatedFn = jest.fn(fn);
  deprecatedFns.push({
    deprecatedFn,
    warning,
  });
  return deprecatedFn;
});

const baseContext = {
  name: '',
  kind: '',
  parameters: {},
};

describe('makeDecorator', () => {
  it('returns a decorator that passes parameters on the parameters argument', () => {
    const wrapper = jest.fn();
    const decorator = makeDecorator({ wrapper, name: 'test', parameterName: 'test' });
    const story = jest.fn();
    const decoratedStory = defaultDecorateStory(story, [decorator]);

    const context = { kind: '', name: '', parameters: { test: 'test-val' } };
    decoratedStory(context);

    expect(wrapper).toHaveBeenCalledWith(expect.any(Function), context, { parameters: 'test-val' });
  });

  it('passes options added at decoration time', () => {
    const wrapper = jest.fn();
    const decorator = makeDecorator({ wrapper, name: 'test', parameterName: 'test' });
    const story = jest.fn();
    const options = 'test-val';
    const decoratedStory = defaultDecorateStory(story, [decorator(options)]);

    const context = { ...baseContext };
    decoratedStory(context);

    expect(wrapper).toHaveBeenCalledWith(expect.any(Function), context, { options: 'test-val' });
  });

  it('passes both options *and* parameters at the same time', () => {
    const wrapper = jest.fn();
    const decorator = makeDecorator({ wrapper, name: 'test', parameterName: 'test' });
    const story = jest.fn();
    const options = 'test-val';
    const decoratedStory = defaultDecorateStory(story, [decorator(options)]);

    const context = { ...baseContext, parameters: { test: 'test-val' } };
    decoratedStory(context);

    expect(wrapper).toHaveBeenCalledWith(expect.any(Function), context, {
      options: 'test-val',
      parameters: 'test-val',
    });
  });

  it('passes nothing if neither are supplied', () => {
    const wrapper = jest.fn();
    const decorator = makeDecorator({ wrapper, name: 'test', parameterName: 'test' });
    const story = jest.fn();
    const decoratedStory = defaultDecorateStory(story, [decorator]);

    const context = { ...baseContext };
    decoratedStory(context);

    expect(wrapper).toHaveBeenCalledWith(expect.any(Function), context, {});
  });

  it('calls the story directly if neither options or parameters are supplied and skipIfNoParametersOrOptions is true', () => {
    const wrapper = jest.fn();
    const decorator = makeDecorator({
      wrapper,
      name: 'test',
      parameterName: 'test',
      skipIfNoParametersOrOptions: true,
    });
    const story = jest.fn();
    const decoratedStory = defaultDecorateStory(story, [decorator]);

    const context = { ...baseContext };
    decoratedStory(context);

    expect(wrapper).not.toHaveBeenCalled();
    expect(story).toHaveBeenCalled();
  });

  it('calls the story directly if the disable parameter is passed to the decorator', () => {
    const wrapper = jest.fn();
    const decorator = makeDecorator({
      wrapper,
      name: 'test',
      parameterName: 'test',
      skipIfNoParametersOrOptions: true,
    });
    const story = jest.fn();
    const decoratedStory = defaultDecorateStory(story, [decorator]);

    const context = { ...baseContext, parameters: { test: { disable: true } } };
    decoratedStory(context);

    expect(wrapper).not.toHaveBeenCalled();
    expect(story).toHaveBeenCalled();
  });

  it('passes options added at story time, but with a deprecation warning, if allowed', () => {
    deprecatedFns = [];
    const wrapper = jest.fn();
    const decorator = makeDecorator({
      wrapper,
      name: 'test',
      parameterName: 'test',
      allowDeprecatedUsage: true,
    });
    const options = 'test-val';
    const story = jest.fn();
    const decoratedStory = decorator(options)(story);
    expect(deprecatedFns).toHaveLength(1);
    expect(deprecatedFns[0].warning).toMatch('addDecorator(test)');

    const context = { ...baseContext };
    decoratedStory(context);

    expect(wrapper).toHaveBeenCalledWith(expect.any(Function), context, {
      options: 'test-val',
    });
    expect(deprecatedFns[0].deprecatedFn).toHaveBeenCalled();
  });

  it('throws if options are added at storytime, if not allowed', () => {
    const wrapper = jest.fn();
    const decorator = makeDecorator({
      wrapper,
      name: 'test',
      parameterName: 'test',
      allowDeprecatedUsage: false,
    });
    const options = 'test-val';
    const story = jest.fn();
    expect(() => decorator(options)(story)).toThrow(/not allowed/);
  });
});
