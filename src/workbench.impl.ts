import { alwaysSupply, noop, Supply, SupplyPeer } from '@proc7ts/primitives';
import { WorkDoneError } from './work-done-error';
import type { Workbench } from './workbench';
import type { Workload } from './workload';

/**
 * @internal
 */
export const Workbench$impl__symbol = (/*#__PURE__*/ Symbol('Workbench.impl'));

/**
 * @internal
 */
export class Workbench$ implements SupplyPeer {

  readonly supply: Supply;
  private readonly _works = new Map<Workload<unknown>, unknown>();
  private readonly _run: Required<Workbench.Options>['run'];

  constructor(readonly workbench: Workbench, options: Workbench.Options) {

    const { supply = alwaysSupply(), run } = options;

    this.supply = new Supply(reason => {
      // Reject new work.
      this.work = workload => {
        throw new WorkDoneError(workload, undefined, reason, 'The workbench is stopped');
      };
    })
        .needs(supply)
        .cuts(supply);

    this._run = run ? run.bind(options) : Workbench$run;
  }

  work<TWork>(workload: Workload<TWork>): TWork {
    if (this._works.has(workload)) {
      return this._works.get(workload) as TWork;
    }

    let ensureWorking: () => void = noop;
    const runWorkTask = async <TResult>(
        work: TWork,
        task: Workbench.Task<TResult>,
    ): Promise<TResult> => {

      const result = await this._run(task, work, workload);

      ensureWorking();

      return result;
    };
    const supply = new Supply().needs(this.supply);

    let setWork!: (work: TWork) => TWork;
    let work: TWork | undefined;
    let runTask: <TResult>(task: Workbench.Task<TResult>) => Promise<TResult>;

    const whenWork = new Promise<TWork>(resolve => {
      setWork = newWork => {
        work = newWork;

        this._works.set(workload, newWork);
        runTask = async task => await runWorkTask(newWork, task);

        resolve(newWork);

        return newWork;
      };
    });

    runTask = async task => await runWorkTask(await whenWork, task);

    supply.whenOff(reason => {
      runTask = ensureWorking = () => {
        throw new WorkDoneError(workload, work, reason);
      };
      this._works.delete(workload);
    });

    return setWork(workload.allocator.start({
      workbench: this.workbench,
      workload,
      supply,
      async run<TResult>(task: Workbench.Task<TResult>) {
        return await runTask(task);
      },
    }));
  }

}

async function Workbench$run<TResult, TWork>(
    task: Workbench.Task<TResult>,
    _work: TWork,
    _workload: Workload<TWork>,
): Promise<TResult> {
  return await task();
}
