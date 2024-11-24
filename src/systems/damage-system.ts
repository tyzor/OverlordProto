import { Entity, getAllEntities } from "../entities/entity";

/**
 * Apply any damage effects
 * Mark any negative health entities for removal
 */
export function damageSystem() {
  let entities = getAllEntities();

  entities.forEach((entity) => {
    if (entity.health !== undefined && entity.health <= 0) {
      entity.deadComponent = true;
    }
  });
}
