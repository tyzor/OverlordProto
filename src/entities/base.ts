import {
  Color3,
  Mesh,
  Scene,
  StandardMaterial,
  Vector3,
  VertexData,
} from "@babylonjs/core";
import RAPIER from "@dimforge/rapier2d-compat";
import { PhysicsSystem } from "../systems/physics";
import { BASE_ROWS, WORLD_BASES } from "../world";
import { createEntity } from "./entity";

// Create block for a base
const BLOCK_QUADS = 4;
const BLOCK_THICKNESS = 1;
const BLOCK_GAP_SIZE = 0.3;
const ROW_START_DISTANCE = 2;
const ROW_GAP_SIZE = 0.2;

export function createBase(
  scene: Scene,
  physics: PhysicsSystem,
  playerId: number,
  baseIndex: number
) {
  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < BASE_ROWS[r]; i++) {
      createBaseBlock(scene, physics, playerId, baseIndex, r, i);
    }
  }
}

export function createBaseBlock(
  scene: Scene,
  physics: PhysicsSystem,
  playerId: number,
  baseIndex: number,
  row: number,
  rowIndex: number
) {
  let obj = createEntity();

  let corePos = WORLD_BASES[baseIndex].corePosition;

  let numInRow = BASE_ROWS[row];

  let innerRadius =
    ROW_START_DISTANCE + BLOCK_THICKNESS * row + row * ROW_GAP_SIZE;
  let rowInnerL = Math.PI * innerRadius;
  let blockInnerL = (rowInnerL - (numInRow - 1) * BLOCK_GAP_SIZE) / numInRow;
  let blockInnerAngleRad = blockInnerL / innerRadius;

  let outerRadius = innerRadius + BLOCK_THICKNESS;
  let rowOuterL = Math.PI * outerRadius;
  let blockOuterL = (rowOuterL - (numInRow - 1) * BLOCK_GAP_SIZE) / numInRow;
  let blockOuterAngleRad = blockOuterL / outerRadius;

  let vertices: number[] = [];
  let indices: number[] = [];
  let normals: number[] = [];

  let baseStartAngle = Math.PI - (Math.PI / 2) * baseIndex;
  let gapInnerAngleRad = BLOCK_GAP_SIZE / innerRadius;
  let gapOuterAngleRad = BLOCK_GAP_SIZE / outerRadius;
  let innerStartAngleRad =
    baseStartAngle - rowIndex * (blockInnerAngleRad + gapInnerAngleRad);
  let outerStartAngleRad =
    baseStartAngle - rowIndex * (blockOuterAngleRad + gapOuterAngleRad);

  let quadInnerAngleRad = blockInnerAngleRad / BLOCK_QUADS;
  let quadOuterAngleRad = blockOuterAngleRad / BLOCK_QUADS;

  for (let i = 0; i < BLOCK_QUADS; i++) {
    // create new face
    // use polar coordinate formula
    // x = r*cos(t) y = r*sin(t)
    let innerTheta1 = innerStartAngleRad - i * quadInnerAngleRad;
    let innerTheta2 = innerTheta1 - quadInnerAngleRad;

    let outerTheta1 = outerStartAngleRad - i * quadOuterAngleRad;
    let outerTheta2 = outerTheta1 - quadOuterAngleRad;

    let face = [];
    if (i == 0) {
      face.push(
        new Vector3(
          innerRadius * Math.cos(innerTheta1),
          0,
          innerRadius * Math.sin(innerTheta1)
        ).add(corePos),
        new Vector3(
          outerRadius * Math.cos(outerTheta1),
          0,
          outerRadius * Math.sin(outerTheta1)
        ).add(corePos)
      );
    }

    face.push(
      new Vector3(
        innerRadius * Math.cos(innerTheta2),
        0,
        innerRadius * Math.sin(innerTheta2)
      ).add(corePos),
      new Vector3(
        outerRadius * Math.cos(outerTheta2),
        0,
        outerRadius * Math.sin(outerTheta2)
      ).add(corePos)
    );

    face.forEach((f) => {
      vertices.push(f.x, f.y, f.z);
      normals.push(0, 1, 0);
    });

    let n = vertices.length / 3 - 1;
    indices.push(n - 1, n - 2, n - 3, n - 1, n, n - 2);
  }

  let vData = new VertexData();
  vData.positions = vertices;
  vData.normals = normals;
  vData.indices = indices;

  let mesh = new Mesh("baseBlock", scene);
  vData.applyToMesh(mesh);
  obj.mesh = mesh;

  // TODO -- create material assets with lookup
  let mat = new StandardMaterial("blockMat", scene);
  mat.diffuseColor = Color3.Red();
  mesh.material = mat;

  // Fixed rigidbody
  let rigidBody = physics.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());

  // Build collider data
  let points = vertices.filter((value, index) => {
    let m = index % 3;
    return m === 0 || m === 2;
  });
  let colliderDesc = RAPIER.ColliderDesc.convexHull(Float32Array.from(points));
  if (colliderDesc === null) throw Error("Could not create convex hull!");
  let blockCollider = physics.world.createCollider(
    colliderDesc.setFriction(0).setRestitution(1.0)
  );

  obj.rigidBody = rigidBody;
  obj.colliders = [blockCollider];
  physics.registerRigidBody(rigidBody, obj);
  physics.registerCollider(blockCollider, obj);

  obj.factionId = playerId;
  obj.health = 1;
  obj.maxHealth = 1;
}
