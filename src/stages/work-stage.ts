import { noop, valueProvider } from '@proc7ts/primitives';
import type { Supply } from '@proc7ts/supply';
import { WorkDoneError } from '../work-done-error';
import type { Workbench } from '../workbench';
import { Workload } from '../workload';
import { WorkOrdering } from './work-ordering.impl';

export class WorkStage extends Workload<WorkStage.Work> {

  constructor(name: string, allocator: WorkStage.Allocator = {}) {
    super(
        name,
        {
          start(allotment: Workload.Allotment<WorkStage.Work>): WorkStage.Work {

            const { workbench, workload, supply } = allotment;
            const runner = new WorkStageRunner(allotment, allocator);

            return {

              workbench,
              stage: workload,
              supply,

              async run(task) {
                return await runner.run(this, task);
              },

            };
          },
        },
    );
  }

  workName(_work?: WorkStage.Work): string {
    return `The ${this.name} stage`;
  }

  toString(): string {
    return `WorkStage(${this.name})`;
  }

}

export namespace WorkStage {

  export interface Allocator {

    readonly after?: WorkStage;

    start?(work: Work): void | PromiseLike<unknown>;

  }

  export interface Work {

    readonly workbench: Workbench;

    readonly stage: WorkStage;

    readonly supply: Supply;

    run<TResult>(task: Workbench.Task<TResult>): Promise<TResult>;

  }

}

class WorkStageRunner {

  private readonly _whenAllDone: Promise<unknown>;
  private _whenTaskDone: Promise<unknown> = Promise.resolve();
  private _end!: (result?: PromiseLike<unknown>) => void;

  constructor(
      readonly allotment: Workload.Allotment<WorkStage.Work>,
      readonly allocator: WorkStage.Allocator,
  ) {

    const { supply } = allotment;

    this._whenAllDone = new Promise<unknown>(resolve => this._end = resolve)
        .then(() => supply.off())
        .catch(error => supply.off(error));

    supply.whenOff(reason => {
      if (reason === undefined) {
        this._end();
      } else {
        this._end(Promise.reject(reason));
      }

      // Stop accepting new tasks.
      this.run = (work, _task) => Promise.reject(
          new WorkDoneError(allotment.workload, work, reason),
      );
    });
  }

  run<TResult>(work: WorkStage.Work, task: Workbench.Task<TResult>): Promise<TResult> {

    const promise = this._start(work).then(() => this.allotment.run(task));

    this._addTask(promise);

    return promise;
  }

  private _addTask(taskPromise: Promise<unknown>): void {

    const taskDone = this._whenTaskDone = Promise.all([
      this._whenTaskDone,
      taskPromise.catch(noop),
    ]);

    taskDone.finally(() => {
      if (taskDone === this._whenTaskDone) {
        this._end(taskDone);
      }
    });
  }

  private _start(work: WorkStage.Work): Promise<unknown> {

    let whenStarted = this._awaitDeps();

    if (this.allocator.start) {
      whenStarted = whenStarted.then(async () => {
        await this.allocator.start!(work);
      });
    }

    // Start only once!
    this._start = valueProvider(whenStarted);
    this._addTask(whenStarted);

    return whenStarted;
  }

  private _awaitDeps(): Promise<unknown> {

    const deps: Promise<void>[] = [];
    const addDep = (dep: WorkStage): void => {
      deps.push(new Promise(resolve => {
        this.allotment
            .workbench
            .work(WorkOrdering.$)
            .runAfter(
                dep,
                () => {
                  resolve();
                  return this._whenAllDone;
                },
            )
            .catch(noop);
      }));
    };

    const { after } = this.allocator;

    if (after) {
      addDep(after);
    }
    addDep(this.allotment.workload);

    return Promise.all(deps);
  }

}
