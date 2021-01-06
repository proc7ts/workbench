import type { Workload } from './workload';

export class WorkDoneError<TWork = unknown> extends TypeError {

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
