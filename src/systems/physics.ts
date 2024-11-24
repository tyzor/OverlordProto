import { Quaternion, Vector3 } from "@babylonjs/core";
import RAPIER, { Collider, RigidBody } from "@dimforge/rapier2d-compat";
import * as _ from "lodash-es";
import { Entity } from "../entities/entity";

// Max number of physics steps in a frame
const MAX_STEPS = 5;

type CollisionData = {
  handle1: number;
  handle2: number;
  started: boolean;
};

export class PhysicsSystem {
  private _world!: RAPIER.World;

  private _eventQueue!: RAPIER.EventQueue;

  private _fixedTimestepAccumulator: number = 0;
  private _fixedAlpha: number = 0; // the ratio of how far the accumulator is from the next state

  private _rigidBodies = new Map<number, Entity>();
  private _colliders = new Map<number, Entity>();

  get world() {
    if (!this._world)
      throw new Error("Rapier library attempt to access before load!");
    return this._world;
  }

  private _interpolation = false;

  constructor() {}

  async init() {
    // Load physics
    await RAPIER.init();

    // Init world with no gravity
    this._world = new RAPIER.World(new RAPIER.Vector2(0, 0));

    this._eventQueue = new RAPIER.EventQueue(true);

    // TODO -- move into config options?
    //this._world.timestep = 1 / 60;
    //this._interpolation = true;

    this.setupWorldBounds();

    return this;
  }

  // Physics sim step
  fixedUpdate(dt: number) {
    this._fixedTimestepAccumulator += dt;

    let ws = this._world.timestep * 1000;

    let nSteps = _.clamp(
      Math.floor(this._fixedTimestepAccumulator / ws),
      0,
      MAX_STEPS
    );

    if (nSteps > 0) this._fixedTimestepAccumulator %= ws;
    this._fixedAlpha = this._fixedTimestepAccumulator / ws;

    //this._rigidBodies.forEach((ent) => this.resetTransform(ent));
    for (var i = 0; i < nSteps; i++) {
      // Do one physics step
      this._world.step(this._eventQueue);

      this._rigidBodies.forEach((ent) => {
        this.updateTransform(ent);
      });

      // Drain the collision list
      this._eventQueue.drainCollisionEvents((handle1, handle2, started) => {
        this.processCollision({ handle1, handle2, started });
      });
    }
  }

  public registerRigidBody(rb: RigidBody, entity: Entity) {
    this._rigidBodies.set(rb.handle, entity);
  }
  public unregisterRigidBody(rb: RigidBody) {
    this._world.removeRigidBody(rb);
    this._rigidBodies.delete(rb.handle);
  }
  public registerCollider(col: Collider, entity: Entity) {
    this._colliders.set(col.handle, entity);
  }
  public unregisterCollider(col: Collider) {
    this._world.removeCollider(col, false);
    this._colliders.delete(col.handle);
  }

  private _tempVec: Vector3 = Vector3.Zero(); // used for scratch operations to not invoke a new object
  private updateTransform(entity: Entity) {
    // TODO -- reduce amount of entities we are updating every frame? Maybe flag entities as static?

    if (!entity.rigidBody || !entity.currentPosition || !entity.lastPosition)
      return;

    if (
      entity.rigidBody.bodyType() === RAPIER.RigidBodyType.Fixed ||
      entity.rigidBody.isEnabled() === false
    )
      return;

    if (entity.maxVelocity) {
      let lv = entity.rigidBody.linvel();
      let vel2 = Math.pow(lv.x, 2) + Math.pow(lv.y, 2);
      let max2 = Math.pow(entity.maxVelocity, 2);
      if (vel2 > max2) {
        entity.rigidBody.setLinearDamping(vel2 / max2);
      } else {
        entity.rigidBody.setLinearDamping(0);
      }
    }

    entity.lastPosition.copyFrom(entity.currentPosition);

    // Set new current
    let trans = entity.rigidBody.translation();
    entity.currentPosition.x = trans.x;
    entity.currentPosition.z = trans.y;

    // Render smooth
    if (entity.mesh) {
      if (this._interpolation) {
        //console.log("before:", entity.mesh.absolutePosition);
        Vector3.LerpToRef(
          entity.lastPosition,
          entity.currentPosition,
          this._fixedAlpha,
          this._tempVec
        );
        entity.mesh.setAbsolutePosition(this._tempVec);
        //TODO -- interpolate the rotation
      } else {
        entity.mesh.setAbsolutePosition(entity.currentPosition);
        entity.mesh.rotationQuaternion = Quaternion.FromEulerAngles(
          0,
          -entity.rigidBody.rotation(), // invert the angle (right handed vs left handed)
          0
        );
      }
    }
  }

