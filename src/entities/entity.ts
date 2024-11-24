import {
  Mesh,
  Quaternion,
  TransformNode,
  Vector2,
  Vector3,
} from "@babylonjs/core";
import RAPIER from "@dimforge/rapier2d-compat";

export type Entity = {
  id: number;
  mesh?: Mesh;

  // whether this needs to be removed at the end of the frame
  deadComponent?: boolean;

  // Physics
  rigidBody?: RAPIER.RigidBody;
  colliders?: RAPIER.Collider[];
  lastPosition?: Vector3;
  currentPosition?: Vector3;
  maxVelocity?: number;

  // Player data
  controllerId?: number;
  currentAngle?: number;
  angularSpeed?: number;
  pivotPoint?: Vector2;
  pivotLength?: number;
  paddleMin?: number;
  paddleMax?: number;

  // Attach point
  attachSensor?: RAPIER.Collider;
  sensorTriggerCooldown?: number;
  sensorTriggerTimer?: number;
  heldEntity?: Entity | null;
  launchForce?: number;

  // Base block
  baseIndex?: number;
  baseRowNumber?: number;
  baseRowIndex?: number;

  // Health components
  factionId?: number; // what group this belongs to
  health?: number;
  maxHealth?: number;

  // Damage components
  damageAmount?: number;
};

let eidCounter = 0;
let entityMap = new Map<number, Entity>();

export function createEntity(): Entity {
  let newEntity: Entity = {
    id: eidCounter++,
  };
  entityMap.set(newEntity.id, newEntity);
  return newEntity;
}

export function getEntity(id: number): Entity | null {
  return entityMap.get(id) ?? null;
}

export function getAllEntities() {
  return Array.from(entityMap.values());
}

export function removeEntity(id: number) {
  entityMap.delete(id);
}

// TODO -- implement entity queries
