import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { asis, newPromiseResolver, noop } from '@proc7ts/primitives';
import { WorkDoneError } from '../work-done-error';
import { Workbench } from '../workbench';
import { WorkStage } from './work-stage';

describe('WorkStage', () => {

  let workbench: Workbench;

  beforeEach(() => {
    workbench = new Workbench();
  });

  let stage1: WorkStage;
  let stage2: WorkStage;

  beforeEach(() => {
    stage1 = new WorkStage('stage1');
    stage2 = new WorkStage('stage2', { after: stage1 });
  });

  it('runs a task', async () => {
    expect(await workbench.work(stage1).run(() => 13)).toBe(13);
  });
  it('runs multiple tasks', async () => {
    expect(await Promise.all([
      workbench.work(stage1).run(() => 1),
      workbench.work(stage1).run(() => 2),
    ])).toEqual([1, 2]);
  });
  it('terminates the stage once all tasks done', async () => {

    const work = workbench.work(stage1);

    expect(await Promise.all([
      work.run(() => 1),
      work.run(() => 2),
    ])).toEqual([1, 2]);

    await work.supply.whenDone();

    expect(workbench.work(stage1)).not.toBe(work);
  });
  it('runs dependent stage after dependency', async () => {

    const starter = newPromiseResolver();
    const promises: Promise<unknown>[] = [];
    const results: number[] = [];

    promises.push(workbench.work(stage1).run(async () => {
      await starter.promise();
      results.push(1);
    }));
    promises.push(workbench.work(stage2).run(() => results.push(2)));
    promises.push(workbench.work(stage1).run(() => results.push(3)));

    await promises[2];
    expect(results).toEqual([3]);

    starter.resolve();
    await Promise.all(promises);

    expect(results).toEqual([3, 1, 2]);
  });
  it('runs dependent stage after no-op dependency', async () => {

    const work1 = workbench.work(stage1); // Create stage
    const promise = work1.run(() => 1);

    expect(await workbench.work(stage2).run(() => 2)).toBe(2);
    expect(await promise).toBe(1);
    expect(work1.supply.isOff).toBe(true);
  });
  it('orders multiple dependants', async () => {

    const stage3 = new WorkStage('stage3', { after: stage1 });

    const starter1 = newPromiseResolver();
    const starter2 = newPromiseResolver();
    const starter3 = newPromiseResolver();
    const promises: Promise<unknown>[] = [];
    const results: number[] = [];

    promises.push(workbench.work(stage1).run(async () => {
      await starter1.promise();
      results.push(1);
    }));
    promises.push(workbench.work(stage2).run(async () => {
      results.push(21);
      starter2.resolve();
      await starter3.promise();
      results.push(22);
    }));
    promises.push(workbench.work(stage3).run(() => results.push(3)));

    starter1.resolve();
    await starter2.promise();
    expect(results).toEqual([1, 21]);

    starter3.resolve();
    await Promise.all(promises);
    expect(results).toEqual([1, 21, 22, 3]);
  });
  it('runs dependent stage after aborted dependency', async () => {

    const starter = newPromiseResolver();
    const work1 = workbench.work(stage1);
    const error = new Error('test');

    const promise1 = work1.run(async () => {
      await starter.promise();
      work1.supply.off(error);
    }).catch(asis);
    const promise2 = workbench.work(stage2).run(() => 2);

    starter.resolve();
    expect(await promise1).toBeInstanceOf(WorkDoneError);
    expect(await promise2).toBe(2);
    expect(work1.supply.isOff).toBe(true);
  });
  it('starts the tasks after custom startup', async () => {

    const starter1 = newPromiseResolver();
    const starter2 = newPromiseResolver();
    const results: number[] = [];
    const start = jest.fn(async () => {
      results.push(1);
      starter1.resolve();
      await starter2.promise();
      results.push(2);
    });

    stage1 = new WorkStage('stage1', { start });

    const work = workbench.work(stage1);
    const promise = work.run(() => results.push(3));

    await starter1.promise();
    expect(results).toEqual([1]);

    starter2.resolve();
    await promise;
    expect(results).toEqual([1, 2, 3]);
  });
  it('rejects new tasks after stage completion', async () => {

    const work = workbench.work(stage1);

    work.supply.off();

    const error: WorkDoneError = await work.run(noop).catch(asis);

    expect(error).toBeInstanceOf(WorkDoneError);
    expect(error.workload).toBe(stage1);
    expect(error.work).toBe(work);
  });

  describe('workName', () => {
    it('is after stage name', () => {
      expect(stage1.workName()).toBe('The stage1 stage');
    });
  });

  describe('toString', () => {
    it('contains stage name', () => {
      expect(stage1.toString()).toBe('WorkStage(stage1)');
    });
  });
});