  private setupWorldBounds() {
    // TODO -- register these colliders?
    // Setup world bounds
    let topWall = this._world.createCollider(
      RAPIER.ColliderDesc.cuboid(15, 1)
        .setTranslation(0, 16)
        .setRestitution(1)
        .setFriction(0)
    );
    let bottomWall = this._world.createCollider(
      RAPIER.ColliderDesc.cuboid(15, 1)
        .setTranslation(0, -16)
        .setRestitution(1)
        .setFriction(0)
    );
    let rightWall = this._world.createCollider(
      RAPIER.ColliderDesc.cuboid(1, 15)
        .setTranslation(16, 0)
        .setRestitution(1)
        .setFriction(0)
    );
    let leftwall = this._world.createCollider(
      RAPIER.ColliderDesc.cuboid(1, 15)
        .setTranslation(-16, 0)
        .setRestitution(1)
        .setFriction(0)
    );
  }

  private processCollision(collisionData: CollisionData) {
    // Get any entities involved in collision
    // No entity means it is unknown collider

    // TODO -- expand collisions into collision event entities
    // for now collision will be simple - if there is a damage
    // component it will be applied to the health component

    let entity1 = this._colliders.get(collisionData.handle1);
    let entity2 = this._colliders.get(collisionData.handle2);

    // TODO -- maybe have a die on collision component?

    if (entity1 === undefined || entity2 === undefined) return;

    // Handle sensor
    this.handleSensors(entity1, entity2, collisionData);

    if (collisionData.started === true) return;

    if (entity1.health && entity2.damageAmount)
      entity1.health -= entity2.damageAmount;
    if (entity2.health && entity1.damageAmount)
      entity2.health -= entity1.damageAmount;

    /*
    console.log(
      "collision event!",
      collisionData.handle1,
      collisionData.handle2,
      this._colliders.get(collisionData.handle1)
    );
    */
  }

  private handleSensors(
    entity1: Entity,
    entity2: Entity,
    collisionData: CollisionData
  ) {
    // For now only interested in entering sensor events
    if (collisionData.started === false) return;

    let collider1 = this._world.getCollider(collisionData.handle1);
    let collider2 = this._world.getCollider(collisionData.handle2);

    var sensor;
    var sensorEntity: Entity;
    var otherEntity: Entity;
    if (collider1.isSensor() === true && collider2.isSensor() === false) {
      sensor = collider1;
      sensorEntity = entity1;
      otherEntity = entity2;
    } else if (
      collider1.isSensor() === false &&
      collider2.isSensor() === true
    ) {
      sensor = collider2;
      sensorEntity = entity2;
      otherEntity = entity1;
    } else {
      return;
    }

    // TODO -- maybe do attach with a joint?
    console.log("sensor event");
    //otherEntity.rigidBody?.setEnabled(false);
    otherEntity.rigidBody?.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
    sensorEntity.attachSensor?.setEnabled(false);
    sensorEntity.heldEntity = otherEntity;
    if (sensorEntity.mesh && otherEntity.mesh) {
      let sensorPos = sensor.translation();
      otherEntity.mesh.setAbsolutePosition(
        new Vector3(sensorPos.x, 0, sensorPos.y)
      );
      otherEntity.mesh?.setParent(sensorEntity.mesh!);
    }
  }
}
