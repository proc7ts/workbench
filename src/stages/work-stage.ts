import { noop, Supply, valueProvider } from '@proc7ts/primitives';
import type { Workbench } from '../workbench';
import { Workload } from '../workload';
import { WorkOrdering } from './work-ordering.impl';

export class WorkStage extends Workload<WorkStage.Work> {

  constructor(name: string, allocator: WorkStage.Allocator = {}) {
    super(
        name,
        {
          start(allotment: Workload.Allotment<WorkStage.Work>): WorkStage.Work {

            // eslint-disable-next-line prefer-const
            let whenDone: Promise<unknown> = Promise.resolve();

            const addTask = (promise: Promise<unknown>): void => {

              const rev = whenDone = Promise
                  .all([
                    whenDone,
                    promise.catch(noop),
                  ])
                  .finally(() => {
                    if (whenDone === rev) {
                      allotment.supply.off();
                    }
                  });
            };
            let startStage = (work: WorkStage.Work): Promise<void> => {

              const deps: Promise<void>[] = [];
              const addDep = (dep: WorkStage): void => {
                deps.push(new Promise(resolve => {
                  allotment.workbench
                      .work(WorkOrdering.$)
                      .runAfter(dep, allotment, async () => {
                        resolve();
                        await allotment.supply.whenDone();
                      })
                      .catch(noop);
                }));
              };

              const { after } = allocator;

              if (after) {
                addDep(after);
              }
              addDep(allotment.workload);

              const whenStarted = Promise.all(deps).then(async () => {
                if (allocator.start) {
                  await allocator.start(work);
                }
              });

              addTask(whenStarted);
              startStage = valueProvider(whenStarted);

              return whenStarted;
            };

            return {

              workbench: allotment.workbench,
              supply: allotment.supply,

              run(task) {

                const result = startStage(this).then(() => allotment.run(task));

                addTask(result);

                return result;
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

    readonly supply: Supply;

    run<TResult>(task: Workbench.Task<TResult>): Promise<TResult>;

  }

}
