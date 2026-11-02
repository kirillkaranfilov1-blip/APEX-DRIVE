import RAPIER from '@dimforge/rapier3d-compat';

export class PhysicsWorld {
  static FIXED_DT = 1 / 60;
  static MAX_STEPS = 5;

  constructor(RAPIERModule, world, eventQueue) {
    this.RAPIER = RAPIERModule;
    this.world = world;
    this.eventQueue = eventQueue;
    this.contactForceListeners = new Set();
    this.accumulator = 0;
    world.integrationParameters.dt = PhysicsWorld.FIXED_DT;
  }

  static async create() {
    await RAPIER.init();
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    return new PhysicsWorld(RAPIER, world, new RAPIER.EventQueue(true));
  }

  subscribeContactForces(listener) {
    this.contactForceListeners.add(listener);
    return () => this.contactForceListeners.delete(listener);
  }

  drainContactForces() {
    this.eventQueue.drainContactForceEvents((event) => {
      const direction = event.maxForceDirection();
      const contact = {
        collider1: event.collider1(),
        collider2: event.collider2(),
        totalForceMagnitude: event.totalForceMagnitude(),
        maxForceMagnitude: event.maxForceMagnitude(),
        maxForceDirection: { x: direction.x, y: direction.y, z: direction.z },
      };
      for (const listener of this.contactForceListeners) listener(contact);
    });
  }

  advance(frameDelta, beforeStep) {
    this.accumulator = Math.min(this.accumulator + frameDelta, PhysicsWorld.FIXED_DT * PhysicsWorld.MAX_STEPS);
    let steps = 0;
    while (this.accumulator >= PhysicsWorld.FIXED_DT && steps < PhysicsWorld.MAX_STEPS) {
      beforeStep?.(PhysicsWorld.FIXED_DT);
      this.world.step(this.eventQueue);
      this.drainContactForces();
      this.accumulator -= PhysicsWorld.FIXED_DT;
      steps += 1;
    }
    return steps;
  }

  dispose() {
    this.eventQueue.free();
    this.world.free();
    this.contactForceListeners.clear();
  }
}
