import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { asis, newPromiseResolver } from '@proc7ts/primitives';
import type { Supply } from '@proc7ts/supply';
import { neverSupply } from '@proc7ts/supply';
import { WorkDoneError } from './work-done-error';
import { Workbench } from './workbench';
import { Workload } from './workload';

describe('Workbench', () => {
  let workbench: Workbench;

  beforeEach(() => {
    workbench = new Workbench();
  });

  interface TestWork {
    readonly supply: Supply;
    run(task: () => number): Promise<number>;
  }

  let workload: Workload<TestWork>;

  beforeEach(() => {
    workload = new Workload('test workload', {
      start(allotment) {
        return {
          supply: allotment.supply,
          run(task) {
            return allotment.run(task);
          },
        };
      },
    });
  });

  it('runs task', async () => {
    const work = workbench.work(workload);

    expect(await work.run(() => 13)).toBe(13);
  });
  it('runs task scheduled while starting the work', async () => {
    const result = newPromiseResolver<number>();

    workload = new Workload('test2', {
      start(allotment) {
        const work: TestWork = {
          supply: allotment.supply,
          run(task) {
            return allotment.run(task);
          },
        };

        result.resolve(work.run(() => 13));

        return work;
      },
    });

    workbench.work(workload);

    expect(await result.promise()).toBe(13);
  });
  it('runs tasks by custom method', async () => {
    const run = jest.fn(
      async <TResult, TWork>(
        task: Workbench.Task<TResult>,
        _work: TWork,
        _workload: Workload<TWork>,
      ): Promise<TResult> => await task(),
    );

    workbench = new Workbench({
      run: run as Workbench.Options['run'],
    });

    const work = workbench.work(workload);

    expect(await work.run(() => 13)).toBe(13);
    expect(run).toHaveBeenCalledWith(
      expect.any(Function) as unknown as Workbench.Task<unknown>,
      work,
      workload,
    );
  });
  it('rejects new tasks after work disposal', async () => {
    const work = workbench.work(workload);

    work.supply.off('reason');

    const error: WorkDoneError = await work.run(() => 1).catch(asis);

    expect(error).toBeInstanceOf(WorkDoneError);
    expect(error.workload).toBe(workload);
    expect(error.work).toBe(work);
  });
  it('fails to complete the task after work disposal', async () => {
    const work = workbench.work(workload);
    const error = await work
      .run(() => {
        work.supply.off();

        return 1;
      })
      .catch(asis);

    expect(error).toBeInstanceOf(WorkDoneError);
    expect(error.workload).toBe(workload);
    expect(error.work).toBe(work);
  });
  it('rejects new tasks after closing workbench', async () => {
    const work = workbench.work(workload);

    workbench.supply.off('reason');

    const error: WorkDoneError = await work.run(() => 1).catch(asis);

    expect(error).toBeInstanceOf(WorkDoneError);
    expect(error.workload).toBe(workload);
    expect(error.work).toBe(work);
  });
  it('caches the work', () => {
    expect(workbench.work(workload)).toBe(workbench.work(workload));
  });
  it('restarts the work after cutting off', () => {
    const work = workbench.work(workload);

    work.supply.off();

    expect(workbench.work(workload)).not.toBe(work);
  });
  it('rejects new work after closing workbench', () => {
    workbench.supply.off();
    expect(() => workbench.work(workload)).toThrow(WorkDoneError as any);
  });
  it('custom supply closes workbench', () => {
    const supply = neverSupply();

    workbench = new Workbench({ supply });

    expect(() => workbench.work(workload)).toThrow(WorkDoneError as any);
  });
});
