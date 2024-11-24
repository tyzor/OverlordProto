import {
  Color3,
  MeshBuilder,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector2,
  Vector3,
} from "@babylonjs/core";
import { Entity, createEntity } from "./entity";
import { PhysicsSystem } from "../systems/physics";
import RAPIER from "@dimforge/rapier2d-compat";
import { randomInt } from "crypto";

export function createProjectile(scene: Scene, physics: PhysicsSystem): Entity {
  let obj = createEntity();

  obj.mesh = MeshBuilder.CreateSphere("sphere", { diameter: 1 }, scene);
  obj.currentPosition = obj.mesh.absolutePosition.clone();
  obj.lastPosition = obj.currentPosition.clone();

  const ballMat = new StandardMaterial("ballMaterial", scene);
  ballMat.diffuseColor = new Color3(1, 0, 0);
  obj.mesh.material = ballMat;

  let w = physics.world;
  obj.rigidBody = w.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .lockRotations()
      .setLinearDamping(0)
      .setCcdEnabled(true)
  );

  obj.colliders = [
    w.createCollider(
      RAPIER.ColliderDesc.ball(0.5)
        .setRestitution(1)
        .setFriction(0)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      obj.rigidBody
    ),
  ];

  physics.registerRigidBody(obj.rigidBody, obj);
  physics.registerCollider(obj.colliders[0], obj);

  // TODO -- debug components
  //obj.rigidBody.setLinvel(new RAPIER.Vector2(30, 20), true);
  obj.maxVelocity = 15;
  let dir = Vector2.Random(-1, 1)
    .normalize()
    .scale(obj.maxVelocity / 2);
  obj.rigidBody.setLinvel(new RAPIER.Vector2(dir.x, dir.y), true);
  obj.factionId = 1;
  obj.damageAmount = 1;

  return obj;
}
