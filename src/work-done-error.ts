import type { Workload } from './workload';

/**
 * An error indicating the work is already done.
 */
export class WorkDoneError<TWork = unknown> extends TypeError {

  /**
   * Constructs a work done error.
   *
   * @param workload - A workload the work is done for.
   * @param work - The work already done, if any.
   * @param reason - The reason of work failure, or `undefined` if the work completed successfully.
   * @param message - Custom error message.
   */
  constructor(
      readonly workload: Workload<TWork>,
      readonly work: TWork | undefined,
      readonly reason: unknown,
      message = workload.workName(work) + (reason !== undefined
          ? ` already terminated (${reason})`
          : ' already done'),
  ) {
    super(message);
  }

}
