import { afterAll, describe, expect, it } from 'vitest';
import { PhysicsWorld } from '../../frontend/src/physics/PhysicsWorld.js';
import { Vehicle } from '../../frontend/src/vehicle/Vehicle.js';

describe('Rapier vehicle setup', () => {
  let physics;
  afterAll(() => physics?.dispose());

  it('creates four raycast wheels and points the controller along local +Z', async () => {
    physics = await PhysicsWorld.create();
    const floor = physics.world.createRigidBody(physics.RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.3, 0));
    physics.world.createCollider(physics.RAPIER.ColliderDesc.cuboid(50, 0.3, 50), floor);
    const car = new Vehicle({
      physics,
      start: { x: 0, y: 0.9, z: 0, yaw: 0 },
    });

    expect(car.controller.numWheels()).toBe(4);
    expect(car.controller.indexForwardAxis).toBe(2);
    expect(car.controller.indexUpAxis).toBe(1);

    car.preStep({ accelerate: false, brake: false, left: true, right: false, handbrake: false }, 1 / 60);
    expect(car.controller.wheelSteering(0)).toBeGreaterThan(0.09);
    expect(car.controller.wheelSteering(2)).toBe(0);

    for (let step = 0; step < 120; step += 1) {
      physics.advance(1 / 60, (dt) => car.preStep({ accelerate: true, brake: false, left: false, right: true, handbrake: false }, dt));
    }
    const rotation = car.body.rotation();
    const yaw = 2 * Math.atan2(rotation.y, rotation.w);
    expect(car.controller.wheelIsInContact(0)).toBe(true);
    expect(yaw).toBeLessThan(-0.15);
  });

  it('turns left for left input and right for right input', async () => {
    const measureYaw = async (direction) => {
      const localPhysics = await PhysicsWorld.create();
      const floor = localPhysics.world.createRigidBody(localPhysics.RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.3, 0));
      localPhysics.world.createCollider(localPhysics.RAPIER.ColliderDesc.cuboid(50, 0.3, 50), floor);
      const localCar = new Vehicle({ physics: localPhysics, start: { x: 0, y: 0.9, z: 0, yaw: 0 } });
      for (let step = 0; step < 120; step += 1) {
        localPhysics.advance(1 / 60, (dt) => localCar.preStep({
          accelerate: true, brake: false, left: direction === 'left', right: direction === 'right', handbrake: false,
        }, dt));
      }
      const rotation = localCar.body.rotation();
      const yaw = 2 * Math.atan2(rotation.y, rotation.w);
      localPhysics.dispose();
      return yaw;
    };

    expect(await measureYaw('left')).toBeGreaterThan(0.15);
    expect(await measureYaw('right')).toBeLessThan(-0.15);
  });

  it('accelerates smoothly in reverse without alternating between brake and drive', async () => {
    const localPhysics = await PhysicsWorld.create();
    const floor = localPhysics.world.createRigidBody(localPhysics.RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.3, 0));
    localPhysics.world.createCollider(localPhysics.RAPIER.ColliderDesc.cuboid(50, 0.3, 50), floor);
    const localCar = new Vehicle({ physics: localPhysics, start: { x: 0, y: 0.9, z: 0, yaw: 0 } });
    const samples = [];
    let fastestReverse = 0;
    for (let step = 0; step < 360; step += 1) {
      localPhysics.advance(1 / 60, (dt) => localCar.preStep({
        accelerate: false, brake: true, left: false, right: false, handbrake: false,
      }, dt));
      const speed = localCar.getForwardSpeed();
      fastestReverse = Math.min(fastestReverse, speed);
      if (step < 120 && (step + 1) % 30 === 0) samples.push(speed);
    }
    localPhysics.dispose();

    expect(samples[0]).toBeLessThan(-0.5);
    expect(samples[1]).toBeLessThan(samples[0]);
    expect(samples[2]).toBeLessThan(samples[1]);
    expect(samples[3]).toBeLessThan(samples[2]);
    expect(fastestReverse).toBeGreaterThanOrEqual(-14.5);
  });

  it('brakes forward motion to a stop before building reverse speed', async () => {
    const localPhysics = await PhysicsWorld.create();
    const floor = localPhysics.world.createRigidBody(localPhysics.RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.3, 0));
    localPhysics.world.createCollider(localPhysics.RAPIER.ColliderDesc.cuboid(50, 0.3, 50), floor);
    const localCar = new Vehicle({ physics: localPhysics, start: { x: 0, y: 0.9, z: 0, yaw: 0 } });
    localCar.body.setLinvel({ x: 0, y: 0, z: 4 }, true);
    for (let step = 0; step < 6; step += 1) localPhysics.advance(1 / 60, (dt) => localCar.preStep({}, dt));
    const forwardSpeed = localCar.getForwardSpeed();
    for (let step = 0; step < 240; step += 1) {
      localPhysics.advance(1 / 60, (dt) => localCar.preStep({
        accelerate: false, brake: true, left: false, right: false, handbrake: false,
      }, dt));
    }
    const reverseSpeed = localCar.getForwardSpeed();
    localPhysics.dispose();

    expect(forwardSpeed).toBeGreaterThan(0.25);
    expect(reverseSpeed).toBeLessThan(-2);
  });
});
