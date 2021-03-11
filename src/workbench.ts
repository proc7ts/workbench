import type { Supply, SupplyPeer } from '@proc7ts/supply';
import { Workbench$, Workbench$impl__symbol } from './workbench.impl';
import type { Workload } from './workload';

/**
 * A workbench for coordinated {@link Workload workloads}.
 *
 * Performs a work by running tasks specific to each kind of workload.
 */
export class Workbench implements SupplyPeer {

  /**
   * @internal
   */
  private readonly [Workbench$impl__symbol]: Workbench$;

  /**
   * Constructs a workbench.
   *
   * @param options - Constructed workbench options.
   */
  constructor(options: Workbench.Options = {}) {
    this[Workbench$impl__symbol] = new Workbench$(this, options);
  }

  /**
   * Workbench supply.
   *
   * Once cut off the workbench terminates all current works, and no longer accepts new ones.
   */
  get supply(): Supply {
    return this[Workbench$impl__symbol].supply;
  }

  /**
   * Obtains a work of the given workload.
   *
   * Caches the work previously obtained work of the same workload, until the work is {@link Workload.Allotment.supply
   * disposed}. Creates a new work instance after that.
   *
   * @typeParam TWork - A work type.
   * @param workload - Target workload.
   *
   * @returns A work instance.
   */
  work<TWork>(workload: Workload<TWork>): TWork {
    return this[Workbench$impl__symbol].work(workload);
  }

}

export namespace Workbench {

  /**
   * A task to run by workbench.
   *
   * @typeParam TResult - A type of task result.
   */
  export type Task<TResult> =
  /**
   * @returns A task result evaluated synchronously, or a promise-like instance resolved to asynchronously evaluated
   * result.
   */
      (this: void) => TResult | PromiseLike<TResult>;

  /**
   * Workbench construction options.
   */
  export interface Options {

    /**
     * Workbench supply to use.
     *
     * Once cut off the workbench terminates all current works, and no longer accepts new ones.
     *
     * A new one will be created when omitted.
     */
    readonly supply?: Supply;

    /**
     * Runs the given task.
     *
     * The default runner implementation will be used when omitted.
     *
     * @typeParam TResult - A type of task result.
     * @typeParam TWork - A type of the work the task is part of.
     * @param task - The task to run.
     * @param work - The work instance the task is part of.
     * @param workload - The workload the task is part of.
     */
    run?<TResult, TWork>(task: Task<TResult>, work: TWork, workload: Workload<TWork>): Promise<TResult>;

  }

}
