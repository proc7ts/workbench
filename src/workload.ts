import type { Supply, SupplyPeer } from '@proc7ts/supply';
import type { Workbench } from './workbench';

/**
 * A workload able to perform a work within a workbench.
 *
 * The work specific to workload is represented by work instances. Such instances are available in {@link Workbench.work
 * workbench} and can be used e.g. to run workload-specific tasks.
 *
 * The same workload instance can be used in different workbenches.
 *
 * @typeParam TWork - A work type performed by this workload.
 */
export class Workload<TWork> {

  /**
   * Human-readable workload name.
   */
  readonly name: string;

  /**
   * Work allocator.
   */
  readonly allocator: Workload.Allocator<TWork>;

  /**
   * Constructs a workload.
   *
   * @param name - Human-readable workload name.
   * @param allocator - A work allocator specific to constructed workload.
   */
  constructor(name: string, allocator: Workload.Allocator<TWork>) {
    this.name = name;
    this.allocator = allocator;
  }

  /**
   * Builds a human-readable name of the work performed by this workload.
   *
   * This is used e.g. to construct a default error message for {@link WorkDoneError}.
   *
   * @param _work - Target work.
   *
   * @returns A string containing work name.
   */
  workName(_work?: TWork): string {
    return `The work of ${this.name}`;
  }

  toString(): string {
    return `Workload(${this.name})`;
  }

}

export namespace Workload {
  /**
   * Work allocator.
   *
   * Responsible for the work allocation for particular workload.
   *
   * @typeParam TWork - A work type performed by target workload.
   */
  export interface Allocator<TWork> {
    /**
     * Starts the work.
     *
     * @param allotment - Work allotment.
     */
    start(allotment: Allotment<TWork>): TWork;
  }

  /**
   * Work allotment.
   *
   * Provided by workbench to {@link Allocator workload allocator} to allocate the work.
   *
   * @typeParam TWork - A work type performed by target workload.
   */
  export interface Allotment<TWork> extends SupplyPeer {
    /**
     * A workbench the work is allocated within.
     */
    readonly workbench: Workbench;

    /**
     * A workload to allocate the work for.
     */
    readonly workload: Workload<TWork>;

    /**
     * The work allotment supply.
     *
     * Once cut off the work is disposed. No more tasks would be accepted after that, while pending ones would
     * fail.
     */
    readonly supply: Supply;

    /**
     * Runs the task as part of the work.
     *
     * @typeParam TResult - A type of task result.
     * @param task - A task to run.
     *
     * @returns A promise resolved to task result, or rejected if the work is {@link supply disposed} already.
     */
    run<TResult>(task: Workbench.Task<TResult>): Promise<TResult>;
  }
}
