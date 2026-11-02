import { describe, expect, it } from 'vitest';
import { PhysicsWorld } from '../../frontend/src/physics/PhysicsWorld.js';

describe('Rapier contact-force events', () => {
  it('notifies subscribers with plain collision data from a fixed step', async () => {
    const physics = await PhysicsWorld.create();
    const { RAPIER, world } = physics;
    const wall = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    world.createCollider(RAPIER.ColliderDesc.cuboid(2, 2, 0.15), wall);
    const chassis = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 0, 0.85).setLinvel(0, 0, -12),
    );
    const collider = world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5)
        .setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS)
        .setContactForceEventThreshold(0),
      chassis,
    );
    const events = [];
    const unsubscribe = physics.subscribeContactForces((event) => events.push(event));

    for (let step = 0; step < 12; step += 1) physics.advance(1 / 60);
    unsubscribe();
    physics.dispose();

    console.log(events[0]);

    expect(events.length).toBeGreaterThan(0);
    expect(events[0]).toMatchObject({ collider1: expect.any(Number), collider2: expect.any(Number) });
    expect([events[0].collider1, events[0].collider2]).toContain(collider.handle);
    expect(events[0].maxForceMagnitude).toBeGreaterThan(0);
    expect(events[0].maxForceDirection).toEqual({ x: expect.any(Number), y: expect.any(Number), z: expect.any(Number) });
  });
});
