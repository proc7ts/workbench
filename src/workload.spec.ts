import { noop } from '@proc7ts/primitives';
import { Workload } from './workload';

describe('Workload', () => {

  let workload: Workload<void>;

  beforeEach(() => {
    workload = new Workload('test', { start: noop });
  });

  describe('workName', () => {
    it('contains work name', () => {
      expect(workload.workName()).toEqual('The work of test');
    });
  });

  describe('toString', () => {
    it('contains workload name', () => {
      expect(workload.toString()).toEqual('Workload(test)');
    });
  });
});
