import { Workload } from '../workload';
import { OrderedTasks } from './ordered-tasks.impl';

/**
 * @internal
 */
export class WorkOrdering extends Workload<OrderedTasks> {

  static readonly $ = new WorkOrdering();

  private constructor() {
    super('ordering', {
      start(allotment: Workload.Allotment<OrderedTasks>): OrderedTasks {
        return new OrderedTasks(allotment);
      },
    });
  }

}
