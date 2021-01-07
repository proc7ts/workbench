import type { SupplyPeer } from '@proc7ts/primitives';
import { Supply } from '@proc7ts/primitives';
import type { Workbench } from '../workbench';
import type { Workload } from '../workload';

/**
 * @internal
 */
export class OrderedTasks {

  private readonly _queues = new Map<Workload<unknown>, TaskQueue>();

  constructor(private readonly _allotment: Workload.Allotment<OrderedTasks>) {
  }

  runAfter<TResult>(
      workload: Workload<unknown>,
      actor: SupplyPeer,
      task: Workbench.Task<TResult>,
  ): Promise<TResult> {

    let queue = this._queues.get(workload);

    if (!queue) {
      queue = new TaskQueue(this._allotment);
      this._queues.set(workload, queue);
    }

    return queue.enqueue(actor, task);
  }

}

const TaskQueueEntry$done__reason = {};

class TaskQueue {

  /**
   * Enqueued tasks.
   *
   * The subsequent tasks are waiting for preceding ones. The very first one is always running.
   */
  private readonly _tasks: TaskQueueEntry<unknown>[] = [];

  constructor(readonly _allotment: Workload.Allotment<OrderedTasks>) {
  }

  enqueue<TResult>(actor: SupplyPeer, task: Workbench.Task<TResult>): Promise<TResult> {
    return new Promise((resolve, reject) => {

      const supply = new Supply().needs(actor);
      const entry: TaskQueueEntry<TResult> = {
        task,
        run: () => {
          resolve(this._allotment.run(task).finally(() => {
            // Remove from the queue.
            this._tasks.shift();
            supply.off(TaskQueueEntry$done__reason);
            // Run next.
            this._runNext();
          }));
        },
      };

      this._tasks.push(entry);

      supply.whenOff(reason => {
        if (reason !== TaskQueueEntry$done__reason) {
          // Stopped unexpectedly.

          const index = this._tasks.indexOf(entry);

          if (index > 0) {
            // Do not remove the very first (running) task.
            this._tasks.splice(index, 1);
          }

          reject(reason);
        }
      });

      if (this._tasks.length === 1) {
        // The first task is just enqueued.
        // Run it immediately, as there is nothing to wait for.
        this._runNext();
      }
    });
  }

  private _runNext(): void {

    const [first] = this._tasks;

    if (first) {
      first.run();
    }
  }

}

interface TaskQueueEntry<TResult> {
  readonly task: Workbench.Task<TResult>;
  run(): void;
}
