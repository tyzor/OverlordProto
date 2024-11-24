import * as _ from "lodash-es";
import { Entity, getAllEntities } from "../entities/entity";
import { InputSystem } from "./input-system";
import { Matrix, Quaternion, Vector2, Vector3 } from "@babylonjs/core";
import { WORLD_BASES } from "../world";
import { RigidBodyType } from "@dimforge/rapier2d-compat";

export class PlayerMovementSystem {
  constructor() {}

  private _tmpVec = Vector2.Zero();
  update(dt: number, inputSystem: InputSystem) {
    /*
    if (
      !entity.controllerId ||
      entity.currentAngle === undefined ||
      entity.paddleMax === undefined ||
      entity.paddleMin === undefined ||
      !entity.rigidBody ||
      !entity.pivotPoint ||
      !entity.angularSpeed
    )
      */
    //return;

    // Get all player entities with input
    let playerEntities = getAllEntities().filter((e) => {
      return e.controllerId !== undefined;
    });
    playerEntities.forEach((player) => {
      // process player timers
      if (player.sensorTriggerTimer && player.sensorTriggerTimer > 0) {
        player.sensorTriggerTimer -= dt;
        player.attachSensor?.setEnabled(player.sensorTriggerTimer <= 0);
      }

      let controller = inputSystem.getController(player.controllerId ?? -1);
      if (!controller) return;

      // Process controller input
      let startAngle = player.currentAngle ?? 0;
      player.currentAngle = _.clamp(
        startAngle +
          controller.input.dir.x * (player.angularSpeed ?? 0) * (dt / 1000),
        player.paddleMin ?? 0,
        player.paddleMax ?? 0
      );

      // update physics to ensure we have the new target
      let delta = player.currentAngle - startAngle;
      if (Math.abs(delta) > 0) {
        let baseAngle = (player.baseIndex ?? 0) * 90;
        let rad = ((player.currentAngle + baseAngle) * Math.PI) / 180;

        // Physics system needs to invert angle (right vs left handed)
        player.rigidBody?.setNextKinematicRotation(-rad);
      }

      // Move held entity
      if (player.heldEntity && player.heldEntity.mesh && player.mesh) {
        let pos = player.heldEntity.mesh.getAbsolutePosition();
        // Ensure physics system is up to date with mesh position
        player.heldEntity.rigidBody?.setTranslation(
          { x: pos.x, y: pos.z },
          true
        );

        // is player pressing launch button
        if (controller.input.action === true) {
          player.attachSensor?.setEnabled(true);
          player.heldEntity.rigidBody?.setBodyType(RigidBodyType.Dynamic, true);

          // launch object in direction
          player.heldEntity.rigidBody?.setLinvel({ x: 0, y: 0 }, true);
          player.heldEntity.rigidBody?.setAngvel(0, true);
          let dir = player.heldEntity.mesh.absolutePosition
            .subtract(player.mesh?.absolutePosition)
            .normalize();
          console.log("adding launch force", dt);
          player.heldEntity.rigidBody?.applyImpulse(
            {
              x: dir.x * (player.launchForce ?? 0),
              y: dir.z * (player.launchForce ?? 0),
            },
            true
          );
          player.sensorTriggerTimer = player.sensorTriggerCooldown ?? 0;
          player.attachSensor?.setEnabled(false);
          player.heldEntity.mesh.setParent(null);
          player.heldEntity = null;
        }
      }
    });
  }

  /*
  let x = Math.cos(rad);
  let y = Math.sin(rad);

  entity.rigidBody?.setTranslation({
    x: x * entity.pivotLength + entity.pivotPoint.x,
    y: y * entity.pivotLength + entity.pivotPoint.y,
  });

  let startAngle = (entity.paddleMin + entity.paddleMax) / 2;
  let diffAngle = entity.currentAngle - startAngle;
  entity.mesh.rotationQuaternion = Quaternion.FromEulerAngles(
    0,
    -(diffAngle * Math.PI) / 180,
    0
  );
  */

  //console.log(rad, x, y);
}

// players objects
// player inputs
