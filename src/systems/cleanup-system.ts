import { getAllEntities, removeEntity } from "../entities/entity";
import { PhysicsSystem } from "./physics";

export function cleanupSystem(physics: PhysicsSystem) {
  let entities = getAllEntities();

  entities.forEach((entity) => {
    if (entity.deadComponent === true) {
      console.log("deadComponent found");
      if (entity.colliders !== undefined && entity.colliders.length > 0) {
        entity.colliders.forEach((c) => physics.unregisterCollider(c));
      }
      if (entity.rigidBody) physics.unregisterRigidBody(entity.rigidBody);
      if (entity.mesh !== undefined) {
        entity.mesh.dispose();
        entity.mesh.getScene().removeMesh(entity.mesh);
        entity.mesh = undefined;
      }
      removeEntity(entity.id);
    }
  });
}
