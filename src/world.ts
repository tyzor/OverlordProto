import { Vector3 } from "@babylonjs/core";

export const WORLD_SIZE = 30;
export const WORLD_BASES = [
  { corePosition: new Vector3(0, 0, -WORLD_SIZE / 2) },
  { corePosition: new Vector3(-WORLD_SIZE / 2, 0, 0) },
  { corePosition: new Vector3(0, 0, WORLD_SIZE / 2) },
  { corePosition: new Vector3(WORLD_SIZE / 2, 0, 0) },
];
export const BASE_ROWS = [3, 5, 7];
